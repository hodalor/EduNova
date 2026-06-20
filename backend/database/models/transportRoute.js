module.exports = (sequelize, DataTypes) => {
  const TransportRoute = sequelize.define(
    "TransportRoute",
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
    "description": {
      type: DataTypes.TEXT,
    },
    "monthly_fee": {
      type: DataTypes.DECIMAL(12, 2),
    },
    },
    {
      tableName: "transport_routes",
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

  TransportRoute.associate = (models) => {
  TransportRoute.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  TransportRoute.hasMany(models.RouteStop, { foreignKey: 'route_id', as: 'stops' });
  TransportRoute.hasMany(models.Vehicle, { foreignKey: 'route_id', as: 'vehicles' });
  TransportRoute.hasMany(models.StudentTransport, { foreignKey: 'route_id', as: 'studentTransportAssignments' });
  TransportRoute.hasMany(models.TransportTrip, { foreignKey: 'route_id', as: 'trips' });
  };

  return TransportRoute;
};
