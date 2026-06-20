module.exports = (sequelize, DataTypes) => {
  const StudentGuardian = sequelize.define(
    "StudentGuardian",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    "guardian_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "guardians",
        key: "id",
      },
    },
    "is_primary_guardian": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "student_guardians",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id", "guardian_id"], unique: true },
      { fields: ["student_id"] },
      { fields: ["guardian_id"] },
      ],
    }
  );

  StudentGuardian.associate = (models) => {
  StudentGuardian.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  StudentGuardian.belongsTo(models.Guardian, { foreignKey: 'guardian_id', as: 'guardian' });
  };

  return StudentGuardian;
};
