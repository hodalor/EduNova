module.exports = (sequelize, DataTypes) => {
  const PurchaseOrder = sequelize.define(
    "PurchaseOrder",
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
    "supplier_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "supplier_contact": {
      type: DataTypes.STRING,
    },
    "items": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "total_amount": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
    },
    "status": {
      type: DataTypes.ENUM("draft", "approved", "received", "cancelled"),
      allowNull: false,
      defaultValue: "draft",
    },
    "ordered_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "ordered_at": {
      type: DataTypes.DATE,
    },
    },
    {
      tableName: "purchase_orders",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id"] },
      { fields: ["ordered_by"] },
      ],
    }
  );

  PurchaseOrder.associate = (models) => {
  PurchaseOrder.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  PurchaseOrder.belongsTo(models.User, { foreignKey: 'ordered_by', as: 'orderedBy' });
  };

  return PurchaseOrder;
};
