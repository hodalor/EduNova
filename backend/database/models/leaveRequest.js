module.exports = (sequelize, DataTypes) => {
  const LeaveRequest = sequelize.define(
    "LeaveRequest",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "staff_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "staff",
        key: "id",
      },
    },
    "leave_type_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "leave_types",
        key: "id",
      },
    },
    "start_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "end_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "days_count": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "reason": {
      type: DataTypes.TEXT,
    },
    "status": {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    "approved_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    },
    {
      tableName: "leave_requests",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["staff_id"] },
      { fields: ["leave_type_id"] },
      { fields: ["approved_by"] },
      ],
    }
  );

  LeaveRequest.associate = (models) => {
  LeaveRequest.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
  LeaveRequest.belongsTo(models.LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });
  LeaveRequest.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });
  };

  return LeaveRequest;
};
