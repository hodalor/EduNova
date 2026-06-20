module.exports = (sequelize, DataTypes) => {
  const TransportTrip = sequelize.define(
    "TransportTrip",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "vehicle_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "vehicles",
        key: "id",
      },
    },
    "route_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "transport_routes",
        key: "id",
      },
    },
    "driver_id": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "trip_type": {
      type: DataTypes.ENUM("morning", "afternoon"),
      allowNull: false,
    },
    "date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "departure_time": {
      type: DataTypes.TIME,
    },
    "arrival_time": {
      type: DataTypes.TIME,
    },
    "status": {
      type: DataTypes.ENUM("pending", "in_progress", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "pending",
    },
    },
    {
      tableName: "transport_trips",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["vehicle_id", "route_id", "date", "trip_type"], unique: true },
      { fields: ["vehicle_id"] },
      { fields: ["route_id"] },
      { fields: ["driver_id"] },
      ],
    }
  );

  TransportTrip.associate = (models) => {
  TransportTrip.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  TransportTrip.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });
  TransportTrip.belongsTo(models.User, { foreignKey: 'driver_id', as: 'driver' });
  TransportTrip.hasMany(models.TransportAttendance, { foreignKey: 'trip_id', as: 'transportAttendance' });
  };

  return TransportTrip;
};
