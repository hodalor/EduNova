module.exports = (sequelize, DataTypes) => {
  const Institution = sequelize.define(
    "Institution",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "code": {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    "education_levels": {
      type: DataTypes.ARRAY(DataTypes.ENUM("DC", "PR", "JH", "SH", "TR")),
      allowNull: false,
      defaultValue: [],
    },
    "logo_url": {
      type: DataTypes.TEXT,
    },
    "address": {
      type: DataTypes.TEXT,
    },
    "phone": {
      type: DataTypes.STRING,
    },
    "email": {
      type: DataTypes.STRING,
    },
    "website": {
      type: DataTypes.STRING,
    },
    "subscription_plan": {
      type: DataTypes.STRING,
    },
    "is_active": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    "settings": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    },
    {
      tableName: "institutions",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["code"], unique: true },
      ],
    }
  );

  Institution.associate = (models) => {
  Institution.hasMany(models.InstitutionBranch, { foreignKey: 'institution_id', as: 'branches' });
  Institution.hasMany(models.AcademicYear, { foreignKey: 'institution_id', as: 'academicYears' });
  Institution.hasMany(models.EducationLevel, { foreignKey: 'institution_id', as: 'educationLevelRecords' });
  Institution.hasMany(models.Class, { foreignKey: 'institution_id', as: 'classes' });
  Institution.hasMany(models.Subject, { foreignKey: 'institution_id', as: 'subjects' });
  Institution.hasMany(models.User, { foreignKey: 'institution_id', as: 'users' });
  Institution.hasMany(models.Student, { foreignKey: 'institution_id', as: 'students' });
  Institution.hasMany(models.Staff, { foreignKey: 'institution_id', as: 'staffMembers' });
  Institution.hasMany(models.FeeStructure, { foreignKey: 'institution_id', as: 'feeStructures' });
  Institution.hasMany(models.StudentInvoice, { foreignKey: 'institution_id', as: 'studentInvoices' });
  Institution.hasMany(models.ExpenseCategory, { foreignKey: 'institution_id', as: 'expenseCategories' });
  Institution.hasMany(models.Expense, { foreignKey: 'institution_id', as: 'expenses' });
  Institution.hasMany(models.GradeScale, { foreignKey: 'institution_id', as: 'gradeScales' });
  Institution.hasMany(models.Notification, { foreignKey: 'institution_id', as: 'notifications' });
  Institution.hasMany(models.Message, { foreignKey: 'institution_id', as: 'messages' });
  Institution.hasMany(models.Announcement, { foreignKey: 'institution_id', as: 'announcements' });
  Institution.hasMany(models.DisciplineIncident, { foreignKey: 'institution_id', as: 'disciplineIncidents' });
  Institution.hasMany(models.Vehicle, { foreignKey: 'institution_id', as: 'vehicles' });
  Institution.hasMany(models.TransportRoute, { foreignKey: 'institution_id', as: 'transportRoutes' });
  Institution.hasMany(models.Hostel, { foreignKey: 'institution_id', as: 'hostels' });
  Institution.hasMany(models.InventoryCategory, { foreignKey: 'institution_id', as: 'inventoryCategories' });
  Institution.hasMany(models.InventoryItem, { foreignKey: 'institution_id', as: 'inventoryItems' });
  Institution.hasMany(models.PurchaseOrder, { foreignKey: 'institution_id', as: 'purchaseOrders' });
  Institution.hasMany(models.TimetablePeriod, { foreignKey: 'institution_id', as: 'timetablePeriods' });
  Institution.hasMany(models.Timetable, { foreignKey: 'institution_id', as: 'timetables' });
  Institution.hasMany(models.SalaryGrade, { foreignKey: 'institution_id', as: 'salaryGrades' });
  Institution.hasMany(models.PayrollRun, { foreignKey: 'institution_id', as: 'payrollRuns' });
  Institution.hasMany(models.LeaveType, { foreignKey: 'institution_id', as: 'leaveTypes' });
  };

  return Institution;
};
