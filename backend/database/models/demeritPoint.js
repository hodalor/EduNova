module.exports = (sequelize, DataTypes) => {
  const DemeritPoint = sequelize.define(
    "DemeritPoint",
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
    "incident_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "discipline_incidents",
        key: "id",
      },
    },
    "points": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    },
    {
      tableName: "demerit_points",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id"] },
      { fields: ["incident_id"] },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  DemeritPoint.associate = (models) => {
  DemeritPoint.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  DemeritPoint.belongsTo(models.DisciplineIncident, { foreignKey: 'incident_id', as: 'incident' });
  DemeritPoint.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  };

  return DemeritPoint;
};
