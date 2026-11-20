const crypto = require('crypto');

const { models } = require('../../config/database');
const logger = require('../../config/logger');
const { sendEmail } = require('../communication/communication.channels');
const { emitAdmissionEvent } = require('../notifications/socket.service');

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

const ensureAdmissionSettings = (settings) => {
  const next = clone(settings);
  next.admissions = next.admissions || {};
  next.admissions.applications = Array.isArray(next.admissions.applications)
    ? next.admissions.applications
    : [];
  next.tertiary = next.tertiary || {};
  next.tertiary.programs = next.tertiary.programs || [];
  next.tertiary.intakes = next.tertiary.intakes || [];
  next.tertiary.departments = next.tertiary.departments || [];
  next.tertiary.faculties = next.tertiary.faculties || [];
  next.tertiary.finance_policy = next.tertiary.finance_policy || {};
  return next;
};

const formatLongDate = (value = new Date()) =>
  new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const money = (amount, currency) => {
  const value = Number(amount || 0);
  return `${currency || ''} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`.trim();
};

const publicProgram = (program, settings) => {
  const department = (settings.tertiary.departments || []).find(
    (item) => item.id === program.department_id
  );
  const faculty = (settings.tertiary.faculties || []).find(
    (item) => item.id === (program.faculty_id || department?.faculty_id)
  );

  return {
    id: program.id,
    name: program.name,
    credential: program.credential || program.type || '',
    duration: program.duration || '',
    faculty: program.faculty || faculty?.name || '',
    department: program.department || department?.name || '',
  };
};

const intakeOptions = (settings) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lusaka',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  return (settings.tertiary.intakes || [])
    .filter((intake) => String(intake.enrollment_deadline || '') >= today)
    .map((intake) => ({
      id: intake.id,
      name: intake.name,
      year: intake.year,
      start_date: intake.start_date,
      enrollment_deadline: intake.enrollment_deadline,
    }));
};

const summaryOf = (application) => ({
  id: application.id,
  reference: application.reference,
  full_name: application.full_name,
  email: application.email,
  phone: application.phone,
  program_id: application.program_id,
  program_name: application.program_name,
  credential: application.credential,
  intake: application.intake,
  study_mode: application.study_mode,
  student_category: application.student_category,
  status: application.status,
  admission_number: application.admission_number || null,
  student_id: application.student_id || null,
  results_document_url: application.results_document_url || null,
  id_document_url: application.id_document_url || null,
  submitted_at: application.submitted_at,
  admitted_at: application.admitted_at || null,
  email_delivered: application.email_delivered ?? null,
});

const requireText = (payload, key, label) => {
  const value = String(payload?.[key] || '').trim();
  if (!value) {
    throw Object.assign(new Error(`${label} is required.`), { statusCode: 400 });
  }
  return value;
};

const loadInstitution = async () => {
  if (!models.Institution) {
    throw Object.assign(new Error('Admissions are unavailable right now.'), { statusCode: 503 });
  }

  const institution = await models.Institution.findOne();
  if (!institution) {
    throw Object.assign(new Error('School profile is not set up yet.'), { statusCode: 404 });
  }
  return institution;
};

const loadFeePlan = async (institutionId) => {
  if (!models.FeeStructure) {
    return [];
  }

  try {
    const rows = await models.FeeStructure.findAll({
      where: { },
      include: [
        { model: models.TermSemester, as: 'term', required: false },
        { model: models.EducationLevel, as: 'level', required: false },
      ],
      order: [['created_at', 'ASC']],
    });

    return rows.map((row) => {
      const item = row.toJSON();
      return {
        fee_type: item.fee_type,
        amount: Number(item.amount || 0),
        currency: item.currency || 'ZMW',
        term: item.term?.name || 'Academic period',
        level: item.level?.level_name || item.level?.level_code || 'Tertiary',
      };
    });
  } catch (error) {
    logger.warn('Fee plan lookup failed for admission letter', { error: error.message });
    return [];
  }
};

const buildLetterHtml = ({ institution, application, feePlan, minimumPercent }) => {
  const feeRows = feePlan.length
    ? feePlan
        .map(
          (item) => `<tr>
            <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(item.fee_type)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(item.level)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${escapeHtml(item.term)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${escapeHtml(
              money(item.amount, item.currency)
            )}</td>
          </tr>`
        )
        .join('')
    : `<tr><td colspan="4" style="padding:8px;border:1px solid #e2e8f0;">The finance office will issue the detailed fee schedule for this intake.</td></tr>`;

  return `<div style="font-family:Georgia,serif;color:#0f172a;line-height:1.5;">
    <p style="letter-spacing:0.18em;font-size:12px;font-weight:700;">${escapeHtml(institution.name)}</p>
    <h1 style="font-size:22px;text-align:center;text-decoration:underline;">ACCEPTANCE LETTER</h1>
    <p><strong>DATE:</strong> ${escapeHtml(formatLongDate(application.admitted_at))}</p>
    <p><strong>DEAR:</strong> ${escapeHtml(application.full_name)} &nbsp;&nbsp; <strong>${escapeHtml(
      application.admission_number
    )}</strong></p>
    <p><strong>${escapeHtml(institution.name)}</strong> congratulates you on your admission to train as a ${escapeHtml(
      application.program_name
    )}${application.credential ? ` (${escapeHtml(application.credential)})` : ''} in the ${escapeHtml(
      application.intake
    )} intake.</p>
    <p>${application.duration ? `This is a ${escapeHtml(application.duration)} programme. ` : ''}Study mode: ${escapeHtml(
      application.study_mode
    )}. Student category: ${escapeHtml(application.student_category)}.</p>
    <p>Pay at least <strong>${escapeHtml(String(minimumPercent))}%</strong> of the required fees before you attend class. The remaining balance must be cleared before examinations.</p>
    <h2 style="font-size:16px;">FEES SCHEDULE</h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Description</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Level</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Period</th>
          <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Amount</th>
        </tr>
      </thead>
      <tbody>${feeRows}</tbody>
    </table>
    <p style="font-size:13px;">Fees are subject to change according to the prevailing circumstances. Quote your admission number on every payment.</p>
    <p>Regards,<br/><strong>Admissions Office</strong><br/>${escapeHtml(institution.name)}</p>
  </div>`;
};

const getPublicCatalog = async () => {
  const institution = await loadInstitution();
  const settings = ensureAdmissionSettings(institution.settings);
  return {
    institution: {
      name: institution.name,
      code: null,
      logo_url: institution.logo_url || null,
      address: institution.address || '',
      phone: institution.phone || '',
      email: institution.email || '',
    },
    programs: settings.tertiary.programs.map((program) => publicProgram(program, settings)),
    intakes: intakeOptions(settings),
    study_modes: ['Full-time', 'Part-time', 'Distance'],
    student_categories: ['Local', 'International'],
  };
};

const submitApplication = async ({ payload }) => {
  const institution = await loadInstitution();
  const settings = ensureAdmissionSettings(institution.settings);
  const programId = requireText(payload, 'program_id', 'Programme');
  const program = settings.tertiary.programs.find((item) => String(item.id) === programId);
  if (!program) {
    throw Object.assign(new Error('Select a programme published by this institution.'), {
      statusCode: 400,
    });
  }

  if (payload.declaration !== true) {
    throw Object.assign(new Error('Confirm that the information you entered is true.'), {
      statusCode: 400,
    });
  }

  const email = requireText(payload, 'email', 'Email').toLowerCase();
  const duplicate = settings.admissions.applications.find(
    (item) =>
      String(item.email).toLowerCase() === email &&
      ['submitted', 'admitted'].includes(item.status)
  );
  if (duplicate) {
    throw Object.assign(
      new Error(`An application already exists for this email. Reference ${duplicate.reference}.`),
      { statusCode: 409 }
    );
  }

  const intakeId = requireText(payload, 'intake', 'Intake');
  const openIntakes = intakeOptions(settings);
  const intake = openIntakes.find((item) => item.id === intakeId || item.name === intakeId);
  if (!intake) {
    throw Object.assign(new Error('Choose an intake that is still open for enrolment.'), {
      statusCode: 400,
    });
  }
  const resultsDocument = requireText(payload, 'results_document_url', 'Results document');
  const idDocument = requireText(payload, 'id_document_url', 'Identity document');
  const firstName = requireText(payload, 'first_name', 'First name');
  const lastName = requireText(payload, 'last_name', 'Surname');
  const middleName = String(payload.middle_name || '').trim();
  const year = new Date().getFullYear();
  const sequence = settings.admissions.applications.length + 1;
  const published = publicProgram(program, settings);
  const secondProgram = settings.tertiary.programs.find(
    (item) => String(item.id) === String(payload.second_program_id || '')
  );

  const application = {
    id: crypto.randomUUID(),
    reference: `APP-${year}-${String(sequence).padStart(4, '0')}`,
    status: 'submitted',
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    full_name: [firstName, middleName, lastName].filter(Boolean).join(' '),
    date_of_birth: requireText(payload, 'date_of_birth', 'Date of birth'),
    gender: requireText(payload, 'gender', 'Gender'),
    marital_status: String(payload.marital_status || 'Single').trim(),
    nationality: requireText(payload, 'nationality', 'Nationality'),
    id_type: requireText(payload, 'id_type', 'Identity document'),
    id_number: requireText(payload, 'id_number', 'Identity number'),
    email,
    phone: requireText(payload, 'phone', 'Phone'),
    residential_address: requireText(payload, 'residential_address', 'Residential address'),
    postal_address: String(payload.postal_address || '').trim(),
    program_id: program.id,
    program_name: published.name,
    credential: published.credential,
    duration: published.duration,
    faculty: published.faculty,
    department: published.department,
    second_program_id: secondProgram?.id || null,
    second_program_name: secondProgram?.name || null,
    intake: intake.name,
    intake_id: intake.id,
    study_mode: requireText(payload, 'study_mode', 'Study mode'),
    student_category: requireText(payload, 'student_category', 'Student category'),
    previous_institution: requireText(payload, 'previous_institution', 'Previous school'),
    qualification: requireText(payload, 'qualification', 'Highest qualification'),
    year_completed: String(payload.year_completed || '').trim(),
    subjects_or_grades: String(payload.subjects_or_grades || '').trim(),
    results_document_url: resultsDocument,
    id_document_url: idDocument,
    sponsor_type: String(payload.sponsor_type || 'Self').trim(),
    sponsor_name: requireText(payload, 'sponsor_name', 'Sponsor name'),
    sponsor_phone: String(payload.sponsor_phone || '').trim(),
    sponsor_email: String(payload.sponsor_email || '').trim(),
    next_of_kin_name: requireText(payload, 'next_of_kin_name', 'Next of kin'),
    next_of_kin_phone: requireText(payload, 'next_of_kin_phone', 'Next of kin phone'),
    next_of_kin_relation: String(payload.next_of_kin_relation || '').trim(),
    submitted_at: new Date().toISOString(),
  };

  settings.admissions.applications.unshift(application);
  institution.set('settings', settings);
  institution.changed('settings', true);
  await institution.save();

  emitAdmissionEvent({
    institutionId: institution.id,
    event: 'admission:created',
    application: summaryOf(application),
  });

  const acknowledgement = `<p>Dear ${escapeHtml(application.full_name)},</p>
    <p>${escapeHtml(institution.name)} has received your application for ${escapeHtml(
      application.program_name
    )}.</p>
    <p>Your reference is <strong>${escapeHtml(application.reference)}</strong>. Keep it for every enquiry.</p>`;
  const receipt = await sendEmail(
    application.email,
    `${institution.name} application received — ${application.reference}`,
    acknowledgement
  ).catch((error) => {
    logger.warn('Application acknowledgement email failed', { error: error.message });
    return { delivered: false };
  });

  return {
    reference: application.reference,
    status: application.status,
    program_name: application.program_name,
    email_delivered: Boolean(receipt?.delivered),
  };
};

const listApplications = async ({ institutionId }) => {
  const institution = await loadInstitution(institutionId);
  const settings = ensureAdmissionSettings(institution.settings);
  return settings.admissions.applications.map(summaryOf);
};

const getApplication = async ({ institutionId, applicationId }) => {
  const institution = await loadInstitution(institutionId);
  const settings = ensureAdmissionSettings(institution.settings);
  const application = settings.admissions.applications.find((item) => item.id === applicationId);
  if (!application) {
    throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
  }
  return application;
};

const admitApplication = async ({ institutionId, applicationId, userId }) => {
  const institution = await loadInstitution(institutionId);
  const settings = ensureAdmissionSettings(institution.settings);
  const index = settings.admissions.applications.findIndex((item) => item.id === applicationId);
  if (index < 0) {
    throw Object.assign(new Error('Application not found.'), { statusCode: 404 });
  }

  const current = settings.admissions.applications[index];
  if (current.status === 'admitted') {
    return current;
  }
  if (current.status !== 'submitted') {
    throw Object.assign(new Error('Only a new application can be admitted.'), { statusCode: 400 });
  }

  const year = new Date().getFullYear();
  const admittedCount =
    settings.admissions.applications.filter((item) => item.status === 'admitted').length + 1;
  const feePlan = await loadFeePlan(institutionId);
  const minimumPercent = Number(settings.tertiary.finance_policy.new_student_registration_percent || 75);
  const admitted = {
    ...current,
    status: 'admitted',
    admission_number: `${institution.code}${year}${String(admittedCount).padStart(4, '0')}`,
    admitted_at: new Date().toISOString(),
    admitted_by: userId || null,
    fee_plan: feePlan,
    minimum_payment_percent: minimumPercent,
  };
  admitted.letter_html = buildLetterHtml({
    institution,
    application: admitted,
    feePlan,
    minimumPercent,
  });

  const delivery = await sendEmail(
    admitted.email,
    `${institution.name} acceptance letter — ${admitted.admission_number}`,
    admitted.letter_html
  ).catch((error) => {
    logger.warn('Admission letter email failed', { error: error.message });
    return { delivered: false, reason: error.message };
  });
  admitted.email_delivered = Boolean(delivery?.delivered);
  admitted.email_error = delivery?.delivered ? null : delivery?.reason || 'smtp_not_configured';

  settings.admissions.applications[index] = admitted;
  institution.set('settings', settings);
  institution.changed('settings', true);
  await institution.save();

  emitAdmissionEvent({
    institutionId: institution.id,
    event: 'admission:updated',
    application: summaryOf(admitted),
  });

  return admitted;
};

module.exports = {
  getPublicCatalog,
  submitApplication,
  listApplications,
  getApplication,
  admitApplication,
};
