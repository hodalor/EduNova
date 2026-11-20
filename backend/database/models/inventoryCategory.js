module.exports = (sequelize, DataTypes) => {
  const InventoryCategory = sequelize.define(
    "InventoryCategory",
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
      tableName: "inventory_categories",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["name"], unique: true },
      ],
    }
  );

  InventoryCategory.associate = (models) => {
  InventoryCategory.hasMany(models.InventoryItem, { foreignKey: 'category_id', as: 'items' });
  };

  return InventoryCategory;
};
