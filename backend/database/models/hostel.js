module.exports = (sequelize, DataTypes) => {
  const Hostel = sequelize.define(
    "Hostel",
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
    "gender": {
      type: DataTypes.ENUM("male", "female", "mixed"),
      allowNull: false,
    },
    "warden_id": {
      type: DataTypes.UUID,
      references: {
        model: "staff",
        key: "id",
      },
    },
    "capacity": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    },
    {
      tableName: "hostels",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["institution_id", "name"], unique: true },
      { fields: ["institution_id"] },
      { fields: ["warden_id"] },
      ],
    }
  );

  Hostel.associate = (models) => {
  Hostel.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });
  Hostel.belongsTo(models.Staff, { foreignKey: 'warden_id', as: 'warden' });
  Hostel.hasMany(models.HostelRoom, { foreignKey: 'hostel_id', as: 'rooms' });
  Hostel.hasMany(models.HostelAllocation, { foreignKey: 'hostel_id', as: 'allocations' });
  Hostel.hasMany(models.HostelVisitor, { foreignKey: 'hostel_id', as: 'visitors' });
  Hostel.hasMany(models.HostelAttendance, { foreignKey: 'hostel_id', as: 'attendanceRecords' });
  };

  return Hostel;
};
