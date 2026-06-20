module.exports = (sequelize, DataTypes) => {
  const PayrollRecord = sequelize.define(
    "PayrollRecord",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "payroll_run_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "payroll_runs",
        key: "id",
      },
    },
    "staff_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "staff",
        key: "id",
      },
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
    "net_salary": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "payment_method": {
      type: DataTypes.ENUM("cash", "mobile_money", "bank", "card"),
      allowNull: false,
    },
    "payment_status": {
      type: DataTypes.ENUM("pending", "paid", "failed"),
      allowNull: false,
      defaultValue: "pending",
    },
    "payment_date": {
      type: DataTypes.DATEONLY,
    },
    },
    {
      tableName: "payroll_records",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["payroll_run_id", "staff_id"], unique: true },
      { fields: ["payroll_run_id"] },
      { fields: ["staff_id"] },
      ],
    }
  );

  PayrollRecord.associate = (models) => {
  PayrollRecord.belongsTo(models.PayrollRun, { foreignKey: 'payroll_run_id', as: 'payrollRun' });
  PayrollRecord.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });
  };

  return PayrollRecord;
};
