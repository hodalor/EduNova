module.exports = (sequelize, DataTypes) => {
  const PaymentTerm = sequelize.define(
    "PaymentTerm",
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
    "code": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "description": {
      type: DataTypes.TEXT,
    },
    "due_days": {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    "is_active": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    "installment_count": {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    "installment_percentages": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [100],
    },
    },
    {
      tableName: "payment_terms",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id"] },
      { fields: ["institution_id", "code"], unique: true },
      { fields: ["is_active"] },
      ],
    }
  );

  PaymentTerm.associate = (models) => {
  PaymentTerm.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  };

  return PaymentTerm;
};
