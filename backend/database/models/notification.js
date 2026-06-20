module.exports = (sequelize, DataTypes) => {
  const Notification = sequelize.define(
    "Notification",
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
    "sender_id": {
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
    "body": {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    "type": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "target_roles": {
      type: DataTypes.ARRAY(DataTypes.ENUM("super_admin", "institution_admin", "teacher", "student", "parent", "driver", "accountant", "librarian")),
      allowNull: false,
      defaultValue: [],
    },
    "target_ids": {
      type: DataTypes.ARRAY(DataTypes.UUID),
    },
    "channels": {
      type: DataTypes.ARRAY(DataTypes.ENUM("sms", "email", "push", "whatsapp")),
      allowNull: false,
      defaultValue: [],
    },
    "scheduled_at": {
      type: DataTypes.DATE,
    },
    "sent_at": {
      type: DataTypes.DATE,
    },
    "status": {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "draft",
    },
    },
    {
      tableName: "notifications",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id"] },
      { fields: ["sender_id"] },
      ],
    }
  );

  Notification.associate = (models) => {
  Notification.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Notification.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
  };

  return Notification;
};
