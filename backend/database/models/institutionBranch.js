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
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
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
      { fields: ["institution_id", "branch_name"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  InstitutionBranch.associate = (models) => {
  InstitutionBranch.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  };

  return InstitutionBranch;
};
