const { randomUUID } = require('crypto');

const { models } = require('../../config/database');
const { store } = require('../../shared/store/runtime-store');

const cloneSettings = (settings) => JSON.parse(JSON.stringify(settings || {}));

const ensureLearningSettings = (settings) => {
  const next = cloneSettings(settings);
  next.academics = next.academics || { groups: [], periods: [], offerings: [] };
  next.admissions = next.admissions || { student_profiles: [] };
  next.tertiary = next.tertiary || {};
  next.tertiary.student_progress = next.tertiary.student_progress || [];
  next.tertiary.programs = next.tertiary.programs || [];
  next.learning = next.learning || {};
  next.learning.materials = next.learning.materials || [];
  next.learning.assessments = next.learning.assessments || [];
  next.learning.submissions = next.learning.submissions || [];
  return next;
};

const sortBySequence = (items = []) =>
  items.slice().sort((a, b) => {
    const sequenceDiff = Number(a.sequence || 0) - Number(b.sequence || 0);
    if (sequenceDiff !== 0) {
      return sequenceDiff;
    }
    return String(a.name || '').localeCompare(String(b.name || ''));
  });

const normalizeProgramId = (value) => String(value || '').trim();

const offeringMatchesProgram = ({ offering, programId, group }) => {
  const normalizedProgramId = normalizeProgramId(programId);
  if (!normalizedProgramId) {
    return true;
  }

  const directProgramId = normalizeProgramId(offering?.program_id);
  if (directProgramId) {
    return directProgramId === normalizedProgramId;
  }

  const legacyGroupPrograms = Array.isArray(group?.program_ids)
    ? group.program_ids.map((item) => String(item || '').trim()).filter(Boolean)
    : [];
  if (legacyGroupPrograms.length) {
    return legacyGroupPrograms.includes(normalizedProgramId);
  }

  return true;
};

const getInstitutionRecord = async ({ institutionId }) => {
  if (models.Institution) {
    const institution = await models.Institution.findByPk(institutionId);
    if (institution) {
      return { mode: 'database', institution };
    }
  }

  const institution = (store.platform?.institutions || []).find((item) => item.id === institutionId) || null;
  if (!institution) {
    throw Object.assign(new Error('Institution not found.'), { statusCode: 404 });
  }
  return { mode: 'runtime', institution };
};

const saveInstitutionSettings = async ({ record, settings }) => {
  if (record.mode === 'database') {
    await record.institution.update({ settings });
    return;
  }
  record.institution.settings = settings;
};

const getAcademicStructure = (settings) => {
  const groups = (settings.academics?.groups || []).filter((item) => item.level_code === 'TR');
  const groupIds = new Set(groups.map((item) => item.id));
  const periods = (settings.academics?.periods || []).filter((item) => groupIds.has(item.group_id));
  const periodIds = new Set(periods.map((item) => item.id));
  const offerings = (settings.academics?.offerings || []).filter(
    (item) => groupIds.has(item.group_id) && periodIds.has(item.period_id)
  );
  return { groups, periods, offerings };
};

const serializeCourse = ({ offering, groups, periods, programs }) => {
  const group = groups.find((item) => item.id === offering.group_id) || null;
  const period = periods.find((item) => item.id === offering.period_id) || null;
  const program = programs.find((item) => item.id === offering.program_id) || null;
  return {
    id: offering.id,
    code: offering.code,
    name: offering.name,
    course_type: offering.course_type || offering.type || 'Course',
    credit_hours: Number(offering.credit_hours || 0),
    program_id: offering.program_id || null,
    program_name: program?.name || null,
    group_id: group?.id || offering.group_id,
    group_name: group?.name || '',
    period_id: period?.id || offering.period_id,
    period_name: period?.name || '',
  };
};

const resolveStudentContext = async ({ institutionId, userId, settings, authStudentId = null }) => {
  let studentId = authStudentId || null;

  if (!studentId && models.Student) {
    const linkedStudent = await models.Student.findOne({
      where: { institution_id: institutionId, user_id: userId },
      attributes: ['id'],
    }).catch(() => null);
    studentId = linkedStudent?.id || null;
  }

  if (!studentId) {
    const runtimeStudent = (store.students?.profiles || []).find(
      (item) => item.institution_id === institutionId && item.user_id === userId
    );
    studentId = runtimeStudent?.id || null;
  }

  if (!studentId) {
    throw Object.assign(new Error('Student account is not linked to a learner record.'), {
      statusCode: 404,
    });
  }

  const profile =
    (settings.admissions?.student_profiles || []).find((item) => String(item.student_id) === String(studentId)) ||
    {};
  const progress =
    (settings.tertiary?.student_progress || []).find((item) => String(item.student_id) === String(studentId)) ||
    {};
  const programId = progress.program_id || profile?.tertiary?.program_id || profile.program_id || null;
  const program = (settings.tertiary?.programs || []).find((item) => item.id === programId) || null;
  const roadmapGroupIds = Array.from(
    new Set([...(program?.roadmap_group_ids || []), ...(progress.current_group_id ? [progress.current_group_id] : [])])
  );
  return {
    studentId,
    profile,
    progress,
    programId,
    roadmapGroupIds,
  };
};

const getAccessibleCourses = async ({ institutionId, role, userId, settings, authStudentId = null }) => {
  const { groups, periods, offerings } = getAcademicStructure(settings);
  const programs = settings.tertiary?.programs || [];

  if (role === 'student') {
    const studentContext = await resolveStudentContext({
      institutionId,
      userId,
      settings,
      authStudentId,
    });
    const allowedGroupIds = new Set(studentContext.roadmapGroupIds);
    return sortBySequence(
      offerings.filter((offering) => {
        const group = groups.find((item) => item.id === offering.group_id);
        return (
          allowedGroupIds.has(offering.group_id) &&
          offeringMatchesProgram({
            offering,
            programId: studentContext.programId,
            group,
          })
        );
      })
    ).map((offering) => serializeCourse({ offering, groups, periods, programs }));
  }

  return sortBySequence(offerings).map((offering) =>
    serializeCourse({ offering, groups, periods, programs })
  );
};

const listCourses = async ({ institutionId, role, userId, authStudentId = null }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  return getAccessibleCourses({ institutionId, role, userId, settings, authStudentId });
};

const listMaterials = async ({ institutionId, role, userId, query = {}, authStudentId = null }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const accessibleCourseIds = new Set(
    (await getAccessibleCourses({ institutionId, role, userId, settings, authStudentId })).map((item) => item.id)
  );

  return settings.learning.materials
    .filter((item) => accessibleCourseIds.has(item.course_id))
    .filter((item) => !query.course_id || String(item.course_id) === String(query.course_id))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
};

const createMaterial = async ({ institutionId, user, payload }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const { groups, periods, offerings } = getAcademicStructure(settings);
  const programs = settings.tertiary?.programs || [];
  const offering = offerings.find((item) => String(item.id) === String(payload.course_id));
  if (!offering) {
    throw Object.assign(new Error('Selected course could not be found.'), { statusCode: 404 });
  }

  const course = serializeCourse({ offering, groups, periods, programs });
  const material = {
    id: randomUUID(),
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim() || null,
    material_type: String(payload.material_type || 'note').trim() || 'note',
    course_id: course.id,
    course_code: course.code,
    course_name: course.name,
    program_id: course.program_id,
    program_name: course.program_name,
    group_id: course.group_id,
    group_name: course.group_name,
    period_id: course.period_id,
    period_name: course.period_name,
    attachment_url: String(payload.attachment_url || '').trim(),
    attachment_name: String(payload.attachment_name || '').trim() || 'Attachment',
    attachment_mime_type: String(payload.attachment_mime_type || '').trim() || 'application/octet-stream',
    uploaded_by: user.id,
    uploaded_by_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
    created_at: new Date().toISOString(),
  };

  if (!material.title || !material.attachment_url) {
    throw Object.assign(new Error('Title and uploaded material file are required.'), {
      statusCode: 400,
    });
  }

  settings.learning.materials.unshift(material);
  await saveInstitutionSettings({ record, settings });
  return material;
};

const normalizeQuestions = (questions = []) =>
  questions.map((question) => ({
    id: question.id || randomUUID(),
    type: String(question.type || 'objective').trim() || 'objective',
    prompt: String(question.prompt || '').trim(),
    options: Array.isArray(question.options)
      ? question.options.map((item) => String(item || '').trim()).filter(Boolean)
      : [],
    correct_answer: String(question.correct_answer || '').trim(),
    model_answer: String(question.model_answer || '').trim() || null,
    max_score: Number(question.max_score || 1) || 1,
  }));

const listAssessments = async ({ institutionId, role, userId, query = {}, authStudentId = null }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const accessibleCourseIds = new Set(
    (await getAccessibleCourses({ institutionId, role, userId, settings, authStudentId })).map((item) => item.id)
  );

  const now = new Date().toISOString();

  return settings.learning.assessments
    .filter((item) => accessibleCourseIds.has(item.course_id))
    .filter((item) => !query.course_id || String(item.course_id) === String(query.course_id))
    .filter((item) => (role === 'student' ? item.is_published !== false && (!item.due_at || item.due_at >= now) : true))
    .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
};

const createAssessment = async ({ institutionId, user, payload }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const { groups, periods, offerings } = getAcademicStructure(settings);
  const programs = settings.tertiary?.programs || [];
  const offering = offerings.find((item) => String(item.id) === String(payload.course_id));
  if (!offering) {
    throw Object.assign(new Error('Selected course could not be found.'), { statusCode: 404 });
  }

  const questions = normalizeQuestions(payload.questions || []);
  if (!questions.length || questions.some((item) => !item.prompt)) {
    throw Object.assign(new Error('Add at least one well-formed question.'), { statusCode: 400 });
  }

  const course = serializeCourse({ offering, groups, periods, programs });
  const assessment = {
    id: randomUUID(),
    title: String(payload.title || '').trim(),
    instructions: String(payload.instructions || '').trim() || null,
    assessment_type: String(payload.assessment_type || 'quiz').trim() || 'quiz',
    course_id: course.id,
    course_code: course.code,
    course_name: course.name,
    program_id: course.program_id,
    program_name: course.program_name,
    group_id: course.group_id,
    group_name: course.group_name,
    period_id: course.period_id,
    period_name: course.period_name,
    duration_minutes: Number(payload.duration_minutes || 30) || 30,
    due_at: payload.due_at || null,
    is_published: payload.is_published !== false,
    attempts_allowed: Number(payload.attempts_allowed || 1) || 1,
    questions,
    total_score: questions.reduce((sum, item) => sum + Number(item.max_score || 0), 0),
    created_at: new Date().toISOString(),
    created_by: user.id,
    created_by_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
  };

  if (!assessment.title) {
    throw Object.assign(new Error('Assessment title is required.'), { statusCode: 400 });
  }

  settings.learning.assessments.unshift(assessment);
  await saveInstitutionSettings({ record, settings });
  return assessment;
};

const listAssessmentSubmissions = async ({ institutionId, assessmentId }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  return settings.learning.submissions
    .filter((item) => String(item.assessment_id) === String(assessmentId))
    .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')));
};

const submitAssessment = async ({ institutionId, userId, assessmentId, payload, authStudentId = null }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const assessment = settings.learning.assessments.find((item) => String(item.id) === String(assessmentId));
  if (!assessment) {
    throw Object.assign(new Error('Assessment not found.'), { statusCode: 404 });
  }

  const studentContext = await resolveStudentContext({
    institutionId,
    userId,
    settings,
    authStudentId,
  });
  const existingAttempts = settings.learning.submissions.filter(
    (item) =>
      String(item.assessment_id) === String(assessmentId) &&
      String(item.student_id) === String(studentContext.studentId)
  );
  if (existingAttempts.length >= Number(assessment.attempts_allowed || 1)) {
    throw Object.assign(new Error('Attempt limit reached for this assessment.'), { statusCode: 400 });
  }

  if (assessment.due_at && new Date(assessment.due_at).getTime() < Date.now()) {
    throw Object.assign(new Error('This assessment has expired.'), { statusCode: 400 });
  }

  const answerMap = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  let autoScore = 0;
  let pendingManualReview = false;

  const answers = assessment.questions.map((question) => {
    const rawAnswer = answerMap[question.id];
    const response = Array.isArray(rawAnswer)
      ? rawAnswer.map((item) => String(item || '').trim())
      : String(rawAnswer || '').trim();

    if (question.type === 'theory') {
      pendingManualReview = true;
      return {
        question_id: question.id,
        prompt: question.prompt,
        type: question.type,
        response,
        max_score: question.max_score,
        awarded_score: null,
        is_correct: null,
      };
    }

    const isCorrect =
      Array.isArray(response)
        ? response.join('|').toLowerCase() === String(question.correct_answer || '').trim().toLowerCase()
        : String(response || '').trim().toLowerCase() ===
          String(question.correct_answer || '').trim().toLowerCase();
    const awardedScore = isCorrect ? Number(question.max_score || 0) : 0;
    autoScore += awardedScore;
    return {
      question_id: question.id,
      prompt: question.prompt,
      type: question.type,
      response,
      max_score: question.max_score,
      awarded_score: awardedScore,
      is_correct: isCorrect,
    };
  });

  const submission = {
    id: randomUUID(),
    assessment_id: assessment.id,
    assessment_title: assessment.title,
    course_id: assessment.course_id,
    course_code: assessment.course_code,
    course_name: assessment.course_name,
    student_id: studentContext.studentId,
    student_name: studentContext.profile.full_name || userId,
    submitted_at: new Date().toISOString(),
    answers,
    auto_score: autoScore,
    final_score: pendingManualReview ? null : autoScore,
    max_score: assessment.total_score,
    status: pendingManualReview ? 'pending_review' : 'graded',
    feedback: null,
    graded_by: null,
    graded_at: null,
  };

  settings.learning.submissions.unshift(submission);
  await saveInstitutionSettings({ record, settings });
  return submission;
};

const gradeSubmission = async ({ institutionId, submissionId, payload, user }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const submission = settings.learning.submissions.find((item) => String(item.id) === String(submissionId));
  if (!submission) {
    throw Object.assign(new Error('Submission not found.'), { statusCode: 404 });
  }

  const grades = payload.answers && typeof payload.answers === 'object' ? payload.answers : {};
  submission.answers = submission.answers.map((answer) => {
    if (answer.type !== 'theory') {
      return answer;
    }
    const awardedScore = Math.max(0, Math.min(Number(grades[answer.question_id] || 0), Number(answer.max_score || 0)));
    return {
      ...answer,
      awarded_score: awardedScore,
      is_correct: null,
    };
  });

  submission.final_score = submission.answers.reduce(
    (sum, item) => sum + Number(item.awarded_score || 0),
    0
  );
  submission.status = 'graded';
  submission.feedback = String(payload.feedback || '').trim() || null;
  submission.graded_by = user.id;
  submission.graded_at = new Date().toISOString();

  await saveInstitutionSettings({ record, settings });
  return submission;
};

const listMyResults = async ({ institutionId, userId, authStudentId = null }) => {
  const record = await getInstitutionRecord({ institutionId });
  const settings = ensureLearningSettings(record.institution.settings);
  const studentContext = await resolveStudentContext({
    institutionId,
    userId,
    settings,
    authStudentId,
  });

  return settings.learning.submissions
    .filter((item) => String(item.student_id) === String(studentContext.studentId))
    .sort((a, b) => String(b.submitted_at || '').localeCompare(String(a.submitted_at || '')));
};

module.exports = {
  listCourses,
  listMaterials,
  createMaterial,
  listAssessments,
  createAssessment,
  listAssessmentSubmissions,
  submitAssessment,
  gradeSubmission,
  listMyResults,
};
