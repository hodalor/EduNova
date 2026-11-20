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
      { fields: ["grade_name"], unique: true },
      ],
    }
  );

  SalaryGrade.associate = (models) => {
  };

  return SalaryGrade;
};
