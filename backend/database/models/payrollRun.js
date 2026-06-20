module.exports = (sequelize, DataTypes) => {
  const PayrollRun = sequelize.define(
    "PayrollRun",
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
    "month": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "year": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "status": {
      type: DataTypes.ENUM("draft", "processing", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "draft",
    },
    "processed_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "processed_at": {
      type: DataTypes.DATE,
    },
    },
    {
      tableName: "payroll_runs",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "month", "year"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["processed_by"] },
      ],
    }
  );

  PayrollRun.associate = (models) => {
  PayrollRun.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  PayrollRun.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processedBy' });
  PayrollRun.hasMany(models.PayrollRecord, { foreignKey: 'payroll_run_id', as: 'records' });
  };

  return PayrollRun;
};
