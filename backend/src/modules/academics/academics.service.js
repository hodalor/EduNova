const { logAudit } = require('../../shared/services/audit-log.service');
const { requireLevelConfig } = require('../../shared/services/level-config.service');
const { store } = require('../../shared/store/runtime-store');
const analyticsService = require('../analytics/analytics.service');

const listAcademicStructure = async ({ institutionId, levelCode }) => {
  const groups = store.academics.structure.groups.filter(
    (item) =>
      item.institution_id === institutionId && (!levelCode || item.level_code === levelCode)
  );
  const groupIds = new Set(groups.map((item) => item.id));

  return {
    groups,
    periods: store.academics.structure.periods.filter(
      (item) => item.institution_id === institutionId && groupIds.has(item.group_id)
    ),
    offerings: store.academics.structure.offerings.filter(
      (item) => item.institution_id === institutionId && groupIds.has(item.group_id)
    ),
    progression_rules: [...store.academics.structure.progression_rules],
  };
};

const createAcademicGroup = async ({ institutionId, userId, payload, ip }) => {
  const group = {
    id: payload.id || `grp-${store.academics.structure.groups.length + 1}`,
    institution_id: institutionId,
    name: payload.name,
    code: payload.code,
    group_type: payload.group_type || 'level',
    level_code: String(payload.level_code || '').toUpperCase(),
    calendar_type: payload.calendar_type || 'term',
  };

  requireLevelConfig(group.level_code);
  store.academics.structure.groups.push(group);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_group',
    resourceId: group.id,
    newValues: group,
    ip,
  });

  return group;
};

const createAcademicPeriod = async ({ institutionId, userId, payload, ip }) => {
  const group = store.academics.structure.groups.find(
    (item) => item.id === payload.group_id && item.institution_id === institutionId
  );
  if (!group) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const period = {
    id: payload.id || `prd-${store.academics.structure.periods.length + 1}`,
    institution_id: institutionId,
    group_id: payload.group_id,
    name: payload.name,
    sequence: Number(payload.sequence || 1),
    calendar_type: payload.calendar_type || group.calendar_type,
    status: payload.status || 'planned',
    registration_open: Boolean(payload.registration_open),
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  };

  store.academics.structure.periods.push(period);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_period',
    resourceId: period.id,
    newValues: period,
    ip,
  });

  return period;
};

const createAcademicOffering = async ({ institutionId, userId, payload, ip }) => {
  const group = store.academics.structure.groups.find(
    (item) => item.id === payload.group_id && item.institution_id === institutionId
  );
  if (!group) {
    throw Object.assign(new Error('Academic group not found.'), { statusCode: 404 });
  }

  const period = store.academics.structure.periods.find(
    (item) =>
      item.id === payload.period_id &&
      item.group_id === payload.group_id &&
      item.institution_id === institutionId
  );
  if (!period) {
    throw Object.assign(new Error('Academic period not found for this group.'), {
      statusCode: 404,
    });
  }

  const offering = {
    id: payload.id || `off-${store.academics.structure.offerings.length + 1}`,
    institution_id: institutionId,
    group_id: payload.group_id,
    period_id: payload.period_id,
    type: payload.type || 'subject',
    code: payload.code,
    name: payload.name,
    credit_hours:
      payload.credit_hours === '' || payload.credit_hours === null || payload.credit_hours === undefined
        ? null
        : Number(payload.credit_hours),
    is_core: payload.is_core !== false,
    prerequisite_codes: payload.prerequisite_codes || [],
    next_offering_codes: payload.next_offering_codes || [],
  };

  store.academics.structure.offerings.push(offering);

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'academic_offering',
    resourceId: offering.id,
    newValues: offering,
    ip,
  });

  return offering;
};

const calculateGrade = ({ levelCode, score }) => {
  const config = requireLevelConfig(levelCode);
  if (!config.hasGrades) {
    return 'milestone';
  }

  const numericScore = Number(score);
  if (config.gradeSystem === 'AF') {
    if (numericScore >= 80) return 'A';
    if (numericScore >= 70) return 'B';
    if (numericScore >= 60) return 'C';
    if (numericScore >= 50) return 'D';
    return 'F';
  }
  if (config.gradeSystem === 'wassce') {
    if (numericScore >= 80) return 'A1';
    if (numericScore >= 70) return 'B2';
    if (numericScore >= 60) return 'C4';
    return 'F9';
  }
  if (config.gradeSystem === 'gpa_4') {
    if (numericScore >= 80) return '4.0';
    if (numericScore >= 70) return '3.5';
    if (numericScore >= 60) return '3.0';
    return '2.0';
  }
  return `${numericScore}%`;
};

const saveScores = async ({ institutionId, userId, payload, ip }) => {
  const rows = payload.scores.map((row) => ({
    id: `score-${store.academics.scores.length + 1}-${row.student_id}`,
    institution_id: institutionId,
    class_id: payload.class_id,
    subject_id: payload.subject_id,
    assessment_name: payload.assessment_name,
    student_id: row.student_id,
    student_name: row.student_name,
    score: Number(row.score),
    grade: calculateGrade({ levelCode: payload.level_code, score: row.score }),
  }));

  store.academics.scores.push(...rows);
  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'assessment_scores',
    resourceId: payload.assessment_name,
    newValues: rows,
    ip,
  });
  return rows;
};

const publishReportCard = async ({ institutionId, reportCardId, userId, ip }) => {
  const reportCard = store.academics.reportCards.find(
    (item) => item.id === reportCardId && item.institution_id === institutionId
  );
  if (!reportCard) {
    throw Object.assign(new Error('Report card not found.'), { statusCode: 404 });
  }

  reportCard.is_published = true;
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'report_card',
    resourceId: reportCard.id,
    newValues: reportCard,
    ip,
  });
  await analyticsService.invalidateAnalyticsCache(institutionId);
  return reportCard;
};

const getReportCards = async ({ institutionId }) =>
  store.academics.reportCards.filter((item) => item.institution_id === institutionId);

const getRanking = async ({ className }) =>
  store.academics.reportCards
    .filter((item) => item.class_name === className)
    .sort((a, b) => b.overall_average - a.overall_average)
    .map((item, index) => ({ ...item, rank: index + 1 }));

module.exports = {
  listAcademicStructure,
  createAcademicGroup,
  createAcademicPeriod,
  createAcademicOffering,
  calculateGrade,
  saveScores,
  publishReportCard,
  getReportCards,
  getRanking,
};
