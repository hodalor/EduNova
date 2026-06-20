module.exports = (sequelize, DataTypes) => {
  const StudentMedical = sequelize.define(
    "StudentMedical",
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
    "allergies": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "chronic_conditions": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "medications": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "doctor_name": {
      type: DataTypes.STRING,
    },
    "doctor_phone": {
      type: DataTypes.STRING,
    },
    "insurance_info": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    "blood_group": {
      type: DataTypes.STRING,
    },
    "vaccination_records": {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    "dietary_restrictions": {
      type: DataTypes.TEXT,
    },
    "special_needs": {
      type: DataTypes.TEXT,
    },
    },
    {
      tableName: "student_medical",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id"], unique: true },
      ],
    }
  );

  StudentMedical.associate = (models) => {
  StudentMedical.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  };

  return StudentMedical;
};
