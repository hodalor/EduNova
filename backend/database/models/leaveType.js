module.exports = (sequelize, DataTypes) => {
  const LeaveType = sequelize.define(
    "LeaveType",
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
    "days_per_year": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "is_paid": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    },
    {
      tableName: "leave_types",
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

  LeaveType.associate = (models) => {
  LeaveType.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  LeaveType.hasMany(models.LeaveRequest, { foreignKey: 'leave_type_id', as: 'leaveRequests' });
  };

  return LeaveType;
};
