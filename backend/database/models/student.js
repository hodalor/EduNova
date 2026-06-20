module.exports = (sequelize, DataTypes) => {
  const Student = sequelize.define(
    "Student",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "user_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
    },
    "student_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "admission_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "class_id": {
      type: DataTypes.UUID,
      references: {
        model: "classes",
        key: "id",
      },
    },
    "level_id": {
      type: DataTypes.UUID,
      references: {
        model: "education_levels",
        key: "id",
      },
    },
    "date_of_birth": {
      type: DataTypes.DATEONLY,
    },
    "gender": {
      type: DataTypes.ENUM("male", "female", "other"),
    },
    "blood_group": {
      type: DataTypes.STRING,
    },
    "nationality": {
      type: DataTypes.STRING,
    },
    "religion": {
      type: DataTypes.STRING,
    },
    "photo_url": {
      type: DataTypes.TEXT,
    },
    "enrollment_date": {
      type: DataTypes.DATEONLY,
    },
    "status": {
      type: DataTypes.ENUM("active", "suspended", "graduated", "withdrawn"),
      allowNull: false,
      defaultValue: "active",
    },
    "guardian_id": {
      type: DataTypes.UUID,
      references: {
        model: "guardians",
        key: "id",
      },
    },
    },
    {
      tableName: "students",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_number", "institution_id"], unique: true },
      { fields: ["institution_id", "admission_number"], unique: true },
      { fields: ["user_id"] },
      { fields: ["institution_id"] },
      { fields: ["class_id"] },
      { fields: ["level_id"] },
      { fields: ["guardian_id"] },
      ],
    }
  );

  Student.associate = (models) => {
  Student.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  Student.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  Student.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });
  Student.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Student.belongsTo(models.Guardian, { foreignKey: 'guardian_id', as: 'guardian' });
  Student.belongsToMany(models.Guardian, { through: models.StudentGuardian, foreignKey: 'student_id', otherKey: 'guardian_id', as: 'guardians' });
  Student.hasOne(models.StudentMedical, { foreignKey: 'student_id', as: 'medicalProfile' });
  Student.hasMany(models.StudentInvoice, { foreignKey: 'student_id', as: 'invoices' });
  Student.hasMany(models.Payment, { foreignKey: 'student_id', as: 'payments' });
  Student.hasMany(models.AttendanceRecord, { foreignKey: 'student_id', as: 'attendanceRecords' });
  Student.hasMany(models.AssessmentScore, { foreignKey: 'student_id', as: 'assessmentScores' });
  Student.hasMany(models.ReportCard, { foreignKey: 'student_id', as: 'reportCards' });
  Student.hasMany(models.DisciplineIncident, { foreignKey: 'student_id', as: 'disciplineIncidents' });
  Student.hasMany(models.DemeritPoint, { foreignKey: 'student_id', as: 'demeritPoints' });
  Student.hasMany(models.MeritPoint, { foreignKey: 'student_id', as: 'meritPoints' });
  Student.hasMany(models.StudentTransport, { foreignKey: 'student_id', as: 'transportAssignments' });
  Student.hasMany(models.TransportAttendance, { foreignKey: 'student_id', as: 'transportAttendance' });
  Student.hasMany(models.HostelAllocation, { foreignKey: 'student_id', as: 'hostelAllocations' });
  Student.hasMany(models.HostelVisitor, { foreignKey: 'student_id', as: 'hostelVisitors' });
  Student.hasMany(models.HostelAttendance, { foreignKey: 'student_id', as: 'hostelAttendance' });
  };

  return Student;
};
