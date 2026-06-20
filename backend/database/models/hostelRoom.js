module.exports = (sequelize, DataTypes) => {
  const HostelRoom = sequelize.define(
    "HostelRoom",
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
    "room_number": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "floor": {
      type: DataTypes.STRING,
    },
    "capacity": {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    "room_type": {
      type: DataTypes.ENUM("dormitory", "private", "shared"),
      allowNull: false,
    },
    },
    {
      tableName: "hostel_rooms",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["hostel_id", "room_number"], unique: true },
      { fields: ["hostel_id"] },
      ],
    }
  );

  HostelRoom.associate = (models) => {
  HostelRoom.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });
  HostelRoom.hasMany(models.HostelBed, { foreignKey: 'room_id', as: 'beds' });
  HostelRoom.hasMany(models.HostelAllocation, { foreignKey: 'room_id', as: 'allocations' });
  };

  return HostelRoom;
};
