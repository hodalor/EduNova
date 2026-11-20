module.exports = (sequelize, DataTypes) => {
  const Institution = sequelize.define(
    "Institution",
    {
      id: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      logo_url: {
        type: DataTypes.TEXT,
      },
      address: {
        type: DataTypes.TEXT,
      },
      phone: {
        type: DataTypes.STRING,
      },
      email: {
        type: DataTypes.STRING,
      },
      website: {
        type: DataTypes.STRING,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      settings: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },
    },
    {
      tableName: "school_profile",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
    }
  );

  Institution.associate = () => {};

  return Institution;
};
