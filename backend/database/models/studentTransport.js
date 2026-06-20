module.exports = (sequelize, DataTypes) => {
  const StudentTransport = sequelize.define(
    "StudentTransport",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
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
    "stop_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "route_stops",
        key: "id",
      },
    },
    "vehicle_id": {
      type: DataTypes.UUID,
      references: {
        model: "vehicles",
        key: "id",
      },
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    "pickup_type": {
      type: DataTypes.ENUM("morning", "afternoon", "both"),
      allowNull: false,
    },
    "status": {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "active",
    },
    },
    {
      tableName: "student_transport",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id", "academic_year_id"], unique: true },
      { fields: ["student_id"] },
      { fields: ["route_id"] },
      { fields: ["stop_id"] },
      { fields: ["vehicle_id"] },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  StudentTransport.associate = (models) => {
  StudentTransport.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  StudentTransport.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });
  StudentTransport.belongsTo(models.RouteStop, { foreignKey: 'stop_id', as: 'stop' });
  StudentTransport.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });
  StudentTransport.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  };

  return StudentTransport;
};
