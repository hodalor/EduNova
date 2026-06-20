module.exports = (sequelize, DataTypes) => {
  const Staff = sequelize.define(
    "Staff",
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
    "staff_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "department": {
      type: DataTypes.STRING,
    },
    "designation": {
      type: DataTypes.STRING,
    },
    "qualification": {
      type: DataTypes.STRING,
    },
    "specialization": {
      type: DataTypes.STRING,
    },
    "employment_type": {
      type: DataTypes.ENUM("full_time", "part_time", "contract"),
      allowNull: false,
    },
    "date_joined": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "salary_grade": {
      type: DataTypes.STRING,
    },
    },
    {
      tableName: "staff",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["user_id"], unique: true },
      { fields: ["institution_id", "staff_number"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  Staff.associate = (models) => {
  Staff.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  Staff.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Staff.hasMany(models.Class, { foreignKey: 'class_teacher_id', as: 'homeroomClasses' });
  Staff.hasMany(models.ClassSubject, { foreignKey: 'teacher_id', as: 'classSubjectAssignments' });
  Staff.hasMany(models.AttendanceSession, { foreignKey: 'teacher_id', as: 'attendanceSessions' });
  Staff.hasMany(models.Assessment, { foreignKey: 'teacher_id', as: 'assessments' });
  Staff.hasMany(models.Hostel, { foreignKey: 'warden_id', as: 'wardenships' });
  Staff.hasMany(models.TimetableSlot, { foreignKey: 'teacher_id', as: 'timetableSlots' });
  Staff.hasMany(models.StaffAttendance, { foreignKey: 'staff_id', as: 'attendanceLogs' });
  Staff.hasMany(models.PayrollRecord, { foreignKey: 'staff_id', as: 'payrollRecords' });
  Staff.hasMany(models.LeaveRequest, { foreignKey: 'staff_id', as: 'leaveRequests' });
  };

  return Staff;
};
