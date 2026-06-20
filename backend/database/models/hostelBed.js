module.exports = (sequelize, DataTypes) => {
  const HostelBed = sequelize.define(
    "HostelBed",
    {
    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    "room_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hostel_rooms",
        key: "id",
      },
    },
    "bed_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "status": {
      type: DataTypes.ENUM("available", "occupied", "maintenance"),
      allowNull: false,
      defaultValue: "available",
    },
    },
    {
      tableName: "hostel_beds",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["room_id", "bed_number"], unique: true },
      { fields: ["room_id"] },
      ],
    }
  );

  HostelBed.associate = (models) => {
  HostelBed.belongsTo(models.HostelRoom, { foreignKey: 'room_id', as: 'room' });
  HostelBed.hasMany(models.HostelAllocation, { foreignKey: 'bed_id', as: 'allocations' });
  };

  return HostelBed;
};
