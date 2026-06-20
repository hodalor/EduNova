module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    "Vehicle",
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
    "plate_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "type": {
      type: DataTypes.ENUM("bus", "van", "car"),
      allowNull: false,
    },
    "capacity": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "model": {
      type: DataTypes.STRING,
    },
    "year": {
      type: DataTypes.INTEGER,
    },
    "driver_id": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "route_id": {
      type: DataTypes.UUID,
      references: {
        model: "transport_routes",
        key: "id",
      },
    },
    "gps_device_id": {
      type: DataTypes.STRING,
    },
    "insurance_expiry": {
      type: DataTypes.DATEONLY,
    },
    "roadworthy_expiry": {
      type: DataTypes.DATEONLY,
    },
    },
    {
      tableName: "vehicles",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "plate_number"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["driver_id"] },
      { fields: ["route_id"] },
      ],
    }
  );

  Vehicle.associate = (models) => {
  Vehicle.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Vehicle.belongsTo(models.User, { foreignKey: 'driver_id', as: 'driver' });
  Vehicle.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });
  Vehicle.hasMany(models.StudentTransport, { foreignKey: 'vehicle_id', as: 'studentAssignments' });
  Vehicle.hasMany(models.TransportTrip, { foreignKey: 'vehicle_id', as: 'trips' });
  };

  return Vehicle;
};
