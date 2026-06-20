module.exports = (sequelize, DataTypes) => {
  const FeeStructure = sequelize.define(
    "FeeStructure",
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
    "level_id": {
      type: DataTypes.UUID,
      references: {
        model: "education_levels",
        key: "id",
      },
    },
    "class_id": {
      type: DataTypes.UUID,
      references: {
        model: "classes",
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
    "term_id": {
      type: DataTypes.UUID,
      references: {
        model: "terms_semesters",
        key: "id",
      },
    },
    "fee_type": {
      type: DataTypes.ENUM("tuition", "transport", "hostel", "lunch", "activity", "uniform", "exam", "registration"),
      allowNull: false,
    },
    "amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "currency": {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "USD",
    },
    "due_date": {
      type: DataTypes.DATEONLY,
    },
    "installments_allowed": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "penalty_rate": {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
    },
    },
    {
      tableName: "fee_structures",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "academic_year_id"] },
      { fields: ["institution_id", "academic_year_id", "fee_type", "level_id", "class_id", "term_id"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["level_id"] },
      { fields: ["class_id"] },
      { fields: ["academic_year_id"] },
      { fields: ["term_id"] },
      ],
    }
  );

  FeeStructure.associate = (models) => {
  FeeStructure.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  FeeStructure.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });
  FeeStructure.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  FeeStructure.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  FeeStructure.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });
  };

  return FeeStructure;
};
