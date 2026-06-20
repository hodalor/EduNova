module.exports = (sequelize, DataTypes) => {
  const DisciplineIncident = sequelize.define(
    "DisciplineIncident",
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
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    "reported_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "incident_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "category": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "severity": {
      type: DataTypes.ENUM("minor", "moderate", "major"),
      allowNull: false,
    },
    "description": {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    "action_taken": {
      type: DataTypes.TEXT,
    },
    "parent_notified": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "counseling_required": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "follow_up_date": {
      type: DataTypes.DATEONLY,
    },
    "status": {
      type: DataTypes.ENUM("open", "resolved"),
      allowNull: false,
      defaultValue: "open",
    },
    },
    {
      tableName: "discipline_incidents",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id"] },
      { fields: ["student_id"] },
      { fields: ["reported_by"] },
      ],
    }
  );

  DisciplineIncident.associate = (models) => {
  DisciplineIncident.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  DisciplineIncident.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  DisciplineIncident.belongsTo(models.User, { foreignKey: 'reported_by', as: 'reportedBy' });
  DisciplineIncident.hasMany(models.DemeritPoint, { foreignKey: 'incident_id', as: 'demeritPoints' });
  };

  return DisciplineIncident;
};
