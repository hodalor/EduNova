module.exports = (sequelize, DataTypes) => {
  const Announcement = sequelize.define(
    "Announcement",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
        "created_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "title": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "content": {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    "attachments": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "target_levels": {
      type: DataTypes.ARRAY(DataTypes.ENUM("TR")),
      allowNull: false,
      defaultValue: [],
    },
    "target_classes": {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    },
    "publish_at": {
      type: DataTypes.DATE,
    },
    "expire_at": {
      type: DataTypes.DATE,
    },
    "is_published": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "announcements",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["created_by"] },
      ],
    }
  );

  Announcement.associate = (models) => {
  Announcement.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });
  };

  return Announcement;
};
