module.exports = (sequelize, DataTypes) => {
  const Expense = sequelize.define(
    "Expense",
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
    "category_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "expense_categories",
        key: "id",
      },
    },
    "amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "description": {
      type: DataTypes.TEXT,
    },
    "paid_to": {
      type: DataTypes.STRING,
    },
    "payment_method": {
      type: DataTypes.ENUM("cash", "mobile_money", "bank", "card"),
      allowNull: false,
    },
    "receipt_url": {
      type: DataTypes.TEXT,
    },
    "expense_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "approved_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "status": {
      type: DataTypes.ENUM("pending", "approved", "rejected", "paid"),
      allowNull: false,
      defaultValue: "pending",
    },
    },
    {
      tableName: "expenses",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id"] },
      { fields: ["category_id"] },
      { fields: ["approved_by"] },
      ],
    }
  );

  Expense.associate = (models) => {
  Expense.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Expense.belongsTo(models.ExpenseCategory, { foreignKey: 'category_id', as: 'category' });
  Expense.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });
  };

  return Expense;
};
