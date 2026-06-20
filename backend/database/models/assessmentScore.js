module.exports = (sequelize, DataTypes) => {
  const AssessmentScore = sequelize.define(
    "AssessmentScore",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "assessment_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "assessments",
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
    "score": {
      type: DataTypes.DECIMAL(8, 2),
    },
    "grade": {
      type: DataTypes.STRING,
    },
    "remarks": {
      type: DataTypes.TEXT,
    },
    "submitted_at": {
      type: DataTypes.DATE,
    },
    "marked_at": {
      type: DataTypes.DATE,
    },
    "is_absent": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "assessment_scores",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["assessment_id", "student_id"], unique: true },
      { fields: ["assessment_id"] },
      { fields: ["student_id"] },
      ],
    }
  );

  AssessmentScore.associate = (models) => {
  AssessmentScore.belongsTo(models.Assessment, { foreignKey: 'assessment_id', as: 'assessment' });
  AssessmentScore.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  };

  return AssessmentScore;
};
