module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    "User",
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
    "email": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "phone": {
      type: DataTypes.STRING,
    },
    "password_hash": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "role": {
      type: DataTypes.ENUM("super_admin", "institution_admin", "teacher", "student", "parent", "driver", "accountant", "librarian"),
      allowNull: false,
    },
    "first_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "last_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "profile_photo": {
      type: DataTypes.TEXT,
    },
    "is_active": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    "last_login": {
      type: DataTypes.DATE,
    },
    "email_verified": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "phone_verified": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "2fa_enabled": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "2fa_secret": {
      type: DataTypes.STRING,
    },
    },
    {
      tableName: "users",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["email", "institution_id"], unique: true },
      { fields: ["institution_id", "phone"] },
      { fields: ["institution_id"] },
      ],
    }
  );

  User.associate = (models) => {
  User.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  User.hasOne(models.Student, { foreignKey: 'user_id', as: 'studentProfile' });
  User.hasOne(models.Guardian, { foreignKey: 'user_id', as: 'guardianProfile' });
  User.hasOne(models.Staff, { foreignKey: 'user_id', as: 'staffProfile' });
  User.hasMany(models.Payment, { foreignKey: 'received_by', as: 'paymentsReceived' });
  User.hasMany(models.AttendanceRecord, { foreignKey: 'marked_by', as: 'attendanceMarked' });
  User.hasMany(models.Notification, { foreignKey: 'sender_id', as: 'notificationsSent' });
  User.hasMany(models.Message, { foreignKey: 'sender_id', as: 'messagesSent' });
  User.hasMany(models.Message, { foreignKey: 'recipient_id', as: 'messagesReceived' });
  User.hasMany(models.Announcement, { foreignKey: 'created_by', as: 'announcementsCreated' });
  User.hasMany(models.DisciplineIncident, { foreignKey: 'reported_by', as: 'reportedIncidents' });
  User.hasMany(models.MeritPoint, { foreignKey: 'awarded_by', as: 'meritsAwarded' });
  User.hasMany(models.Vehicle, { foreignKey: 'driver_id', as: 'assignedVehicles' });
  User.hasMany(models.TransportTrip, { foreignKey: 'driver_id', as: 'drivenTrips' });
  User.hasMany(models.HostelVisitor, { foreignKey: 'approved_by', as: 'approvedHostelVisits' });
  User.hasMany(models.Expense, { foreignKey: 'approved_by', as: 'approvedExpenses' });
  User.hasMany(models.StockMovement, { foreignKey: 'moved_by', as: 'stockMovements' });
  User.hasMany(models.PurchaseOrder, { foreignKey: 'ordered_by', as: 'purchaseOrders' });
  User.hasMany(models.PayrollRun, { foreignKey: 'processed_by', as: 'processedPayrollRuns' });
  User.hasMany(models.LeaveRequest, { foreignKey: 'approved_by', as: 'approvedLeaveRequests' });
  };

  return User;
};
