module.exports = (sequelize, DataTypes) => {
  const Guardian = sequelize.define(
    "Guardian",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "user_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    "relation_to_student": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "occupation": {
      type: DataTypes.STRING,
    },
    "emergency_contact": {
      type: DataTypes.STRING,
    },
    "address": {
      type: DataTypes.TEXT,
    },
    "national_id": {
      type: DataTypes.STRING,
    },
    "verified": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "guardians",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["user_id"], unique: true },
      ],
    }
  );

  Guardian.associate = (models) => {
  Guardian.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  Guardian.belongsToMany(models.Student, { through: models.StudentGuardian, foreignKey: 'guardian_id', otherKey: 'student_id', as: 'students' });
  Guardian.hasMany(models.Student, { foreignKey: 'guardian_id', as: 'primaryStudents' });
  };

  return Guardian;
};
