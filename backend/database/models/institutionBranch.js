module.exports = (sequelize, DataTypes) => {
  const InstitutionBranch = sequelize.define(
    "InstitutionBranch",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
        "branch_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "address": {
      type: DataTypes.TEXT,
    },
    "is_main_branch": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "institution_branches",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["branch_name"], unique: true },
      ],
    }
  );

  InstitutionBranch.associate = (models) => {
  };

  return InstitutionBranch;
};
