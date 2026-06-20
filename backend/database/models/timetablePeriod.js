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
    "institution_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "institutions",
        key: "id",
      },
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
      { fields: ["institution_id", "name"], unique: true },
      { fields: ["institution_id"] },
      ],
    }
  );

  TimetablePeriod.associate = (models) => {
  TimetablePeriod.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  TimetablePeriod.hasMany(models.TimetableSlot, { foreignKey: 'period_id', as: 'slots' });
  };

  return TimetablePeriod;
};
