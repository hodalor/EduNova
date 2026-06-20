module.exports = (sequelize, DataTypes) => {
  const TimetableSlot = sequelize.define(
    "TimetableSlot",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "timetable_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "timetables",
        key: "id",
      },
    },
    "period_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "timetable_periods",
        key: "id",
      },
    },
    "day_of_week": {
      type: DataTypes.INTEGER,
      allowNull: false,
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
    "room": {
      type: DataTypes.STRING,
    },
    "is_free_period": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "timetable_slots",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["timetable_id", "period_id", "day_of_week"], unique: true },
      { fields: ["timetable_id"] },
      { fields: ["period_id"] },
      { fields: ["subject_id"] },
      { fields: ["teacher_id"] },
      ],
    }
  );

  TimetableSlot.associate = (models) => {
  TimetableSlot.belongsTo(models.Timetable, { foreignKey: 'timetable_id', as: 'timetable' });
  TimetableSlot.belongsTo(models.TimetablePeriod, { foreignKey: 'period_id', as: 'period' });
  TimetableSlot.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });
  TimetableSlot.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });
  };

  return TimetableSlot;
};
