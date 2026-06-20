module.exports = (sequelize, DataTypes) => {
  const Message = sequelize.define(
    "Message",
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
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    "recipient_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    "thread_id": {
      type: DataTypes.UUID,
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
    "read_at": {
      type: DataTypes.DATE,
    },
    "is_deleted_by_sender": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "is_deleted_by_recipient": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "messages",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["thread_id"] },
      { fields: ["institution_id"] },
      { fields: ["sender_id"] },
      { fields: ["recipient_id"] },
      ],
    }
  );

  Message.associate = (models) => {
  Message.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });
  Message.belongsTo(models.User, { foreignKey: 'recipient_id', as: 'recipient' });
  };

  return Message;
};
