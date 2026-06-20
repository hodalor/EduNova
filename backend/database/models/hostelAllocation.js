module.exports = (sequelize, DataTypes) => {
  const HostelAllocation = sequelize.define(
    "HostelAllocation",
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
    "bed_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hostel_beds",
        key: "id",
      },
    },
    "room_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hostel_rooms",
        key: "id",
      },
    },
    "hostel_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "hostels",
        key: "id",
      },
    },
    "academic_year_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "academic_years",
        key: "id",
      },
    },
    "check_in_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "check_out_date": {
      type: DataTypes.DATEONLY,
    },
    "status": {
      type: DataTypes.ENUM("active", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "active",
    },
    },
    {
      tableName: "hostel_allocations",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id", "academic_year_id"], unique: true },
      { fields: ["student_id"] },
      { fields: ["bed_id"] },
      { fields: ["room_id"] },
      { fields: ["hostel_id"] },
      { fields: ["academic_year_id"] },
      ],
    }
  );

  HostelAllocation.associate = (models) => {
  HostelAllocation.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  HostelAllocation.belongsTo(models.HostelBed, { foreignKey: 'bed_id', as: 'bed' });
  HostelAllocation.belongsTo(models.HostelRoom, { foreignKey: 'room_id', as: 'room' });
  HostelAllocation.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });
  HostelAllocation.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  };

  return HostelAllocation;
};
