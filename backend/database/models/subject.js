module.exports = (sequelize, DataTypes) => {
  const Subject = sequelize.define(
    "Subject",
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
    "code": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "subject_type": {
      type: DataTypes.ENUM("core", "elective", "compulsory"),
      allowNull: false,
    },
    "credit_hours": {
      type: DataTypes.INTEGER,
    },
    "is_active": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    },
    {
      tableName: "subjects",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "code"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["level_id"] },
      ],
    }
  );

  Subject.associate = (models) => {
  Subject.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Subject.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });
  Subject.hasMany(models.ClassSubject, { foreignKey: 'subject_id', as: 'classSubjects' });
  Subject.hasMany(models.AttendanceSession, { foreignKey: 'subject_id', as: 'attendanceSessions' });
  Subject.hasMany(models.Assessment, { foreignKey: 'subject_id', as: 'assessments' });
  Subject.hasMany(models.TimetableSlot, { foreignKey: 'subject_id', as: 'timetableSlots' });
  Subject.belongsToMany(models.Class, { through: models.ClassSubject, foreignKey: 'subject_id', otherKey: 'class_id', as: 'classes' });
  };

  return Subject;
};
