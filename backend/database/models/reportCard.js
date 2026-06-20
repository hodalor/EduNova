module.exports = (sequelize, DataTypes) => {
  const ReportCard = sequelize.define(
    "ReportCard",
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
    "term_id": {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "terms_semesters",
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
    "class_id": {
      type: DataTypes.UUID,
      references: {
        model: "classes",
        key: "id",
      },
    },
    "overall_average": {
      type: DataTypes.DECIMAL(5, 2),
    },
    "overall_grade": {
      type: DataTypes.STRING,
    },
    "position_in_class": {
      type: DataTypes.INTEGER,
    },
    "teacher_remark": {
      type: DataTypes.TEXT,
    },
    "head_remark": {
      type: DataTypes.TEXT,
    },
    "is_published": {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    "published_at": {
      type: DataTypes.DATE,
    },
    },
    {
      tableName: "report_cards",
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
      { fields: ["student_id", "term_id", "academic_year_id"], unique: true },
      { fields: ["student_id"] },
      { fields: ["term_id"] },
      { fields: ["academic_year_id"] },
      { fields: ["class_id"] },
      ],
    }
  );

  ReportCard.associate = (models) => {
  ReportCard.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });
  ReportCard.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });
  ReportCard.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
  ReportCard.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  };

  return ReportCard;
};
