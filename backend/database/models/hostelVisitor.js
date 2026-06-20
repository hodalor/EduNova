module.exports = (sequelize, DataTypes) => {
  const HostelVisitor = sequelize.define(
    "HostelVisitor",
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
    "visitor_name": {
      type: DataTypes.STRING,
      allowNull: false,
    },
    "visitor_phone": {
      type: DataTypes.STRING,
    },
    "relationship": {
      type: DataTypes.STRING,
    },
    "visit_date": {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    "check_in_time": {
      type: DataTypes.TIME,
    },
    "check_out_time": {
      type: DataTypes.TIME,
    },
    "approved_by": {
      type: DataTypes.UUID,
      references: {
        model: "users",
        key: "id",
      },
    },
    },
    {
      tableName: "hostel_visitors",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["hostel_id"] },
      { fields: ["student_id"] },
      { fields: ["approved_by"] },
      ],
    }
  );

  HostelVisitor.associate = (models) => {
  HostelVisitor.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });
  HostelVisitor.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  HostelVisitor.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });
  };

  return HostelVisitor;
};
