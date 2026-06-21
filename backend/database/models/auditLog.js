module.exports = (sequelize, DataTypes) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      action: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resource_type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      resource_id: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      old_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      new_values: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      ip_address: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'audit_logs',
      underscored: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
        { fields: ['user_id'] },
        { fields: ['resource_type'] },
        { fields: ['created_at'] },
      ],
    }
  );

  return AuditLog;
};
