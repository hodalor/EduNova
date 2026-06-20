module.exports = (sequelize, DataTypes) => {
  const TransportAttendance = sequelize.define(
    "TransportAttendance",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "trip_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "transport_trips",
        key: "id",
      },
    },
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    "status": {
      type: DataTypes.ENUM("boarded", "absent", "dropped_off"),
      allowNull: false,
    },
    "boarded_at": {
      type: DataTypes.DATE,
    },
    "dropped_at": {
      type: DataTypes.DATE,
    },
    },
    {
      tableName: "transport_attendance",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["trip_id", "student_id"], unique: true },
      { fields: ["trip_id"] },
      { fields: ["student_id"] },
      ],
    }
  );

  TransportAttendance.associate = (models) => {
  TransportAttendance.belongsTo(models.TransportTrip, { foreignKey: 'trip_id', as: 'trip' });
  TransportAttendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  };

  return TransportAttendance;
};
