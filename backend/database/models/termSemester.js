module.exports = (sequelize, DataTypes) => {
  const TermSemester = sequelize.define(
    "TermSemester",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "type": {
      type: DataTypes.ENUM("term", "semester"),
      allowNull: false,
    },
    "start_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "end_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "is_current": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "terms_semesters",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["academic_year_id", "name", "type"], unique: true },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  TermSemester.associate = (models) => {
  TermSemester.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  TermSemester.hasMany(models.FeeStructure, { foreignKey: 'term_id', as: 'feeStructures' });
  TermSemester.hasMany(models.StudentInvoice, { foreignKey: 'term_id', as: 'studentInvoices' });
  TermSemester.hasMany(models.Assessment, { foreignKey: 'term_id', as: 'assessments' });
  TermSemester.hasMany(models.ReportCard, { foreignKey: 'term_id', as: 'reportCards' });
  TermSemester.hasMany(models.Timetable, { foreignKey: 'term_id', as: 'timetables' });
  };

  return TermSemester;
};
