const crypto = require('crypto');

const { models } = require('../../config/database');
const { sendEmail, sendSMS } = require('../communication/communication.channels');

const RESULT_KINDS = ['quiz', 'test', 'coursework', 'pre_mock', 'mock', 'midsem', 'final_exam'];
const WEIGHTED_KINDS = ['quiz', 'test', 'coursework', 'mock', 'midsem', 'final_exam'];
const DEFAULT_WEIGHTS = {
  quiz: 10,
  test: 15,
  coursework: 15,
  pre_mock: 0,
  mock: 0,
  midsem: 20,
  final_exam: 40,
};

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const todayInSchool = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lusaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

const ensureUniversitySettings = (settings) => {
  const next = clone(settings);
  next.tertiary = next.tertiary || {};
  next.tertiary.intakes = Array.isArray(next.tertiary.intakes) ? next.tertiary.intakes : [];
  next.tertiary.programs = next.tertiary.programs || [];
  next.tertiary.faculties = next.tertiary.faculties || [];
  next.tertiary.departments = next.tertiary.departments || [];
  next.admissions = next.admissions || {};
  next.admissions.student_profiles = next.admissions.student_profiles || [];
  next.academics = next.academics || {};
  next.academics.groups = next.academics.groups || [];
  next.academics.periods = next.academics.periods || [];
  next.academics.offerings = next.academics.offerings || [];
  next.academics.assessment_records = next.academics.assessment_records || [];
  next.academics.assessment_weights = {
    ...DEFAULT_WEIGHTS,
    ...(next.academics.assessment_weights || {}),
    pre_mock: 0,
  };
  next.academics.exam_windows = next.academics.exam_windows || [];
  next.academics.exam_sittings = next.academics.exam_sittings || [];
  next.academics.lecture_slots = next.academics.lecture_slots || [];
  next.communication = next.communication || {};
  next.communication.notices = next.communication.notices || [];
  next.communication.blasts = next.communication.blasts || [];
  return next;
};

const loadInstitution = async () => {
  if (!models.Institution) {
    throw Object.assign(new Error('The school profile is not available.'), { statusCode: 503 });
  }
  const institution = await models.Institution.findOne();
  if (!institution) {
    throw Object.assign(new Error('School profile is not set up yet.'), { statusCode: 404 });
  }
  return institution;
};

const saveSettings = async (institution, settings) => {
  institution.set('settings', settings);
  institution.changed('settings', true);
  await institution.save();
};

const assertIntakeSchedule = (intakes) => {
  const sorted = [...intakes].sort((left, right) => String(left.start_date).localeCompare(String(right.start_date)));
  sorted.forEach((intake, index) => {
    if (intake.enrollment_deadline < intake.start_date) {
      throw Object.assign(
        new Error(`${intake.name} closes enrolment before it starts. Move the deadline to the start date or later.`),
        { statusCode: 400 }
      );
    }
    const next = sorted[index + 1];
    if (next && intake.enrollment_deadline > next.start_date) {
      throw Object.assign(
        new Error(
          `Enrolment for ${intake.name} must end on or before ${next.name} starts (${next.start_date}).`
        ),
        { statusCode: 400 }
      );
    }
  });
};

const listIntakes = async () => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  return settings.tertiary.intakes
    .slice()
    .sort((left, right) => String(right.start_date).localeCompare(String(left.start_date)));
};

const createIntake = async ({ payload }) => {
  const name = String(payload?.name || '').trim();
  const startDate = String(payload?.start_date || '').trim();
  const deadline = String(payload?.enrollment_deadline || '').trim();
  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    throw Object.assign(new Error('Enter the intake name, start date, and enrolment deadline.'), {
      statusCode: 400,
    });
  }
  if (startDate < todayInSchool()) {
    throw Object.assign(new Error('The intake start date cannot be in the past.'), { statusCode: 400 });
  }

  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const intake = {
    id: crypto.randomUUID(),
    name,
    year: Number(startDate.slice(0, 4)),
    start_date: startDate,
    enrollment_deadline: deadline,
    created_at: new Date().toISOString(),
  };
  const nextIntakes = [...settings.tertiary.intakes, intake];
  assertIntakeSchedule(nextIntakes);
  settings.tertiary.intakes = nextIntakes;
  await saveSettings(institution, settings);
  return intake;
};

const deleteIntake = async ({ intakeId }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const used = settings.admissions.student_profiles.some((profile) => profile.intake_id === intakeId);
  if (used) {
    throw Object.assign(new Error('Students are already registered on this intake.'), { statusCode: 400 });
  }
  settings.tertiary.intakes = settings.tertiary.intakes.filter((item) => item.id !== intakeId);
  await saveSettings(institution, settings);
  return { id: intakeId };
};

const studentRows = (settings) =>
  (settings.admissions.student_profiles || []).map((profile) => {
    const intake = settings.tertiary.intakes.find((item) => item.id === profile.intake_id);
    return {
      student_id: profile.student_id,
      name: profile.full_name || 'Student',
      program_id: profile.tertiary?.program_id || profile.program_id || null,
      program_name: profile.program_name || profile.tertiary?.program_name || null,
      intake_id: profile.intake_id || null,
      intake_name: intake?.name || profile.intake_name || null,
      intake_year: intake?.year || profile.intake_year || null,
    };
  });

const intakeReport = async ({ intakeId, years }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const yearSet = new Set(
    String(years || '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0)
  );
  const selectedIntake = intakeId && intakeId !== 'all' ? String(intakeId) : '';
  const rows = studentRows(settings).filter((row) => {
    const matchesIntake = !selectedIntake || row.intake_id === selectedIntake;
    const matchesYear = !yearSet.size || yearSet.has(Number(row.intake_year));
    return matchesIntake && matchesYear;
  });

  let invoices = [];
  if (models.StudentInvoice) {
    invoices = await models.StudentInvoice.findAll({
      attributes: ['student_id', 'total_amount', 'paid_amount', 'balance', 'status'],
    }).catch(() => []);
  }
  const totals = new Map();
  invoices.forEach((invoice) => {
    const current = totals.get(invoice.student_id) || { billed: 0, paid: 0, balance: 0 };
    current.billed += Number(invoice.total_amount || 0);
    current.paid += Number(invoice.paid_amount || 0);
    current.balance += Number(invoice.balance || 0);
    totals.set(invoice.student_id, current);
  });

  const registered = rows.length;
  const paid = rows.filter((row) => {
    const money = totals.get(row.student_id);
    return Boolean(money && money.billed > 0 && money.balance <= 0);
  }).length;
  const debtors = registered - paid;
  const percent = (count) => (registered ? Math.round((count / registered) * 1000) / 10 : 0);

  return {
    intakes: settings.tertiary.intakes,
    years: Array.from(new Set(settings.tertiary.intakes.map((item) => item.year))).sort((a, b) => b - a),
    registered,
    paid,
    debtors,
    paid_percent: percent(paid),
    debtor_percent: percent(debtors),
  };
};

const visibleNotices = ({ settings, role, programId }) =>
  settings.communication.notices
    .slice()
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)))
    .filter((notice) => {
      if (role !== 'student') {
        return true;
      }
      const targets = Array.isArray(notice.program_ids) ? notice.program_ids : [];
      return !targets.length || targets.includes(programId);
    });

const studentProgramId = async ({ settings, userId }) => {
  if (!models.Student || !userId) {
    return null;
  }
  const student = await models.Student.findOne({ where: { user_id: userId } });
  if (!student) {
    return null;
  }
  const profile = settings.admissions.student_profiles.find((item) => item.student_id === student.id);
  return profile?.tertiary?.program_id || profile?.program_id || null;
};

const listNotices = async ({ user }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const programId =
    user?.role === 'student' ? await studentProgramId({ settings, userId: user.id }) : null;
  return {
    programs: settings.tertiary.programs.map((program) => ({ id: program.id, name: program.name })),
    notices: visibleNotices({ settings, role: user?.role, programId }),
  };
};

const createNotice = async ({ user, payload }) => {
  const title = String(payload?.title || '').trim();
  const body = String(payload?.body || '').trim();
  if (!title || !body) {
    throw Object.assign(new Error('Write a title and the notice.'), { statusCode: 400 });
  }
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const programIds = Array.isArray(payload?.program_ids)
    ? payload.program_ids.map((item) => String(item)).filter(Boolean)
    : [];
  const notice = {
    id: crypto.randomUUID(),
    title,
    body,
    program_ids: programIds,
    created_at: new Date().toISOString(),
    created_by: user?.id || null,
  };
  settings.communication.notices.unshift(notice);
  await saveSettings(institution, settings);
  return notice;
};

const collectBlastRecipients = async ({ settings, payload }) => {
  const emails = new Set();
  const phones = new Set();
  const pasted = `${payload?.contacts || ''}\n${payload?.csv || ''}`;
  pasted.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)?.forEach((email) => emails.add(email.toLowerCase()));
  pasted.match(/\+?\d[\d\s()-]{8,}\d/g)?.forEach((phone) => phones.add(phone.replace(/[^\d+]/g, '')));

  const programIds = Array.isArray(payload?.program_ids) ? payload.program_ids.map(String) : [];
  if (programIds.length && models.Student && models.User) {
    const matching = settings.admissions.student_profiles.filter((profile) =>
      programIds.includes(profile.tertiary?.program_id || profile.program_id)
    );
    const studentIds = matching.map((profile) => profile.student_id).filter(Boolean);
    if (studentIds.length) {
      const students = await models.Student.findAll({
        where: { id: studentIds },
        include: [{ model: models.User, as: 'user', required: false }],
      }).catch(() => []);
      students.forEach((student) => {
        if (student.user?.email) emails.add(String(student.user.email).toLowerCase());
        if (student.user?.phone) phones.add(String(student.user.phone));
      });
    }
  }

  return {
    emails: Array.from(emails).slice(0, 200),
    phones: Array.from(phones).slice(0, 200),
  };
};

const sendBlast = async ({ user, payload }) => {
  const subject = String(payload?.subject || '').trim();
  const body = String(payload?.body || '').trim();
  const channel = ['email', 'sms', 'both'].includes(payload?.channel) ? payload.channel : 'email';
  if (!subject || !body) {
    throw Object.assign(new Error('Write the subject and the message.'), { statusCode: 400 });
  }
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const recipients = await collectBlastRecipients({ settings, payload });
  if (!recipients.emails.length && !recipients.phones.length) {
    throw Object.assign(
      new Error('Add email addresses, phone numbers, a CSV, or at least one programme.'),
      { statusCode: 400 }
    );
  }

  let delivered = 0;
  let attempted = 0;
  if (channel === 'email' || channel === 'both') {
    for (const email of recipients.emails) {
      attempted += 1;
      const result = await sendEmail(email, subject, `<p>${body.replace(/\n/g, '<br/>')}</p>`).catch(() => ({
        delivered: false,
      }));
      if (result?.delivered) delivered += 1;
    }
  }
  if (channel === 'sms' || channel === 'both') {
    for (const phone of recipients.phones) {
      attempted += 1;
      const result = await sendSMS(phone, `${subject}\n${body}`.slice(0, 320)).catch(() => ({
        delivered: false,
      }));
      if (result?.delivered) delivered += 1;
    }
  }

  const blast = {
    id: crypto.randomUUID(),
    subject,
    body,
    channel,
    attempted,
    delivered,
    created_at: new Date().toISOString(),
    created_by: user?.id || null,
  };
  settings.communication.blasts.unshift(blast);
  await saveSettings(institution, settings);
  return blast;
};

const listBlasts = async () => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  return settings.communication.blasts.slice(0, 30);
};

const gradeRules = (settings) => {
  const configured = settings?.academics?.grade_scales?.TR?.rules;
  if (Array.isArray(configured) && configured.length) {
    return configured;
  }
  return [
    { min_score: 90, max_score: 100, grade: 'A+', gp: 4, remark: 'Excellent' },
    { min_score: 85, max_score: 89, grade: 'A', gp: 4, remark: 'Excellent' },
    { min_score: 80, max_score: 84, grade: 'A-', gp: 3.7, remark: 'Excellent' },
    { min_score: 76, max_score: 79, grade: 'B+', gp: 3.3, remark: 'Very Good' },
    { min_score: 72, max_score: 75, grade: 'B', gp: 3, remark: 'Very Good' },
    { min_score: 68, max_score: 71, grade: 'B-', gp: 2.7, remark: 'Good' },
    { min_score: 60, max_score: 67, grade: 'C', gp: 2, remark: 'Credit' },
    { min_score: 50, max_score: 59, grade: 'D', gp: 1, remark: 'Pass' },
    { min_score: 0, max_score: 49, grade: 'F', gp: 0, remark: 'Fail' },
  ];
};

const gradeForScore = (score, rules) => {
  const value = Number(score || 0);
  const match = rules.find((rule) => value >= Number(rule.min_score) && value <= Number(rule.max_score));
  return {
    grade: match?.grade || 'F',
    gp: match?.gp === null || match?.gp === undefined ? 0 : Number(match.gp),
    remark: match?.remark || 'Fail',
  };
};

const buildResults = (settings, records) => {
  const weights = settings.academics.assessment_weights;
  const rules = gradeRules(settings);
  const byCourse = new Map();
  records.forEach((record) => {
    const key = `${record.student_id}:${record.course_code}:${record.period_id || ''}`;
    if (!byCourse.has(key)) byCourse.set(key, []);
    byCourse.get(key).push(record);
  });

  const names = new Map(studentRows(settings).map((row) => [row.student_id, row.name]));
  const courses = [];
  byCourse.forEach((items) => {
    const ordered = items
      .slice()
      .sort((left, right) => String(left.uploaded_at).localeCompare(String(right.uploaded_at)));
    const namedByKind = {};
    const resitByKind = {};
    ordered.forEach((item) => {
      if (item.is_resit) {
        resitByKind[item.kind] = item;
        return;
      }
      if (!namedByKind[item.kind]) namedByKind[item.kind] = new Map();
      namedByKind[item.kind].set(item.assessment_name || item.id, item);
    });
    let score = 0;
    const components = {};
    WEIGHTED_KINDS.forEach((kind) => {
      const weight = Number(weights[kind] || 0);
      const pool = resitByKind[kind]
        ? [resitByKind[kind]]
        : Array.from(namedByKind[kind]?.values() || []);
      if (!pool.length || !weight) return;
      const percent =
        pool.reduce((sum, item) => {
          const maxScore = Number(item.max_score || 100) || 100;
          return sum + Number(item.score || 0) / maxScore;
        }, 0) / pool.length;
      score += percent * weight;
      components[kind] = {
        score: Math.round(percent * 1000) / 10,
        count: pool.length,
        names: pool.map((item) => item.assessment_name || kind),
      };
    });
    score = Math.round(score * 10) / 10;
    const graded = gradeForScore(score, rules);
    const sample = ordered[ordered.length - 1];
    const awaitingFinal = Number(weights.final_exam || 0) > 0 && !components.final_exam;
    courses.push({
      student_id: sample.student_id,
      student_name: names.get(sample.student_id) || 'Student',
      course_code: sample.course_code,
      course_name: sample.course_name,
      period_id: sample.period_id || null,
      period_name: sample.period_name || 'Semester',
      program_id: sample.program_id || null,
      score,
      grade: awaitingFinal ? 'Pending' : graded.grade,
      gp: awaitingFinal ? null : graded.gp,
      remark: awaitingFinal ? 'Awaiting published final exam' : graded.remark,
      failed: awaitingFinal ? false : graded.grade === 'F' || Number(graded.gp) === 0,
      latest_upload: sample.uploaded_at,
      components,
    });
  });

  const semesters = new Map();
  courses.forEach((course) => {
    const key = `${course.student_id}:${course.period_id || course.period_name}`;
    if (!semesters.has(key)) {
      semesters.set(key, {
        student_id: course.student_id,
        period_id: course.period_id,
        period_name: course.period_name,
        courses: [],
      });
    }
    semesters.get(key).courses.push(course);
  });

  const summary = Array.from(semesters.values()).map((semester) => {
    const gradedCourses = semester.courses.filter((course) => course.gp !== null && course.gp !== undefined);
    const totalGp = gradedCourses.reduce((sum, course) => sum + Number(course.gp || 0), 0);
    const gpa = gradedCourses.length
      ? Math.round((totalGp / gradedCourses.length) * 100) / 100
      : 0;
    return {
      ...semester,
      total_gp: Math.round(totalGp * 100) / 100,
      gpa,
    };
  });

  const recentCutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const current = courses.filter((course) => new Date(course.latest_upload).getTime() >= recentCutoff);
  const rewrites = courses.filter((course) => course.failed);

  return { summary, current, rewrites };
};

const listResults = async ({ user }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  let records = settings.academics.assessment_records;
  let students = studentRows(settings);
  if (user?.role === 'student' && models.Student) {
    const student = await models.Student.findOne({ where: { user_id: user.id } });
    const studentId = student?.id || '';
    records = records.filter((item) => item.student_id === studentId && item.approved !== false);
    students = students.filter((item) => item.student_id === studentId);
  }
  const computed = buildResults(settings, records);
  const periods = new Map((settings.academics.periods || []).map((period) => [period.id, period]));
  return {
    weights: settings.academics.assessment_weights,
    students,
    courses: (settings.academics.offerings || []).map((offering) => ({
      id: offering.id,
      code: offering.code,
      name: offering.name,
      period_id: offering.period_id || null,
      period_name: periods.get(offering.period_id)?.name || 'Semester',
      program_id: offering.program_id || null,
      lecturer_id: offering.lecturer_id || null,
      lecturer_name: offering.lecturer_name || null,
      credit_hours: offering.credit_hours || offering.credits || 0,
    })),
    records,
    ...computed,
  };
};

const recordResult = async ({ user, payload }) => {
  const kind = String(payload?.kind || '');
  if (!RESULT_KINDS.includes(kind)) {
    throw Object.assign(new Error('Choose the assessment type.'), { statusCode: 400 });
  }
  if (user?.role === 'principal_lecturer') {
    throw Object.assign(new Error('A principal lecturer approves results. Lecturers upload them.'), {
      statusCode: 403,
    });
  }
  const examKinds = ['midsem', 'final_exam'];
  const studentId = String(payload?.student_id || '');
  const courseCode = String(payload?.course_code || '').trim();
  const courseName = String(payload?.course_name || '').trim();
  const score = Number(payload?.score);
  const maxScore = Number(payload?.max_score || 100);
  if (!studentId || !courseCode || !courseName || Number.isNaN(score) || score < 0 || score > maxScore) {
    throw Object.assign(new Error('Choose the student and course, then enter a score within the maximum.'), {
      statusCode: 400,
    });
  }

  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  if (user?.role === 'teacher' && payload?.offering_id) {
    const offering = (settings.academics.offerings || []).find((item) => item.id === payload.offering_id);
    if (offering?.lecturer_id && offering.lecturer_id !== user.id) {
      throw Object.assign(new Error('This course is assigned to another lecturer.'), { statusCode: 403 });
    }
  }
  if (examKinds.includes(kind) && user?.role === 'teacher') {
    const today = todayInSchool();
    const windowOpen = (settings.academics.exam_windows || []).some((item) => {
      const inDates = today >= item.opens_on && today <= (item.extended_until || item.closes_on);
      const periodOk = !item.period_id || !payload?.period_id || item.period_id === payload.period_id;
      return inDates && periodOk;
    });
    if (!windowOpen) {
      throw Object.assign(
        new Error('The exam window is closed. An admin has to extend the date before this result can be uploaded.'),
        { statusCode: 400 }
      );
    }
  }
  const record = {
    id: crypto.randomUUID(),
    student_id: studentId,
    course_code: courseCode,
    course_name: courseName,
    offering_id: payload?.offering_id || null,
    period_id: payload?.period_id || null,
    period_name: payload?.period_name || 'Semester',
    program_id: payload?.program_id || null,
    kind,
    score,
    max_score: maxScore,
    is_resit: Boolean(payload?.is_resit),
    source: payload?.source || 'manual',
    assessment_name: String(payload?.assessment_name || '').trim() || kind,
    approved: !['midsem', 'final_exam'].includes(kind),
    batch_id: payload?.batch_id || null,
    uploaded_at: new Date().toISOString(),
    uploaded_by: user?.id || null,
  };
  settings.academics.assessment_records.push(record);
  await saveSettings(institution, settings);
  return record;
};

const updateWeights = async ({ payload }) => {
  const institution = await loadInstitution();
  const settings = ensureUniversitySettings(institution.settings);
  const next = { ...settings.academics.assessment_weights, pre_mock: 0 };
  WEIGHTED_KINDS.forEach((kind) => {
    const value = Number(payload?.[kind]);
    if (!Number.isNaN(value) && value >= 0 && value <= 100) {
      next[kind] = value;
    }
  });
  const allocated = WEIGHTED_KINDS.reduce((sum, kind) => sum + Number(next[kind] || 0), 0);
  if (allocated > 100) {
    throw Object.assign(new Error('The assessment percentages cannot add up to more than 100.'), {
      statusCode: 400,
    });
  }
  settings.academics.assessment_weights = next;
  await saveSettings(institution, settings);
  return next;
};

module.exports = {
  listIntakes,
  createIntake,
  deleteIntake,
  intakeReport,
  listNotices,
  createNotice,
  listBlasts,
  sendBlast,
  listResults,
  recordResult,
  updateWeights,
  ensureUniversitySettings,
  loadInstitution,
  saveSettings,
  todayInSchool,
  studentRows,
};
