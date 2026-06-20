module.exports = (sequelize, DataTypes) => {
  const EducationLevel = sequelize.define(
    "EducationLevel",
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
    "level_code": {
      type: DataTypes.ENUM("DC", "PR", "JH", "SH", "TR"),
      allowNull: false,
    },
    "level_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "age_min": {
      type: DataTypes.INTEGER,
    },
    "age_max": {
      type: DataTypes.INTEGER,
    },
    },
    {
      tableName: "education_levels",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "level_code"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  EducationLevel.associate = (models) => {
  EducationLevel.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  EducationLevel.hasMany(models.Class, { foreignKey: 'level_id', as: 'classes' });
  EducationLevel.hasMany(models.Subject, { foreignKey: 'level_id', as: 'subjects' });
  EducationLevel.hasMany(models.Student, { foreignKey: 'level_id', as: 'students' });
  EducationLevel.hasMany(models.FeeStructure, { foreignKey: 'level_id', as: 'feeStructures' });
  EducationLevel.hasMany(models.GradeScale, { foreignKey: 'level_id', as: 'gradeScales' });
  };

  return EducationLevel;
};
