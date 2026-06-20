module.exports = (sequelize, DataTypes) => {
  const AttendanceRecord = sequelize.define(
    "AttendanceRecord",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "session_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "attendance_sessions",
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
    "status": {
      type: DataTypes.ENUM("present", "absent", "late", "excused"),
      allowNull: false,
    },
    "marked_at": {
      type: DataTypes.DATE,
    },
    "marked_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    "notes": {
      type: DataTypes.TEXT,
    },
    "arrival_time": {
      type: DataTypes.TIME,
    },
    },
    {
      tableName: "attendance_records",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["session_id", "student_id"], unique: true },
      { fields: ["session_id"] },
      { fields: ["student_id"] },
      { fields: ["marked_by"] },
      ],
    }
  );

  AttendanceRecord.associate = (models) => {
  AttendanceRecord.belongsTo(models.AttendanceSession, { foreignKey: 'session_id', as: 'session' });
  AttendanceRecord.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  AttendanceRecord.belongsTo(models.User, { foreignKey: 'marked_by', as: 'markedBy' });
  };

  return AttendanceRecord;
};
