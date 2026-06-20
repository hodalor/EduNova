module.exports = (sequelize, DataTypes) => {
  const ClassSubject = sequelize.define(
    "ClassSubject",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "class_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "classes",
        key: "id",
      },
    },
    "subject_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "subjects",
        key: "id",
      },
    },
    "teacher_id": {
      type: DataTypes.UUID,
      references: {
        model: "staff",
        key: "id",
      },
    },
    "periods_per_week": {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    },
    {
      tableName: "class_subjects",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["class_id", "subject_id", "teacher_id"], unique: true },
      { fields: ["class_id"] },
      { fields: ["subject_id"] },
      { fields: ["teacher_id"] },
      ],
    }
  );

  ClassSubject.associate = (models) => {
  ClassSubject.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  ClassSubject.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
  ClassSubject.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
  };

  return ClassSubject;
};
