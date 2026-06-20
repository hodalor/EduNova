module.exports = (sequelize, DataTypes) => {
  const SalaryGrade = sequelize.define(
    "SalaryGrade",
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
    "grade_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "basic_salary": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "allowances": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    "deductions": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    },
    {
      tableName: "salary_grades",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "grade_name"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  SalaryGrade.associate = (models) => {
  SalaryGrade.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  };

  return SalaryGrade;
};
