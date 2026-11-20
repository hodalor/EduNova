const crypto = require('crypto');
const QRCode = require('qrcode');

const { models } = require('../../config/database');
const {
  ensureUniversitySettings,
  loadInstitution,
  saveSettings,
  todayInSchool,
  studentRows,
} = require('./university.service');

const parseCsv = (text) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((item) => item.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(',').map((item) => item.trim());
    const row = { line: index + 2 };
    headers.forEach((header, cellIndex) => {
      row[header] = cells[cellIndex] || '';
    });
    return row;
  });
};

const registeredStudents = (settings, offering) => {
  const registeredIds = new Set();
  (settings.tertiary.registrations || []).forEach((registration) => {
    const courses = registration.courses || [];
    const matches = courses.some(
      (course) => course.id === offering.id || String(course.code || '').toUpperCase() === String(offering.code).toUpperCase()
    );
    if (matches && (!offering.period_id || registration.period_id === offering.period_id)) {
      registeredIds.add(registration.student_id);
    }
  });
  return (settings.admissions.student_profiles || [])
    .filter((profile) => registeredIds.has(profile.student_id))
    .map((profile) => ({
      student_id: profile.student_id,
      student_number: profile.student_number || '',
      name: profile.full_name || 'Student',
    }));
};

const attachStudentNumbers = async (rows) => {
  if (!models.Student || !rows.length) return rows;
  const students = await models.Student.findAll({
    where: { id: rows.map((row) => row.student_id).filter(Boolean) },
    attributes: ['id', 'student_number', 'photo_url', 'user_id'],
    include: [{ model: models.User, as: 'user', required: false, attributes: ['first_name', 'last_name', 'profile_photo'] }],
  }).catch(() => []);
  const byId = new Map(students.map((student) => [student.id, student]));
  return rows.map((row) => {
    const student = byId.get(row.student_id);
    return {
      ...row,
      student_number: student?.student_number || row.student_number,
      name:
        `${student?.user?.first_name || ''} ${student?.user?.last_name || ''}`.trim() || row.name,
      photo: student?.user?.profile_photo || student?.photo_url || null,
    };
  });
};

const resultTemplate = async ({ offeringId }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const offering = settings.academics.offerings.find((item) => item.id === offeringId);
  if (!offering) {
    throw Object.assign(new Error('Choose a course first.'), { statusCode: 400 });
  }
  const roster = await attachStudentNumbers(registeredStudents(settings, offering));
  const lines = ['student_number,student_name,score'];
  roster.forEach((student) => {
    lines.push(`${student.student_number},${student.name.replace(/,/g, ' ')},`);
  });
  return { filename: `${offering.code}-results.csv`, csv: `${lines.join('\n')}\n` };
};

const previewResults = async ({ payload }) => {
  if (!String(payload.assessment_name || '').trim()) {
    throw Object.assign(new Error('Name this result, for example test 1 or end of semester.'), {
      statusCode: 400,
    });
  }
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const offering = settings.academics.offerings.find((item) => item.id === payload.offering_id);
  if (!offering) {
    throw Object.assign(new Error('Choose a course first.'), { statusCode: 400 });
  }
  const roster = await attachStudentNumbers(registeredStudents(settings, offering));
  const byNumber = new Map(roster.map((student) => [String(student.student_number).toUpperCase(), student]));
  const seen = new Set();
  const rows = parseCsv(payload.csv).map((row) => {
    const studentNumber = String(row.student_number || row.id || '').toUpperCase();
    const score = row.score === '' ? null : Number(row.score);
    const reasons = [];
    if (!studentNumber) reasons.push('Student ID is missing.');
    if (studentNumber && seen.has(studentNumber)) reasons.push('This student ID is repeated.');
    if (studentNumber) seen.add(studentNumber);
    const student = byNumber.get(studentNumber);
    if (studentNumber && !student) reasons.push('This student is not registered for this course this semester.');
    if (score === null || Number.isNaN(score) || score < 0 || score > 100) reasons.push('Score must be a number from 0 to 100.');
    return {
      student_number: studentNumber,
      student_name: row.student_name || student?.name || '',
      student_id: student?.student_id || null,
      score,
      ok: reasons.length === 0,
      reason: reasons.join(' '),
    };
  });
  return {
    offering,
    assessment_name: String(payload.assessment_name || '').trim(),
    kind: payload.kind,
    ready: rows.length > 0 && rows.every((row) => row.ok),
    rows,
  };
};

const commitResults = async ({ user, payload }) => {
  const preview = await previewResults({ payload });
  if (!preview.ready) {
    return preview;
  }
  const university = require('./university.service');
  const batchId = crypto.randomUUID();
  for (const row of preview.rows) {
    await university.recordResult({
      user,
      payload: {
        student_id: row.student_id,
        offering_id: preview.offering.id,
        course_code: preview.offering.code,
        course_name: preview.offering.name,
        period_id: preview.offering.period_id,
        period_name: payload.period_name || 'Semester',
        program_id: preview.offering.program_id,
        kind: payload.kind,
        score: row.score,
        max_score: 100,
        assessment_name: preview.assessment_name,
        source: 'spreadsheet',
        batch_id: batchId,
      },
    });
  }
  return { ...preview, saved: true, batch_id: batchId };
};

const listPendingResults = async () => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const pending = settings.academics.assessment_records.filter(
    (item) => ['midsem', 'final_exam'].includes(item.kind) && item.approved === false
  );
  const batches = new Map();
  pending.forEach((item) => {
    const key = item.batch_id || item.id;
    if (!batches.has(key)) {
      batches.set(key, {
        batch_id: key,
        course_code: item.course_code,
        course_name: item.course_name,
        assessment_name: item.assessment_name,
        kind: item.kind,
        uploaded_at: item.uploaded_at,
        count: 0,
      });
    }
    batches.get(key).count += 1;
  });
  return Array.from(batches.values());
};

const approveResults = async ({ batchId }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  let count = 0;
  settings.academics.assessment_records.forEach((item) => {
    if ((item.batch_id || item.id) === batchId && item.approved === false) {
      item.approved = true;
      item.approved_at = new Date().toISOString();
      count += 1;
    }
  });
  if (!count) {
    throw Object.assign(new Error('That result batch is not waiting for approval.'), { statusCode: 404 });
  }
  await saveSettings(institution, settings);
  return { batch_id: batchId, approved: count };
};

const saveWindow = async ({ payload }) => {
  const opens = String(payload.opens_on || '');
  const closes = String(payload.closes_on || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opens) || !/^\d{4}-\d{2}-\d{2}$/.test(closes) || closes < opens) {
    throw Object.assign(new Error('Set an opening date and a closing date after it.'), { statusCode: 400 });
  }
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const window = {
    id: payload.id || crypto.randomUUID(),
    name: String(payload.name || 'Exam window').trim(),
    year: Number(payload.year || opens.slice(0, 4)),
    intake_id: payload.intake_id || null,
    period_id: payload.period_id || null,
    opens_on: opens,
    closes_on: closes,
    extended_until: payload.extended_until || null,
  };
  const index = settings.academics.exam_windows.findIndex((item) => item.id === window.id);
  if (index >= 0) settings.academics.exam_windows[index] = window;
  else settings.academics.exam_windows.unshift(window);
  await saveSettings(institution, settings);
  return window;
};

const extendWindow = async ({ windowId, extendedUntil }) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(extendedUntil || ''))) {
    throw Object.assign(new Error('Choose the new closing date.'), { statusCode: 400 });
  }
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const window = settings.academics.exam_windows.find((item) => item.id === windowId);
  if (!window) throw Object.assign(new Error('Exam window not found.'), { statusCode: 404 });
  window.extended_until = extendedUntil;
  await saveSettings(institution, settings);
  return window;
};

const examBoard = async ({ user } = {}) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const today = todayInSchool();
  let sittings = settings.academics.exam_sittings;
  let lectures = settings.academics.lecture_slots;
  if (user?.role === 'student' && models.Student) {
    const own = await models.Student.findOne({ where: { user_id: user.id } });
    const profile = settings.admissions.student_profiles.find((item) => item.student_id === own?.id) || {};
    const registered = new Set();
    (settings.tertiary.registrations || [])
      .filter((item) => item.student_id === own?.id)
      .forEach((item) => (item.courses || []).forEach((course) => registered.add(course.id)));
    sittings = sittings.filter((item) => {
      if (registered.size && !registered.has(item.offering_id)) return false;
      if (item.intake_id && profile.intake_id && item.intake_id !== profile.intake_id) return false;
      if (item.year && profile.intake_year && Number(item.year) !== Number(profile.intake_year)) return false;
      return true;
    });
    lectures = lectures.filter((item) => {
      if (item.intake_id && profile.intake_id && item.intake_id !== profile.intake_id) return false;
      if (item.year && profile.intake_year && Number(item.year) !== Number(profile.intake_year)) return false;
      return true;
    });
  }
  const courses = settings.academics.offerings.map((offering) => {
    const finals = settings.academics.assessment_records.filter(
      (item) => item.offering_id === offering.id && item.kind === 'final_exam'
    );
    return {
      offering_id: offering.id,
      code: offering.code,
      name: offering.name,
      period_id: offering.period_id,
      lecturer_id: offering.lecturer_id || null,
      lecturer_name: offering.lecturer_name || 'Unassigned',
      uploaded: finals.length > 0,
      approved: finals.length > 0 && finals.every((item) => item.approved !== false),
    };
  });
  return {
    today,
    windows: settings.academics.exam_windows,
    courses: user?.role === 'student' ? [] : courses,
    sittings,
    lectures,
    students: user?.role === 'student' ? [] : studentRows(settings),
    intakes: settings.tertiary.intakes || [],
    periods: settings.academics.periods || [],
  };
};

const saveSitting = async ({ payload, collection }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const key = collection === 'lecture' ? 'lecture_slots' : 'exam_sittings';
  const slot = {
    id: payload.id || crypto.randomUUID(),
    offering_id: payload.offering_id,
    course_code: payload.course_code || '',
    course_name: payload.course_name || '',
    year: Number(payload.year),
    intake_id: payload.intake_id || null,
    day: payload.day || '',
    date: payload.date || '',
    start_time: payload.start_time || '',
    end_time: payload.end_time || '',
    venue: payload.venue || '',
  };
  if (!slot.offering_id || !slot.year || !slot.start_time || !slot.venue) {
    throw Object.assign(new Error('Choose the course, year, time, and venue.'), { statusCode: 400 });
  }
  settings.academics[key].unshift(slot);
  await saveSettings(institution, settings);
  return slot;
};

const schoolLetterhead = (institution, settings) => ({
  name: settings.branding?.letterhead_name || institution.name,
  tagline: settings.branding?.tagline || '',
  logo_url: settings.branding?.logo_url || '',
  address: [settings.branding?.address_line_1, settings.branding?.address_line_2].filter(Boolean).join(', '),
  phone: settings.branding?.phone_primary || '',
  email: settings.branding?.email || '',
  currency: settings.finance?.default_local_currency || 'ZMW',
});

const studentBundle = async ({ user, studentId }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  let resolvedId = studentId;
  if (user?.role === 'student') {
    const own = await models.Student.findOne({ where: { user_id: user.id } });
    resolvedId = own?.id;
  }
  if (!resolvedId) throw Object.assign(new Error('Choose a student.'), { statusCode: 400 });
  const profile = settings.admissions.student_profiles.find((item) => item.student_id === resolvedId) || {};
  const [student] = await attachStudentNumbers([{ student_id: resolvedId, name: profile.full_name, student_number: '' }]);
  const invoices = models.StudentInvoice
    ? await models.StudentInvoice.findAll({ where: { student_id: resolvedId } }).catch(() => [])
    : [];
  const payments = models.Payment
    ? await models.Payment.findAll({ where: { student_id: resolvedId } }).catch(() => [])
    : [];
  const balance = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const registrations = (settings.tertiary.registrations || []).filter((item) => item.student_id === resolvedId);
  const latest = registrations[registrations.length - 1];
  const courses = (latest?.courses || []).map((course) => {
    const offering = settings.academics.offerings.find((item) => item.id === course.id) || course;
    const sitting = settings.academics.exam_sittings.find((item) => {
      const sameCourse = item.offering_id === offering.id || item.course_code === offering.code;
      if (!sameCourse) return false;
      if (item.intake_id && profile.intake_id && item.intake_id !== profile.intake_id) return false;
      if (item.year && profile.intake_year && Number(item.year) !== Number(profile.intake_year)) return false;
      return true;
    });
    return {
      code: offering.code || course.code,
      name: offering.name || course.name,
      date: sitting?.date || '',
      time: [sitting?.start_time, sitting?.end_time].filter(Boolean).join(' - '),
      venue: sitting?.venue || '',
    };
  });
  return { institution, settings, profile, student, invoices, payments, balance, courses, latest };
};

const examDocket = async ({ user, studentId }) => {
  const bundle = await studentBundle({ user, studentId });
  if (bundle.balance > 0) {
    throw Object.assign(
      new Error('The exam docket is available after the semester fees are cleared.'),
      { statusCode: 400 }
    );
  }
  const qr = await QRCode.toDataURL(
    `${bundle.student.student_number}|${bundle.latest?.period_id || ''}|${todayInSchool()}`
  );
  return {
    school: schoolLetterhead(bundle.institution, bundle.settings),
    student: {
      name: bundle.student.name,
      number: bundle.student.student_number,
      photo: bundle.student.photo,
      nrc: bundle.profile.id_number || '',
      mode: 'Fulltime',
      program: bundle.profile.program_name || '',
    },
    term: bundle.latest?.period_name || bundle.latest?.semester || 'Current semester',
    printed_on: todayInSchool(),
    balance: 0,
    courses: bundle.courses,
    qr,
  };
};

const confirmationSlip = async ({ user, studentId }) => {
  const bundle = await studentBundle({ user, studentId });
  const events = [
    ...bundle.invoices.map((invoice) => ({
      reference: invoice.invoice_number,
      date: String(invoice.created_at || invoice.due_date || '').slice(0, 10),
      type: 'INVOICE',
      description: 'TUITION FEE',
      debit: Number(invoice.total_amount || 0),
      credit: 0,
    })),
    ...bundle.payments.map((payment) => ({
      reference: payment.receipt_number || payment.transaction_ref || payment.id,
      date: String(payment.paid_at || payment.created_at || '').slice(0, 10),
      type: 'PAYMENT',
      description: 'FEE PAYMENT',
      debit: 0,
      credit: Number(payment.amount || 0),
    })),
  ].sort((left, right) => String(left.date).localeCompare(String(right.date)));
  let running = 0;
  const lines = events.map((event) => {
    running = Math.round((running + event.debit - event.credit) * 100) / 100;
    return { ...event, balance: running };
  });
  return {
    school: schoolLetterhead(bundle.institution, bundle.settings),
    student: bundle.student,
    mode: 'Fulltime',
    term: bundle.latest?.period_name || bundle.latest?.semester || 'Current semester',
    printed_on: todayInSchool(),
    lines,
    current_balance: bundle.balance,
    courses: bundle.courses,
  };
};

const lectureTimetableForStudent = async ({ user }) => {
  const board = await examBoard({ user });
  return board.lectures;
};

const removeSitting = async ({ id, collection }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const key = collection === 'lecture' ? 'lecture_slots' : 'exam_sittings';
  settings.academics[key] = (settings.academics[key] || []).filter((item) => item.id !== id);
  await saveSettings(institution, settings);
  return { id };
};

module.exports = {
  resultTemplate,
  previewResults,
  commitResults,
  listPendingResults,
  approveResults,
  saveWindow,
  extendWindow,
  examBoard,
  saveSitting,
  removeSitting,
  examDocket,
  confirmationSlip,
  lectureTimetableForStudent,
};
