const levelConfig = {
  DC: {
    hasGrades: false,
    hasExams: false,
    hasGPA: false,
    tracksMedical: true,
    requiresGuardianPickup: true,
    attendanceUnit: 'halfDay',
    reportType: 'developmental_milestones',
    ageMin: 0,
    ageMax: 4,
    modules: ['attendance', 'medical', 'communication', 'transport', 'hostel'],
  },
  PR: {
    hasGrades: true,
    gradeSystem: 'AF',
    hasGPA: false,
    assessmentTypes: ['classwork', 'homework', 'test', 'exam'],
    reportType: 'term_report',
    modules: ['attendance', 'academics', 'finance', 'communication', 'transport'],
  },
  JH: {
    hasGrades: true,
    gradeSystem: 'percentage',
    hasGPA: false,
    computesAggregate: true,
    assessmentTypes: ['classwork', 'test', 'exam'],
    reportType: 'bece_prep_report',
    modules: ['attendance', 'academics', 'finance', 'communication', 'discipline', 'transport'],
  },
  SH: {
    hasGrades: true,
    gradeSystem: 'wassce',
    hasElectives: true,
    hasGPA: false,
    careerCounselingEnabled: true,
    assessmentTypes: ['classwork', 'midterm', 'mock', 'final'],
    reportType: 'wassce_prep_report',
    modules: ['attendance', 'academics', 'finance', 'communication', 'discipline', 'transport', 'hostel'],
  },
  TR: {
    hasGrades: true,
    gradeSystem: 'gpa_4',
    hasCreditHours: true,
    hasSemesters: true,
    hasCGPA: true,
    hasDepartments: true,
    hasCourseRegistration: true,
    assessmentTypes: ['quiz', 'cat', 'assignment', 'project', 'midterm', 'final'],
    reportType: 'transcript',
    modules: ['attendance', 'academics', 'finance', 'communication', 'discipline', 'hostel'],
  },
};

const getLevelConfig = (levelCode) => {
  const code = String(levelCode || '').toUpperCase();
  return levelConfig[code] || null;
};

const requireLevelConfig = (levelCode) => {
  const config = getLevelConfig(levelCode);
  if (!config) {
    throw Object.assign(new Error(`Unsupported education level: ${levelCode}`), {
      status: 400,
    });
  }
  return config;
};

module.exports = {
  levelConfig,
  getLevelConfig,
  requireLevelConfig,
};
