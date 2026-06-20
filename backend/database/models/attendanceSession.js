module.exports = (sequelize, DataTypes) => {
  const AttendanceSession = sequelize.define(
    "AttendanceSession",
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
    "date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "session_type": {
      type: DataTypes.ENUM("morning", "afternoon", "subject"),
      allowNull: false,
    },
    "status": {
      type: DataTypes.ENUM("open", "closed"),
      allowNull: false,
      defaultValue: "open",
    },
    },
    {
      tableName: "attendance_sessions",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["class_id", "date", "session_type", "subject_id"], unique: true },
      { fields: ["class_id"] },
      { fields: ["subject_id"] },
      { fields: ["teacher_id"] },
      ],
    }
  );

  AttendanceSession.associate = (models) => {
  AttendanceSession.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  AttendanceSession.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
  AttendanceSession.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
  AttendanceSession.hasMany(models.AttendanceRecord, { foreignKey: 'session_id', as: 'attendanceRecords' });
  };

  return AttendanceSession;
};
