module.exports = (sequelize, DataTypes) => {
  const RouteStop = sequelize.define(
    "RouteStop",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "route_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "transport_routes",
        key: "id",
      },
    },
    "stop_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "latitude": {
      type: DataTypes.DECIMAL(10, 7),
    },
    "longitude": {
      type: DataTypes.DECIMAL(10, 7),
    },
    "stop_order": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "morning_time": {
      type: DataTypes.TIME,
    },
    "afternoon_time": {
      type: DataTypes.TIME,
    },
    },
    {
      tableName: "route_stops",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["route_id", "stop_order"], unique: true },
      { fields: ["route_id"] },
      ],
    }
  );

  RouteStop.associate = (models) => {
  RouteStop.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });
  RouteStop.hasMany(models.StudentTransport, { foreignKey: 'stop_id', as: 'studentAssignments' });
  };

  return RouteStop;
};
