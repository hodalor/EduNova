module.exports = (sequelize, DataTypes) => {
  const StaffAttendance = sequelize.define(
    "StaffAttendance",
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
    "date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "check_in": {
      type: DataTypes.TIME,
    },
    "check_out": {
      type: DataTypes.TIME,
    },
    "status": {
      type: DataTypes.STRING,
    },
    "method": {
      type: DataTypes.ENUM("biometric", "manual"),
      allowNull: false,
    },
    },
    {
      tableName: "staff_attendance",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["staff_id", "date"], unique: true },
      { fields: ["staff_id"] },
      ],
    }
  );

  StaffAttendance.associate = (models) => {
  StaffAttendance.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
  };

  return StaffAttendance;
};
