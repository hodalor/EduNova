module.exports = (sequelize, DataTypes) => {
  const StockMovement = sequelize.define(
    "StockMovement",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "item_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "inventory_items",
        key: "id",
      },
    },
    "movement_type": {
      type: DataTypes.ENUM("in", "out", "adjustment", "damage"),
      allowNull: false,
    },
    "quantity": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "previous_stock": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "new_stock": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "reference": {
      type: DataTypes.STRING,
    },
    "moved_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "moved_at": {
      type: DataTypes.DATE,
      allowNull: false,
    },
    "notes": {
      type: DataTypes.TEXT,
    },
    },
    {
      tableName: "stock_movements",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["item_id"] },
      { fields: ["moved_by"] },
      ],
    }
  );

  StockMovement.associate = (models) => {
  StockMovement.belongsTo(models.InventoryItem, { foreignKey: 'item_id', as: 'item' });
  StockMovement.belongsTo(models.User, { foreignKey: 'moved_by', as: 'movedBy' });
  };

  return StockMovement;
};
