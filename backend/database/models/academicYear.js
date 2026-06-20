module.exports = (sequelize, DataTypes) => {
  const AcademicYear = sequelize.define(
    "AcademicYear",
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
    "name": {
      type: DataTypes.STRING,
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
      tableName: "academic_years",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "name"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  AcademicYear.associate = (models) => {
  AcademicYear.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  AcademicYear.hasMany(models.TermSemester, { foreignKey: 'academic_year_id', as: 'termsSemesters' });
  AcademicYear.hasMany(models.Class, { foreignKey: 'academic_year_id', as: 'classes' });
  AcademicYear.hasMany(models.FeeStructure, { foreignKey: 'academic_year_id', as: 'feeStructures' });
  AcademicYear.hasMany(models.StudentInvoice, { foreignKey: 'academic_year_id', as: 'studentInvoices' });
  AcademicYear.hasMany(models.ReportCard, { foreignKey: 'academic_year_id', as: 'reportCards' });
  AcademicYear.hasMany(models.DemeritPoint, { foreignKey: 'academic_year_id', as: 'demeritPoints' });
  AcademicYear.hasMany(models.MeritPoint, { foreignKey: 'academic_year_id', as: 'meritPoints' });
  AcademicYear.hasMany(models.StudentTransport, { foreignKey: 'academic_year_id', as: 'studentTransportRecords' });
  AcademicYear.hasMany(models.HostelAllocation, { foreignKey: 'academic_year_id', as: 'hostelAllocations' });
  AcademicYear.hasMany(models.Timetable, { foreignKey: 'academic_year_id', as: 'timetables' });
  };

  return AcademicYear;
};
