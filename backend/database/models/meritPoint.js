module.exports = (sequelize, DataTypes) => {
  const MeritPoint = sequelize.define(
    "MeritPoint",
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
    "reason": {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    "points": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "awarded_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
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
    },
    {
      tableName: "merit_points",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id"] },
      { fields: ["awarded_by"] },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  MeritPoint.associate = (models) => {
  MeritPoint.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  MeritPoint.belongsTo(models.User, { foreignKey: 'awarded_by', as: 'awardedBy' });
  MeritPoint.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  };

  return MeritPoint;
};
