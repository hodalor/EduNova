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
      tableName: "inventory_categories",
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

  InventoryCategory.associate = (models) => {
  InventoryCategory.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  InventoryCategory.hasMany(models.InventoryItem, { foreignKey: 'category_id', as: 'items' });
  };

  return InventoryCategory;
};
