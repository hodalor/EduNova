module.exports = (sequelize, DataTypes) => {
  const Assessment = sequelize.define(
    "Assessment",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "class_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "classes",
        key: "id",
      },
    },
    "subject_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },
    "teacher_id": {
      type: DataTypes.UUID,
      references: {
        model: "staff",
        key: "id",
      },
    },
    "term_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "terms_semesters",
        key: "id",
      },
    },
    "title": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "assessment_type": {
      type: DataTypes.ENUM("quiz", "test", "exam", "assignment", "project", "cat", "midterm", "final"),
      allowNull: false,
    },
    "max_score": {
      type: DataTypes.DECIMAL(8, 2),
      allowNull: false,
    },
    "weight_percentage": {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    "date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "instructions": {
      type: DataTypes.TEXT,
    },
    },
    {
      tableName: "assessments",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["class_id", "subject_id", "term_id", "title"] },
      { fields: ["class_id"] },
      { fields: ["subject_id"] },
      { fields: ["teacher_id"] },
      { fields: ["term_id"] },
      ],
    }
  );

  Assessment.associate = (models) => {
  Assessment.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  Assessment.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
  Assessment.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
  Assessment.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });
  Assessment.hasMany(models.AssessmentScore, { foreignKey: 'assessment_id', as: 'assessmentScores' });
  };

  return Assessment;
};
