module.exports = (sequelize, DataTypes) => {
  const ExpenseCategory = sequelize.define(
    "ExpenseCategory",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
        "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "description": {
      type: DataTypes.TEXT,
    },
    },
    {
      tableName: "expense_categories",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["name"], unique: true },
      ],
    }
  );

  ExpenseCategory.associate = (models) => {
  ExpenseCategory.hasMany(models.Expense, { foreignKey: 'category_id', as: 'expenses' });
  };

  return ExpenseCategory;
};
