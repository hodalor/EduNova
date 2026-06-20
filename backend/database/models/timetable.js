module.exports = (sequelize, DataTypes) => {
  const Timetable = sequelize.define(
    "Timetable",
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
    "class_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "classes",
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
    "term_id": {
      type: DataTypes.UUID,
      references: {
        model: "terms_semesters",
        key: "id",
      },
    },
    "is_active": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    "published_at": {
      type: DataTypes.DATE,
    },
    },
    {
      tableName: "timetables",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "academic_year_id"] },
      { fields: ["class_id", "academic_year_id", "term_id"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["class_id"] },
      { fields: ["academic_year_id"] },
      { fields: ["term_id"] },
      ],
    }
  );

  Timetable.associate = (models) => {
  Timetable.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Timetable.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  Timetable.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  Timetable.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });
  Timetable.hasMany(models.TimetableSlot, { foreignKey: 'timetable_id', as: 'slots' });
  };

  return Timetable;
};
