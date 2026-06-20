module.exports = (sequelize, DataTypes) => {
  const Class = sequelize.define(
    "Class",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
    },
    "level_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "education_levels",
        key: "id",
      },
    },
    "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "stream": {
      type: DataTypes.STRING,
    },
    "capacity": {
      type: DataTypes.INTEGER,
    },
    "class_teacher_id": {
      type: DataTypes.UUID,
      references: {
        model: "staff",
        key: "id",
      },
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    },
    {
      tableName: "classes",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "academic_year_id"] },
      { fields: ["institution_id", "academic_year_id", "name", "stream"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["level_id"] },
      { fields: ["class_teacher_id"] },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  Class.associate = (models) => {
  Class.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Class.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });
  Class.belongsTo(models.Staff, { foreignKey: 'class_teacher_id', as: 'classTeacher' });
  Class.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });
  Class.hasMany(models.ClassSubject, { foreignKey: 'class_id', as: 'classSubjects' });
  Class.hasMany(models.FeeStructure, { foreignKey: 'class_id', as: 'feeStructures' });
  Class.hasMany(models.AttendanceSession, { foreignKey: 'class_id', as: 'attendanceSessions' });
  Class.hasMany(models.Assessment, { foreignKey: 'class_id', as: 'assessments' });
  Class.hasMany(models.ReportCard, { foreignKey: 'class_id', as: 'reportCards' });
  Class.hasMany(models.Timetable, { foreignKey: 'class_id', as: 'timetables' });
  Class.belongsToMany(models.Subject, { through: models.ClassSubject, foreignKey: 'class_id', otherKey: 'subject_id', as: 'subjects' });
  };

  return Class;
};
