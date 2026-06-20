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
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
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
      { fields: ["institution_id", "name"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  ExpenseCategory.associate = (models) => {
  ExpenseCategory.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  ExpenseCategory.hasMany(models.Expense, { foreignKey: 'category_id', as: 'expenses' });
  };

  return ExpenseCategory;
};
