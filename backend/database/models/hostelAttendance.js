module.exports = (sequelize, DataTypes) => {
  const HostelAttendance = sequelize.define(
    "HostelAttendance",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "hostel_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hostels",
        key: "id",
      },
    },
    "student_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "students",
        key: "id",
      },
    },
    "date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "session": {
      type: DataTypes.ENUM("morning", "evening", "night"),
      allowNull: false,
    },
    "status": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    },
    {
      tableName: "hostel_attendance",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["hostel_id", "student_id", "date", "session"], unique: true },
      { fields: ["hostel_id"] },
      { fields: ["student_id"] },
      ],
    }
  );

  HostelAttendance.associate = (models) => {
  HostelAttendance.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });
  HostelAttendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  };

  return HostelAttendance;
};
