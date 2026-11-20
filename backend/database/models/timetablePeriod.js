module.exports = (sequelize, DataTypes) => {
  const TimetablePeriod = sequelize.define(
    "TimetablePeriod",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
        "name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "start_time": {
      type: DataTypes.TIME,
      allowNull: false,
    },
    "end_time": {
      type: DataTypes.TIME,
      allowNull: false,
    },
    "is_break": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    },
    {
      tableName: "timetable_periods",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["name"], unique: true },
      ],
    }
  );

  TimetablePeriod.associate = (models) => {
  TimetablePeriod.hasMany(models.TimetableSlot, { foreignKey: 'period_id', as: 'slots' });
  };

  return TimetablePeriod;
};
