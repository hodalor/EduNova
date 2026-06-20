const { Sequelize, DataTypes } = require('sequelize');

const InstitutionFactory = require('./institution');
const InstitutionBranchFactory = require('./institutionBranch');
const AcademicYearFactory = require('./academicYear');
const TermSemesterFactory = require('./termSemester');
const EducationLevelFactory = require('./educationLevel');
const UserFactory = require('./user');
const GuardianFactory = require('./guardian');
const StaffFactory = require('./staff');
const ClassFactory = require('./class');
const SubjectFactory = require('./subject');
const ClassSubjectFactory = require('./classSubject');
const StudentFactory = require('./student');
const StudentGuardianFactory = require('./studentGuardian');
const StudentMedicalFactory = require('./studentMedical');
const FeeStructureFactory = require('./feeStructure');
const StudentInvoiceFactory = require('./studentInvoice');
const PaymentFactory = require('./payment');
const ExpenseCategoryFactory = require('./expenseCategory');
const ExpenseFactory = require('./expense');
const AttendanceSessionFactory = require('./attendanceSession');
const AttendanceRecordFactory = require('./attendanceRecord');
const StaffAttendanceFactory = require('./staffAttendance');
const AssessmentFactory = require('./assessment');
const AssessmentScoreFactory = require('./assessmentScore');
const GradeScaleFactory = require('./gradeScale');
const ReportCardFactory = require('./reportCard');
const NotificationFactory = require('./notification');
const MessageFactory = require('./message');
const AnnouncementFactory = require('./announcement');
const DisciplineIncidentFactory = require('./disciplineIncident');
const DemeritPointFactory = require('./demeritPoint');
const MeritPointFactory = require('./meritPoint');
const TransportRouteFactory = require('./transportRoute');
const VehicleFactory = require('./vehicle');
const RouteStopFactory = require('./routeStop');
const StudentTransportFactory = require('./studentTransport');
const TransportTripFactory = require('./transportTrip');
const TransportAttendanceFactory = require('./transportAttendance');
const HostelFactory = require('./hostel');
const HostelRoomFactory = require('./hostelRoom');
const HostelBedFactory = require('./hostelBed');
const HostelAllocationFactory = require('./hostelAllocation');
const HostelVisitorFactory = require('./hostelVisitor');
const HostelAttendanceFactory = require('./hostelAttendance');
const InventoryCategoryFactory = require('./inventoryCategory');
const InventoryItemFactory = require('./inventoryItem');
const StockMovementFactory = require('./stockMovement');
const PurchaseOrderFactory = require('./purchaseOrder');
const TimetablePeriodFactory = require('./timetablePeriod');
const TimetableFactory = require('./timetable');
const TimetableSlotFactory = require('./timetableSlot');
const SalaryGradeFactory = require('./salaryGrade');
const PayrollRunFactory = require('./payrollRun');
const PayrollRecordFactory = require('./payrollRecord');
const LeaveTypeFactory = require('./leaveType');
const LeaveRequestFactory = require('./leaveRequest');

let cached = null;

module.exports = (sequelize) => {
  if (cached) {
    return cached;
  }

  if (!(sequelize instanceof Sequelize)) {
    throw new Error('A Sequelize instance is required to initialize EDUOVA models.');
  }

  const models = {};

  models.Institution = InstitutionFactory(sequelize, DataTypes);
  models.InstitutionBranch = InstitutionBranchFactory(sequelize, DataTypes);
  models.AcademicYear = AcademicYearFactory(sequelize, DataTypes);
  models.TermSemester = TermSemesterFactory(sequelize, DataTypes);
  models.EducationLevel = EducationLevelFactory(sequelize, DataTypes);
  models.User = UserFactory(sequelize, DataTypes);
  models.Guardian = GuardianFactory(sequelize, DataTypes);
  models.Staff = StaffFactory(sequelize, DataTypes);
  models.Class = ClassFactory(sequelize, DataTypes);
  models.Subject = SubjectFactory(sequelize, DataTypes);
  models.ClassSubject = ClassSubjectFactory(sequelize, DataTypes);
  models.Student = StudentFactory(sequelize, DataTypes);
  models.StudentGuardian = StudentGuardianFactory(sequelize, DataTypes);
  models.StudentMedical = StudentMedicalFactory(sequelize, DataTypes);
  models.FeeStructure = FeeStructureFactory(sequelize, DataTypes);
  models.StudentInvoice = StudentInvoiceFactory(sequelize, DataTypes);
  models.Payment = PaymentFactory(sequelize, DataTypes);
  models.ExpenseCategory = ExpenseCategoryFactory(sequelize, DataTypes);
  models.Expense = ExpenseFactory(sequelize, DataTypes);
  models.AttendanceSession = AttendanceSessionFactory(sequelize, DataTypes);
  models.AttendanceRecord = AttendanceRecordFactory(sequelize, DataTypes);
  models.StaffAttendance = StaffAttendanceFactory(sequelize, DataTypes);
  models.Assessment = AssessmentFactory(sequelize, DataTypes);
  models.AssessmentScore = AssessmentScoreFactory(sequelize, DataTypes);
  models.GradeScale = GradeScaleFactory(sequelize, DataTypes);
  models.ReportCard = ReportCardFactory(sequelize, DataTypes);
  models.Notification = NotificationFactory(sequelize, DataTypes);
  models.Message = MessageFactory(sequelize, DataTypes);
  models.Announcement = AnnouncementFactory(sequelize, DataTypes);
  models.DisciplineIncident = DisciplineIncidentFactory(sequelize, DataTypes);
  models.DemeritPoint = DemeritPointFactory(sequelize, DataTypes);
  models.MeritPoint = MeritPointFactory(sequelize, DataTypes);
  models.TransportRoute = TransportRouteFactory(sequelize, DataTypes);
  models.Vehicle = VehicleFactory(sequelize, DataTypes);
  models.RouteStop = RouteStopFactory(sequelize, DataTypes);
  models.StudentTransport = StudentTransportFactory(sequelize, DataTypes);
  models.TransportTrip = TransportTripFactory(sequelize, DataTypes);
  models.TransportAttendance = TransportAttendanceFactory(sequelize, DataTypes);
  models.Hostel = HostelFactory(sequelize, DataTypes);
  models.HostelRoom = HostelRoomFactory(sequelize, DataTypes);
  models.HostelBed = HostelBedFactory(sequelize, DataTypes);
  models.HostelAllocation = HostelAllocationFactory(sequelize, DataTypes);
  models.HostelVisitor = HostelVisitorFactory(sequelize, DataTypes);
  models.HostelAttendance = HostelAttendanceFactory(sequelize, DataTypes);
  models.InventoryCategory = InventoryCategoryFactory(sequelize, DataTypes);
  models.InventoryItem = InventoryItemFactory(sequelize, DataTypes);
  models.StockMovement = StockMovementFactory(sequelize, DataTypes);
  models.PurchaseOrder = PurchaseOrderFactory(sequelize, DataTypes);
  models.TimetablePeriod = TimetablePeriodFactory(sequelize, DataTypes);
  models.Timetable = TimetableFactory(sequelize, DataTypes);
  models.TimetableSlot = TimetableSlotFactory(sequelize, DataTypes);
  models.SalaryGrade = SalaryGradeFactory(sequelize, DataTypes);
  models.PayrollRun = PayrollRunFactory(sequelize, DataTypes);
  models.PayrollRecord = PayrollRecordFactory(sequelize, DataTypes);
  models.LeaveType = LeaveTypeFactory(sequelize, DataTypes);
  models.LeaveRequest = LeaveRequestFactory(sequelize, DataTypes);
  if (models.Institution.associate) models.Institution.associate(models);
  if (models.InstitutionBranch.associate) models.InstitutionBranch.associate(models);
  if (models.AcademicYear.associate) models.AcademicYear.associate(models);
  if (models.TermSemester.associate) models.TermSemester.associate(models);
  if (models.EducationLevel.associate) models.EducationLevel.associate(models);
  if (models.User.associate) models.User.associate(models);
  if (models.Guardian.associate) models.Guardian.associate(models);
  if (models.Staff.associate) models.Staff.associate(models);
  if (models.Class.associate) models.Class.associate(models);
  if (models.Subject.associate) models.Subject.associate(models);
  if (models.ClassSubject.associate) models.ClassSubject.associate(models);
  if (models.Student.associate) models.Student.associate(models);
  if (models.StudentGuardian.associate) models.StudentGuardian.associate(models);
  if (models.StudentMedical.associate) models.StudentMedical.associate(models);
  if (models.FeeStructure.associate) models.FeeStructure.associate(models);
  if (models.StudentInvoice.associate) models.StudentInvoice.associate(models);
  if (models.Payment.associate) models.Payment.associate(models);
  if (models.ExpenseCategory.associate) models.ExpenseCategory.associate(models);
  if (models.Expense.associate) models.Expense.associate(models);
  if (models.AttendanceSession.associate) models.AttendanceSession.associate(models);
  if (models.AttendanceRecord.associate) models.AttendanceRecord.associate(models);
  if (models.StaffAttendance.associate) models.StaffAttendance.associate(models);
  if (models.Assessment.associate) models.Assessment.associate(models);
  if (models.AssessmentScore.associate) models.AssessmentScore.associate(models);
  if (models.GradeScale.associate) models.GradeScale.associate(models);
  if (models.ReportCard.associate) models.ReportCard.associate(models);
  if (models.Notification.associate) models.Notification.associate(models);
  if (models.Message.associate) models.Message.associate(models);
  if (models.Announcement.associate) models.Announcement.associate(models);
  if (models.DisciplineIncident.associate) models.DisciplineIncident.associate(models);
  if (models.DemeritPoint.associate) models.DemeritPoint.associate(models);
  if (models.MeritPoint.associate) models.MeritPoint.associate(models);
  if (models.TransportRoute.associate) models.TransportRoute.associate(models);
  if (models.Vehicle.associate) models.Vehicle.associate(models);
  if (models.RouteStop.associate) models.RouteStop.associate(models);
  if (models.StudentTransport.associate) models.StudentTransport.associate(models);
  if (models.TransportTrip.associate) models.TransportTrip.associate(models);
  if (models.TransportAttendance.associate) models.TransportAttendance.associate(models);
  if (models.Hostel.associate) models.Hostel.associate(models);
  if (models.HostelRoom.associate) models.HostelRoom.associate(models);
  if (models.HostelBed.associate) models.HostelBed.associate(models);
  if (models.HostelAllocation.associate) models.HostelAllocation.associate(models);
  if (models.HostelVisitor.associate) models.HostelVisitor.associate(models);
  if (models.HostelAttendance.associate) models.HostelAttendance.associate(models);
  if (models.InventoryCategory.associate) models.InventoryCategory.associate(models);
  if (models.InventoryItem.associate) models.InventoryItem.associate(models);
  if (models.StockMovement.associate) models.StockMovement.associate(models);
  if (models.PurchaseOrder.associate) models.PurchaseOrder.associate(models);
  if (models.TimetablePeriod.associate) models.TimetablePeriod.associate(models);
  if (models.Timetable.associate) models.Timetable.associate(models);
  if (models.TimetableSlot.associate) models.TimetableSlot.associate(models);
  if (models.SalaryGrade.associate) models.SalaryGrade.associate(models);
  if (models.PayrollRun.associate) models.PayrollRun.associate(models);
  if (models.PayrollRecord.associate) models.PayrollRecord.associate(models);
  if (models.LeaveType.associate) models.LeaveType.associate(models);
  if (models.LeaveRequest.associate) models.LeaveRequest.associate(models);

  cached = {
    sequelize,
    Sequelize,
      Institution: models.Institution,
      InstitutionBranch: models.InstitutionBranch,
      AcademicYear: models.AcademicYear,
      TermSemester: models.TermSemester,
      EducationLevel: models.EducationLevel,
      User: models.User,
      Guardian: models.Guardian,
      Staff: models.Staff,
      Class: models.Class,
      Subject: models.Subject,
      ClassSubject: models.ClassSubject,
      Student: models.Student,
      StudentGuardian: models.StudentGuardian,
      StudentMedical: models.StudentMedical,
      FeeStructure: models.FeeStructure,
      StudentInvoice: models.StudentInvoice,
      Payment: models.Payment,
      ExpenseCategory: models.ExpenseCategory,
      Expense: models.Expense,
      AttendanceSession: models.AttendanceSession,
      AttendanceRecord: models.AttendanceRecord,
      StaffAttendance: models.StaffAttendance,
      Assessment: models.Assessment,
      AssessmentScore: models.AssessmentScore,
      GradeScale: models.GradeScale,
      ReportCard: models.ReportCard,
      Notification: models.Notification,
      Message: models.Message,
      Announcement: models.Announcement,
      DisciplineIncident: models.DisciplineIncident,
      DemeritPoint: models.DemeritPoint,
      MeritPoint: models.MeritPoint,
      TransportRoute: models.TransportRoute,
      Vehicle: models.Vehicle,
      RouteStop: models.RouteStop,
      StudentTransport: models.StudentTransport,
      TransportTrip: models.TransportTrip,
      TransportAttendance: models.TransportAttendance,
      Hostel: models.Hostel,
      HostelRoom: models.HostelRoom,
      HostelBed: models.HostelBed,
      HostelAllocation: models.HostelAllocation,
      HostelVisitor: models.HostelVisitor,
      HostelAttendance: models.HostelAttendance,
      InventoryCategory: models.InventoryCategory,
      InventoryItem: models.InventoryItem,
      StockMovement: models.StockMovement,
      PurchaseOrder: models.PurchaseOrder,
      TimetablePeriod: models.TimetablePeriod,
      Timetable: models.Timetable,
      TimetableSlot: models.TimetableSlot,
      SalaryGrade: models.SalaryGrade,
      PayrollRun: models.PayrollRun,
      PayrollRecord: models.PayrollRecord,
      LeaveType: models.LeaveType,
      LeaveRequest: models.LeaveRequest,
  };

  return cached;
};
