module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define(
    "Payment",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "invoice_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "student_invoices",
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
    "amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "payment_method": {
      type: DataTypes.ENUM("cash", "mobile_money", "bank", "card"),
      allowNull: false,
    },
    "transaction_ref": {
      type: DataTypes.STRING,
    },
    "receipt_number": {
      type: DataTypes.STRING,
    },
    "paid_at": {
      type: DataTypes.DATE,
      allowNull: false,
    },
    "received_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "notes": {
      type: DataTypes.TEXT,
    },
    "is_verified": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "payments",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["invoice_id"] },
      { fields: ["student_id"] },
      { fields: ["receipt_number"], unique: true },
      { fields: ["transaction_ref"], unique: true },
      { fields: ["received_by"] },
      ],
    }
  );

  Payment.associate = (models) => {
  Payment.belongsTo(models.StudentInvoice, { foreignKey: 'invoice_id', as: 'invoice' });
  Payment.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  Payment.belongsTo(models.User, { foreignKey: 'received_by', as: 'receivedBy' });
  };

  return Payment;
};
