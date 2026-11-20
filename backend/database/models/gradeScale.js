module.exports = (sequelize, DataTypes) => {
  const GradeScale = sequelize.define(
    "GradeScale",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
        "level_id": {
      type: DataTypes.UUID,
      references: {
        model: "education_levels",
        key: "id",
      },
    },
    "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "min_score": {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    "max_score": {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
    },
    "grade": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "gpa_point": {
      type: DataTypes.DECIMAL(4, 2),
    },
    "remark": {
      type: DataTypes.STRING,
    },
    },
    {
      tableName: "grade_scales",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["level_id", "name", "grade"], unique: true },
      { fields: ["level_id"] },
      ],
    }
  );

  GradeScale.associate = (models) => {
  GradeScale.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });
  };

  return GradeScale;
};
