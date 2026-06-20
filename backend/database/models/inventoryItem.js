module.exports = (sequelize, DataTypes) => {
  const InventoryItem = sequelize.define(
    "InventoryItem",
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
        model: "inventory_categories",
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
    "unit": {
      type: DataTypes.STRING,
    },
    "barcode": {
      type: DataTypes.STRING,
    },
    "current_stock": {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    "min_stock_level": {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    "unit_cost": {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    "location": {
      type: DataTypes.STRING,
    },
    "status": {
      type: DataTypes.ENUM("active", "inactive", "discontinued"),
      allowNull: false,
      defaultValue: "active",
    },
    },
    {
      tableName: "inventory_items",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "barcode"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["category_id"] },
      ],
    }
  );

  InventoryItem.associate = (models) => {
  InventoryItem.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  InventoryItem.belongsTo(models.InventoryCategory, { foreignKey: 'category_id', as: 'category' });
  InventoryItem.hasMany(models.StockMovement, { foreignKey: 'item_id', as: 'stockMovements' });
  };

  return InventoryItem;
};
