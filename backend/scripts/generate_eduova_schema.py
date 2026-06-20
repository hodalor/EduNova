from pathlib import Path
import json


ROOT = Path("/Users/macbook/Documents/projects/ReactJS/EduNOVA/backend")


def enum(*values):
    return {"kind": "enum", "values": list(values)}


def arr(inner):
    return {"kind": "array", "of": inner}


def dec(precision, scale):
    return {"kind": "decimal", "precision": precision, "scale": scale}


def col(type_spec, **kwargs):
    data = {"type": type_spec}
    data.update(kwargs)
    return data


def fk(table, key="id", on_delete="CASCADE", on_update="CASCADE"):
    return {
        "model": table,
        "key": key,
        "onDelete": on_delete,
        "onUpdate": on_update,
    }


def lower_camel(name):
    return name[0].lower() + name[1:]


ROLE_ENUM = enum(
    "super_admin",
    "institution_admin",
    "teacher",
    "student",
    "parent",
    "driver",
    "accountant",
    "librarian",
)

LEVEL_CODE_ENUM = enum("DC", "PR", "JH", "SH", "TR")
TERM_TYPE_ENUM = enum("term", "semester")
SUBJECT_TYPE_ENUM = enum("core", "elective", "compulsory")
STUDENT_STATUS_ENUM = enum("active", "suspended", "graduated", "withdrawn")
EMPLOYMENT_TYPE_ENUM = enum("full_time", "part_time", "contract")
FEE_TYPE_ENUM = enum(
    "tuition",
    "transport",
    "hostel",
    "lunch",
    "activity",
    "uniform",
    "exam",
    "registration",
)
INVOICE_STATUS_ENUM = enum("pending", "partial", "paid", "overdue")
PAYMENT_METHOD_ENUM = enum("cash", "mobile_money", "bank", "card")
ATTENDANCE_SESSION_TYPE_ENUM = enum("morning", "afternoon", "subject")
OPEN_CLOSE_STATUS_ENUM = enum("open", "closed")
ATTENDANCE_RECORD_STATUS_ENUM = enum("present", "absent", "late", "excused")
ASSESSMENT_TYPE_ENUM = enum(
    "quiz",
    "test",
    "exam",
    "assignment",
    "project",
    "cat",
    "midterm",
    "final",
)
CHANNEL_ENUM = enum("sms", "email", "push", "whatsapp")
DISCIPLINE_SEVERITY_ENUM = enum("minor", "moderate", "major")
RESOLUTION_STATUS_ENUM = enum("open", "resolved")
VEHICLE_TYPE_ENUM = enum("bus", "van", "car")
PICKUP_TYPE_ENUM = enum("morning", "afternoon", "both")
TRIP_TYPE_ENUM = enum("morning", "afternoon")
TRIP_STATUS_ENUM = enum("pending", "in_progress", "completed", "cancelled")
TRANSPORT_ATTENDANCE_STATUS_ENUM = enum("boarded", "absent", "dropped_off")
HOSTEL_GENDER_ENUM = enum("male", "female", "mixed")
ROOM_TYPE_ENUM = enum("dormitory", "private", "shared")
BED_STATUS_ENUM = enum("available", "occupied", "maintenance")
HOSTEL_ALLOCATION_STATUS_ENUM = enum("active", "completed", "cancelled")
HOSTEL_SESSION_ENUM = enum("morning", "evening", "night")
INVENTORY_STATUS_ENUM = enum("active", "inactive", "discontinued")
STOCK_MOVEMENT_ENUM = enum("in", "out", "adjustment", "damage")
PURCHASE_ORDER_STATUS_ENUM = enum("draft", "approved", "received", "cancelled")
PAYROLL_STATUS_ENUM = enum("draft", "processing", "completed", "cancelled")
PAYMENT_STATUS_ENUM = enum("pending", "paid", "failed")
REQUEST_STATUS_ENUM = enum("pending", "approved", "rejected")
EXPENSE_STATUS_ENUM = enum("pending", "approved", "rejected", "paid")
GENDER_ENUM = enum("male", "female", "other")


TABLES = [
    {
        "table": "institutions",
        "model": "Institution",
        "file": "institution.js",
        "group": "20260619010100-core-tenancy-and-academics.js",
        "columns": {
            "name": col("STRING", allowNull=False),
            "code": col("STRING", allowNull=False, unique=True),
            "education_levels": col(arr(LEVEL_CODE_ENUM), allowNull=False, default=[]),
            "logo_url": col("TEXT"),
            "address": col("TEXT"),
            "phone": col("STRING"),
            "email": col("STRING"),
            "website": col("STRING"),
            "subscription_plan": col("STRING"),
            "is_active": col("BOOLEAN", allowNull=False, default=True),
            "settings": col("JSONB", allowNull=False, default={}),
        },
        "indexes": [{"fields": ["code"], "unique": True}],
        "associations": [
            "Institution.hasMany(models.InstitutionBranch, { foreignKey: 'institution_id', as: 'branches' });",
            "Institution.hasMany(models.AcademicYear, { foreignKey: 'institution_id', as: 'academicYears' });",
            "Institution.hasMany(models.EducationLevel, { foreignKey: 'institution_id', as: 'educationLevelRecords' });",
            "Institution.hasMany(models.Class, { foreignKey: 'institution_id', as: 'classes' });",
            "Institution.hasMany(models.Subject, { foreignKey: 'institution_id', as: 'subjects' });",
            "Institution.hasMany(models.User, { foreignKey: 'institution_id', as: 'users' });",
            "Institution.hasMany(models.Student, { foreignKey: 'institution_id', as: 'students' });",
            "Institution.hasMany(models.Staff, { foreignKey: 'institution_id', as: 'staffMembers' });",
            "Institution.hasMany(models.FeeStructure, { foreignKey: 'institution_id', as: 'feeStructures' });",
            "Institution.hasMany(models.StudentInvoice, { foreignKey: 'institution_id', as: 'studentInvoices' });",
            "Institution.hasMany(models.ExpenseCategory, { foreignKey: 'institution_id', as: 'expenseCategories' });",
            "Institution.hasMany(models.Expense, { foreignKey: 'institution_id', as: 'expenses' });",
            "Institution.hasMany(models.GradeScale, { foreignKey: 'institution_id', as: 'gradeScales' });",
            "Institution.hasMany(models.Notification, { foreignKey: 'institution_id', as: 'notifications' });",
            "Institution.hasMany(models.Message, { foreignKey: 'institution_id', as: 'messages' });",
            "Institution.hasMany(models.Announcement, { foreignKey: 'institution_id', as: 'announcements' });",
            "Institution.hasMany(models.DisciplineIncident, { foreignKey: 'institution_id', as: 'disciplineIncidents' });",
            "Institution.hasMany(models.Vehicle, { foreignKey: 'institution_id', as: 'vehicles' });",
            "Institution.hasMany(models.TransportRoute, { foreignKey: 'institution_id', as: 'transportRoutes' });",
            "Institution.hasMany(models.Hostel, { foreignKey: 'institution_id', as: 'hostels' });",
            "Institution.hasMany(models.InventoryCategory, { foreignKey: 'institution_id', as: 'inventoryCategories' });",
            "Institution.hasMany(models.InventoryItem, { foreignKey: 'institution_id', as: 'inventoryItems' });",
            "Institution.hasMany(models.PurchaseOrder, { foreignKey: 'institution_id', as: 'purchaseOrders' });",
            "Institution.hasMany(models.TimetablePeriod, { foreignKey: 'institution_id', as: 'timetablePeriods' });",
            "Institution.hasMany(models.Timetable, { foreignKey: 'institution_id', as: 'timetables' });",
            "Institution.hasMany(models.SalaryGrade, { foreignKey: 'institution_id', as: 'salaryGrades' });",
            "Institution.hasMany(models.PayrollRun, { foreignKey: 'institution_id', as: 'payrollRuns' });",
            "Institution.hasMany(models.LeaveType, { foreignKey: 'institution_id', as: 'leaveTypes' });",
        ],
    },
    {
        "table": "institution_branches",
        "model": "InstitutionBranch",
        "file": "institutionBranch.js",
        "group": "20260619010100-core-tenancy-and-academics.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "branch_name": col("STRING", allowNull=False),
            "address": col("TEXT"),
            "is_main_branch": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["institution_id", "branch_name"], "unique": True}],
        "associations": [
            "InstitutionBranch.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
        ],
    },
    {
        "table": "academic_years",
        "model": "AcademicYear",
        "file": "academicYear.js",
        "group": "20260619010100-core-tenancy-and-academics.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "start_date": col("DATEONLY", allowNull=False),
            "end_date": col("DATEONLY", allowNull=False),
            "is_current": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "AcademicYear.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "AcademicYear.hasMany(models.TermSemester, { foreignKey: 'academic_year_id', as: 'termsSemesters' });",
            "AcademicYear.hasMany(models.Class, { foreignKey: 'academic_year_id', as: 'classes' });",
            "AcademicYear.hasMany(models.FeeStructure, { foreignKey: 'academic_year_id', as: 'feeStructures' });",
            "AcademicYear.hasMany(models.StudentInvoice, { foreignKey: 'academic_year_id', as: 'studentInvoices' });",
            "AcademicYear.hasMany(models.ReportCard, { foreignKey: 'academic_year_id', as: 'reportCards' });",
            "AcademicYear.hasMany(models.DemeritPoint, { foreignKey: 'academic_year_id', as: 'demeritPoints' });",
            "AcademicYear.hasMany(models.MeritPoint, { foreignKey: 'academic_year_id', as: 'meritPoints' });",
            "AcademicYear.hasMany(models.StudentTransport, { foreignKey: 'academic_year_id', as: 'studentTransportRecords' });",
            "AcademicYear.hasMany(models.HostelAllocation, { foreignKey: 'academic_year_id', as: 'hostelAllocations' });",
            "AcademicYear.hasMany(models.Timetable, { foreignKey: 'academic_year_id', as: 'timetables' });",
        ],
    },
    {
        "table": "terms_semesters",
        "model": "TermSemester",
        "file": "termSemester.js",
        "group": "20260619010100-core-tenancy-and-academics.js",
        "columns": {
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "name": col("STRING", allowNull=False),
            "type": col(TERM_TYPE_ENUM, allowNull=False),
            "start_date": col("DATEONLY", allowNull=False),
            "end_date": col("DATEONLY", allowNull=False),
            "is_current": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["academic_year_id", "name", "type"], "unique": True}],
        "associations": [
            "TermSemester.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "TermSemester.hasMany(models.FeeStructure, { foreignKey: 'term_id', as: 'feeStructures' });",
            "TermSemester.hasMany(models.StudentInvoice, { foreignKey: 'term_id', as: 'studentInvoices' });",
            "TermSemester.hasMany(models.Assessment, { foreignKey: 'term_id', as: 'assessments' });",
            "TermSemester.hasMany(models.ReportCard, { foreignKey: 'term_id', as: 'reportCards' });",
            "TermSemester.hasMany(models.Timetable, { foreignKey: 'term_id', as: 'timetables' });",
        ],
    },
    {
        "table": "education_levels",
        "model": "EducationLevel",
        "file": "educationLevel.js",
        "group": "20260619010100-core-tenancy-and-academics.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "level_code": col(LEVEL_CODE_ENUM, allowNull=False),
            "level_name": col("STRING", allowNull=False),
            "age_min": col("INTEGER"),
            "age_max": col("INTEGER"),
        },
        "indexes": [{"fields": ["institution_id", "level_code"], "unique": True}],
        "associations": [
            "EducationLevel.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "EducationLevel.hasMany(models.Class, { foreignKey: 'level_id', as: 'classes' });",
            "EducationLevel.hasMany(models.Subject, { foreignKey: 'level_id', as: 'subjects' });",
            "EducationLevel.hasMany(models.Student, { foreignKey: 'level_id', as: 'students' });",
            "EducationLevel.hasMany(models.FeeStructure, { foreignKey: 'level_id', as: 'feeStructures' });",
            "EducationLevel.hasMany(models.GradeScale, { foreignKey: 'level_id', as: 'gradeScales' });",
        ],
    },
    {
        "table": "users",
        "model": "User",
        "file": "user.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "email": col("STRING", allowNull=False),
            "phone": col("STRING"),
            "password_hash": col("STRING", allowNull=False),
            "role": col(ROLE_ENUM, allowNull=False),
            "first_name": col("STRING", allowNull=False),
            "last_name": col("STRING", allowNull=False),
            "profile_photo": col("TEXT"),
            "is_active": col("BOOLEAN", allowNull=False, default=True),
            "last_login": col("DATE"),
            "email_verified": col("BOOLEAN", allowNull=False, default=False),
            "phone_verified": col("BOOLEAN", allowNull=False, default=False),
            "2fa_enabled": col("BOOLEAN", allowNull=False, default=False),
            "2fa_secret": col("STRING"),
        },
        "indexes": [
            {"fields": ["email", "institution_id"], "unique": True},
            {"fields": ["institution_id", "phone"]},
        ],
        "associations": [
            "User.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "User.hasOne(models.Student, { foreignKey: 'user_id', as: 'studentProfile' });",
            "User.hasOne(models.Guardian, { foreignKey: 'user_id', as: 'guardianProfile' });",
            "User.hasOne(models.Staff, { foreignKey: 'user_id', as: 'staffProfile' });",
            "User.hasMany(models.Payment, { foreignKey: 'received_by', as: 'paymentsReceived' });",
            "User.hasMany(models.AttendanceRecord, { foreignKey: 'marked_by', as: 'attendanceMarked' });",
            "User.hasMany(models.Notification, { foreignKey: 'sender_id', as: 'notificationsSent' });",
            "User.hasMany(models.Message, { foreignKey: 'sender_id', as: 'messagesSent' });",
            "User.hasMany(models.Message, { foreignKey: 'recipient_id', as: 'messagesReceived' });",
            "User.hasMany(models.Announcement, { foreignKey: 'created_by', as: 'announcementsCreated' });",
            "User.hasMany(models.DisciplineIncident, { foreignKey: 'reported_by', as: 'reportedIncidents' });",
            "User.hasMany(models.MeritPoint, { foreignKey: 'awarded_by', as: 'meritsAwarded' });",
            "User.hasMany(models.Vehicle, { foreignKey: 'driver_id', as: 'assignedVehicles' });",
            "User.hasMany(models.TransportTrip, { foreignKey: 'driver_id', as: 'drivenTrips' });",
            "User.hasMany(models.HostelVisitor, { foreignKey: 'approved_by', as: 'approvedHostelVisits' });",
            "User.hasMany(models.Expense, { foreignKey: 'approved_by', as: 'approvedExpenses' });",
            "User.hasMany(models.StockMovement, { foreignKey: 'moved_by', as: 'stockMovements' });",
            "User.hasMany(models.PurchaseOrder, { foreignKey: 'ordered_by', as: 'purchaseOrders' });",
            "User.hasMany(models.PayrollRun, { foreignKey: 'processed_by', as: 'processedPayrollRuns' });",
            "User.hasMany(models.LeaveRequest, { foreignKey: 'approved_by', as: 'approvedLeaveRequests' });",
        ],
    },
    {
        "table": "guardians",
        "model": "Guardian",
        "file": "guardian.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "user_id": col("UUID", allowNull=False, references=fk("users")),
            "relation_to_student": col("STRING", allowNull=False),
            "occupation": col("STRING"),
            "emergency_contact": col("STRING"),
            "address": col("TEXT"),
            "national_id": col("STRING"),
            "verified": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["user_id"], "unique": True}],
        "associations": [
            "Guardian.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });",
            "Guardian.belongsToMany(models.Student, { through: models.StudentGuardian, foreignKey: 'guardian_id', otherKey: 'student_id', as: 'students' });",
            "Guardian.hasMany(models.Student, { foreignKey: 'guardian_id', as: 'primaryStudents' });",
        ],
    },
    {
        "table": "staff",
        "model": "Staff",
        "file": "staff.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "user_id": col("UUID", allowNull=False, references=fk("users")),
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "staff_number": col("STRING", allowNull=False),
            "department": col("STRING"),
            "designation": col("STRING"),
            "qualification": col("STRING"),
            "specialization": col("STRING"),
            "employment_type": col(EMPLOYMENT_TYPE_ENUM, allowNull=False),
            "date_joined": col("DATEONLY", allowNull=False),
            "salary_grade": col("STRING"),
        },
        "indexes": [
            {"fields": ["user_id"], "unique": True},
            {"fields": ["institution_id", "staff_number"], "unique": True},
        ],
        "associations": [
            "Staff.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });",
            "Staff.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Staff.hasMany(models.Class, { foreignKey: 'class_teacher_id', as: 'homeroomClasses' });",
            "Staff.hasMany(models.ClassSubject, { foreignKey: 'teacher_id', as: 'classSubjectAssignments' });",
            "Staff.hasMany(models.AttendanceSession, { foreignKey: 'teacher_id', as: 'attendanceSessions' });",
            "Staff.hasMany(models.Assessment, { foreignKey: 'teacher_id', as: 'assessments' });",
            "Staff.hasMany(models.Hostel, { foreignKey: 'warden_id', as: 'wardenships' });",
            "Staff.hasMany(models.TimetableSlot, { foreignKey: 'teacher_id', as: 'timetableSlots' });",
            "Staff.hasMany(models.StaffAttendance, { foreignKey: 'staff_id', as: 'attendanceLogs' });",
            "Staff.hasMany(models.PayrollRecord, { foreignKey: 'staff_id', as: 'payrollRecords' });",
            "Staff.hasMany(models.LeaveRequest, { foreignKey: 'staff_id', as: 'leaveRequests' });",
        ],
    },
    {
        "table": "classes",
        "model": "Class",
        "file": "class.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "level_id": col("UUID", allowNull=False, references=fk("education_levels")),
            "name": col("STRING", allowNull=False),
            "stream": col("STRING"),
            "capacity": col("INTEGER"),
            "class_teacher_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
        },
        "indexes": [
            {"fields": ["institution_id", "academic_year_id"]},
            {"fields": ["institution_id", "academic_year_id", "name", "stream"], "unique": True},
        ],
        "associations": [
            "Class.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Class.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });",
            "Class.belongsTo(models.Staff, { foreignKey: 'class_teacher_id', as: 'classTeacher' });",
            "Class.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "Class.hasMany(models.Student, { foreignKey: 'class_id', as: 'students' });",
            "Class.hasMany(models.ClassSubject, { foreignKey: 'class_id', as: 'classSubjects' });",
            "Class.hasMany(models.FeeStructure, { foreignKey: 'class_id', as: 'feeStructures' });",
            "Class.hasMany(models.AttendanceSession, { foreignKey: 'class_id', as: 'attendanceSessions' });",
            "Class.hasMany(models.Assessment, { foreignKey: 'class_id', as: 'assessments' });",
            "Class.hasMany(models.ReportCard, { foreignKey: 'class_id', as: 'reportCards' });",
            "Class.hasMany(models.Timetable, { foreignKey: 'class_id', as: 'timetables' });",
            "Class.belongsToMany(models.Subject, { through: models.ClassSubject, foreignKey: 'class_id', otherKey: 'subject_id', as: 'subjects' });",
        ],
    },
    {
        "table": "subjects",
        "model": "Subject",
        "file": "subject.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "level_id": col("UUID", allowNull=False, references=fk("education_levels")),
            "name": col("STRING", allowNull=False),
            "code": col("STRING", allowNull=False),
            "subject_type": col(SUBJECT_TYPE_ENUM, allowNull=False),
            "credit_hours": col("INTEGER"),
            "is_active": col("BOOLEAN", allowNull=False, default=True),
        },
        "indexes": [{"fields": ["institution_id", "code"], "unique": True}],
        "associations": [
            "Subject.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Subject.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });",
            "Subject.hasMany(models.ClassSubject, { foreignKey: 'subject_id', as: 'classSubjects' });",
            "Subject.hasMany(models.AttendanceSession, { foreignKey: 'subject_id', as: 'attendanceSessions' });",
            "Subject.hasMany(models.Assessment, { foreignKey: 'subject_id', as: 'assessments' });",
            "Subject.hasMany(models.TimetableSlot, { foreignKey: 'subject_id', as: 'timetableSlots' });",
            "Subject.belongsToMany(models.Class, { through: models.ClassSubject, foreignKey: 'subject_id', otherKey: 'class_id', as: 'classes' });",
        ],
    },
    {
        "table": "class_subjects",
        "model": "ClassSubject",
        "file": "classSubject.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "class_id": col("UUID", allowNull=False, references=fk("classes")),
            "subject_id": col("UUID", allowNull=False, references=fk("subjects")),
            "teacher_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "periods_per_week": col("INTEGER", allowNull=False, default=0),
        },
        "indexes": [{"fields": ["class_id", "subject_id", "teacher_id"], "unique": True}],
        "associations": [
            "ClassSubject.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "ClassSubject.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });",
            "ClassSubject.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });",
        ],
    },
    {
        "table": "students",
        "model": "Student",
        "file": "student.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "user_id": col("UUID", allowNull=False, references=fk("users")),
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "student_number": col("STRING", allowNull=False),
            "admission_number": col("STRING", allowNull=False),
            "class_id": col("UUID", references=fk("classes", on_delete="SET NULL")),
            "level_id": col("UUID", references=fk("education_levels", on_delete="SET NULL")),
            "date_of_birth": col("DATEONLY"),
            "gender": col(GENDER_ENUM),
            "blood_group": col("STRING"),
            "nationality": col("STRING"),
            "religion": col("STRING"),
            "photo_url": col("TEXT"),
            "enrollment_date": col("DATEONLY"),
            "status": col(STUDENT_STATUS_ENUM, allowNull=False, default="active"),
            "guardian_id": col("UUID", references=fk("guardians", on_delete="SET NULL")),
        },
        "indexes": [
            {"fields": ["student_number", "institution_id"], "unique": True},
            {"fields": ["institution_id", "admission_number"], "unique": True},
        ],
        "associations": [
            "Student.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });",
            "Student.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "Student.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });",
            "Student.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Student.belongsTo(models.Guardian, { foreignKey: 'guardian_id', as: 'guardian' });",
            "Student.belongsToMany(models.Guardian, { through: models.StudentGuardian, foreignKey: 'student_id', otherKey: 'guardian_id', as: 'guardians' });",
            "Student.hasOne(models.StudentMedical, { foreignKey: 'student_id', as: 'medicalProfile' });",
            "Student.hasMany(models.StudentInvoice, { foreignKey: 'student_id', as: 'invoices' });",
            "Student.hasMany(models.Payment, { foreignKey: 'student_id', as: 'payments' });",
            "Student.hasMany(models.AttendanceRecord, { foreignKey: 'student_id', as: 'attendanceRecords' });",
            "Student.hasMany(models.AssessmentScore, { foreignKey: 'student_id', as: 'assessmentScores' });",
            "Student.hasMany(models.ReportCard, { foreignKey: 'student_id', as: 'reportCards' });",
            "Student.hasMany(models.DisciplineIncident, { foreignKey: 'student_id', as: 'disciplineIncidents' });",
            "Student.hasMany(models.DemeritPoint, { foreignKey: 'student_id', as: 'demeritPoints' });",
            "Student.hasMany(models.MeritPoint, { foreignKey: 'student_id', as: 'meritPoints' });",
            "Student.hasMany(models.StudentTransport, { foreignKey: 'student_id', as: 'transportAssignments' });",
            "Student.hasMany(models.TransportAttendance, { foreignKey: 'student_id', as: 'transportAttendance' });",
            "Student.hasMany(models.HostelAllocation, { foreignKey: 'student_id', as: 'hostelAllocations' });",
            "Student.hasMany(models.HostelVisitor, { foreignKey: 'student_id', as: 'hostelVisitors' });",
            "Student.hasMany(models.HostelAttendance, { foreignKey: 'student_id', as: 'hostelAttendance' });",
        ],
    },
    {
        "table": "student_guardians",
        "model": "StudentGuardian",
        "file": "studentGuardian.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "guardian_id": col("UUID", allowNull=False, references=fk("guardians")),
            "is_primary_guardian": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["student_id", "guardian_id"], "unique": True}],
        "associations": [
            "StudentGuardian.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "StudentGuardian.belongsTo(models.Guardian, { foreignKey: 'guardian_id', as: 'guardian' });",
        ],
    },
    {
        "table": "student_medical",
        "model": "StudentMedical",
        "file": "studentMedical.js",
        "group": "20260619010200-people-and-medical.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "allergies": col("JSONB", allowNull=False, default=[]),
            "chronic_conditions": col("JSONB", allowNull=False, default=[]),
            "medications": col("JSONB", allowNull=False, default=[]),
            "doctor_name": col("STRING"),
            "doctor_phone": col("STRING"),
            "insurance_info": col("JSONB", allowNull=False, default={}),
            "blood_group": col("STRING"),
            "vaccination_records": col("JSONB", allowNull=False, default=[]),
            "dietary_restrictions": col("TEXT"),
            "special_needs": col("TEXT"),
        },
        "indexes": [{"fields": ["student_id"], "unique": True}],
        "associations": [
            "StudentMedical.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
        ],
    },
    {
        "table": "fee_structures",
        "model": "FeeStructure",
        "file": "feeStructure.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "level_id": col("UUID", references=fk("education_levels", on_delete="SET NULL")),
            "class_id": col("UUID", references=fk("classes", on_delete="SET NULL")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "term_id": col("UUID", references=fk("terms_semesters", on_delete="SET NULL")),
            "fee_type": col(FEE_TYPE_ENUM, allowNull=False),
            "amount": col(dec(12, 2), allowNull=False),
            "currency": col("STRING", allowNull=False, default="USD"),
            "due_date": col("DATEONLY"),
            "installments_allowed": col("BOOLEAN", allowNull=False, default=False),
            "penalty_rate": col(dec(5, 2), allowNull=False, default=0),
        },
        "indexes": [
            {"fields": ["institution_id", "academic_year_id"]},
            {"fields": ["institution_id", "academic_year_id", "fee_type", "level_id", "class_id", "term_id"], "unique": True},
        ],
        "associations": [
            "FeeStructure.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "FeeStructure.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });",
            "FeeStructure.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "FeeStructure.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "FeeStructure.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });",
        ],
    },
    {
        "table": "student_invoices",
        "model": "StudentInvoice",
        "file": "studentInvoice.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "term_id": col("UUID", references=fk("terms_semesters", on_delete="SET NULL")),
            "invoice_number": col("STRING", allowNull=False),
            "total_amount": col(dec(12, 2), allowNull=False),
            "paid_amount": col(dec(12, 2), allowNull=False, default=0),
            "balance": col(dec(12, 2), allowNull=False),
            "status": col(INVOICE_STATUS_ENUM, allowNull=False, default="pending"),
            "due_date": col("DATEONLY"),
            "items": col("JSONB", allowNull=False, default=[]),
        },
        "indexes": [
            {"fields": ["institution_id", "academic_year_id"]},
            {"fields": ["institution_id", "invoice_number"], "unique": True},
        ],
        "associations": [
            "StudentInvoice.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "StudentInvoice.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "StudentInvoice.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "StudentInvoice.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });",
            "StudentInvoice.hasMany(models.Payment, { foreignKey: 'invoice_id', as: 'payments' });",
        ],
    },
    {
        "table": "payments",
        "model": "Payment",
        "file": "payment.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "invoice_id": col("UUID", allowNull=False, references=fk("student_invoices")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "amount": col(dec(12, 2), allowNull=False),
            "payment_method": col(PAYMENT_METHOD_ENUM, allowNull=False),
            "transaction_ref": col("STRING"),
            "receipt_number": col("STRING"),
            "paid_at": col("DATE", allowNull=False),
            "received_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "notes": col("TEXT"),
            "is_verified": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [
            {"fields": ["invoice_id"]},
            {"fields": ["student_id"]},
            {"fields": ["receipt_number"], "unique": True},
            {"fields": ["transaction_ref"], "unique": True},
        ],
        "associations": [
            "Payment.belongsTo(models.StudentInvoice, { foreignKey: 'invoice_id', as: 'invoice' });",
            "Payment.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "Payment.belongsTo(models.User, { foreignKey: 'received_by', as: 'receivedBy' });",
        ],
    },
    {
        "table": "expense_categories",
        "model": "ExpenseCategory",
        "file": "expenseCategory.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "description": col("TEXT"),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "ExpenseCategory.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "ExpenseCategory.hasMany(models.Expense, { foreignKey: 'category_id', as: 'expenses' });",
        ],
    },
    {
        "table": "expenses",
        "model": "Expense",
        "file": "expense.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "category_id": col("UUID", allowNull=False, references=fk("expense_categories")),
            "amount": col(dec(12, 2), allowNull=False),
            "description": col("TEXT"),
            "paid_to": col("STRING"),
            "payment_method": col(PAYMENT_METHOD_ENUM, allowNull=False),
            "receipt_url": col("TEXT"),
            "expense_date": col("DATEONLY", allowNull=False),
            "approved_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "status": col(EXPENSE_STATUS_ENUM, allowNull=False, default="pending"),
        },
        "associations": [
            "Expense.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Expense.belongsTo(models.ExpenseCategory, { foreignKey: 'category_id', as: 'category' });",
            "Expense.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });",
        ],
    },
    {
        "table": "attendance_sessions",
        "model": "AttendanceSession",
        "file": "attendanceSession.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "class_id": col("UUID", allowNull=False, references=fk("classes")),
            "subject_id": col("UUID", references=fk("subjects", on_delete="SET NULL")),
            "teacher_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "date": col("DATEONLY", allowNull=False),
            "session_type": col(ATTENDANCE_SESSION_TYPE_ENUM, allowNull=False),
            "status": col(OPEN_CLOSE_STATUS_ENUM, allowNull=False, default="open"),
        },
        "indexes": [{"fields": ["class_id", "date", "session_type", "subject_id"], "unique": True}],
        "associations": [
            "AttendanceSession.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "AttendanceSession.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });",
            "AttendanceSession.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });",
            "AttendanceSession.hasMany(models.AttendanceRecord, { foreignKey: 'session_id', as: 'attendanceRecords' });",
        ],
    },
    {
        "table": "attendance_records",
        "model": "AttendanceRecord",
        "file": "attendanceRecord.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "session_id": col("UUID", allowNull=False, references=fk("attendance_sessions")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "status": col(ATTENDANCE_RECORD_STATUS_ENUM, allowNull=False),
            "marked_at": col("DATE"),
            "marked_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "notes": col("TEXT"),
            "arrival_time": col("TIME"),
        },
        "indexes": [{"fields": ["session_id", "student_id"], "unique": True}],
        "associations": [
            "AttendanceRecord.belongsTo(models.AttendanceSession, { foreignKey: 'session_id', as: 'session' });",
            "AttendanceRecord.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "AttendanceRecord.belongsTo(models.User, { foreignKey: 'marked_by', as: 'markedBy' });",
        ],
    },
    {
        "table": "staff_attendance",
        "model": "StaffAttendance",
        "file": "staffAttendance.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "staff_id": col("UUID", allowNull=False, references=fk("staff")),
            "date": col("DATEONLY", allowNull=False),
            "check_in": col("TIME"),
            "check_out": col("TIME"),
            "status": col("STRING"),
            "method": col(enum("biometric", "manual"), allowNull=False),
        },
        "indexes": [{"fields": ["staff_id", "date"], "unique": True}],
        "associations": [
            "StaffAttendance.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });",
        ],
    },
    {
        "table": "assessments",
        "model": "Assessment",
        "file": "assessment.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "class_id": col("UUID", allowNull=False, references=fk("classes")),
            "subject_id": col("UUID", allowNull=False, references=fk("subjects")),
            "teacher_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "term_id": col("UUID", allowNull=False, references=fk("terms_semesters")),
            "title": col("STRING", allowNull=False),
            "assessment_type": col(ASSESSMENT_TYPE_ENUM, allowNull=False),
            "max_score": col(dec(8, 2), allowNull=False),
            "weight_percentage": col(dec(5, 2), allowNull=False),
            "date": col("DATEONLY", allowNull=False),
            "instructions": col("TEXT"),
        },
        "indexes": [{"fields": ["class_id", "subject_id", "term_id", "title"]}],
        "associations": [
            "Assessment.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "Assessment.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });",
            "Assessment.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });",
            "Assessment.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });",
            "Assessment.hasMany(models.AssessmentScore, { foreignKey: 'assessment_id', as: 'assessmentScores' });",
        ],
    },
    {
        "table": "assessment_scores",
        "model": "AssessmentScore",
        "file": "assessmentScore.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "assessment_id": col("UUID", allowNull=False, references=fk("assessments")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "score": col(dec(8, 2)),
            "grade": col("STRING"),
            "remarks": col("TEXT"),
            "submitted_at": col("DATE"),
            "marked_at": col("DATE"),
            "is_absent": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["assessment_id", "student_id"], "unique": True}],
        "associations": [
            "AssessmentScore.belongsTo(models.Assessment, { foreignKey: 'assessment_id', as: 'assessment' });",
            "AssessmentScore.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
        ],
    },
    {
        "table": "grade_scales",
        "model": "GradeScale",
        "file": "gradeScale.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "level_id": col("UUID", references=fk("education_levels", on_delete="SET NULL")),
            "name": col("STRING", allowNull=False),
            "min_score": col(dec(5, 2), allowNull=False),
            "max_score": col(dec(5, 2), allowNull=False),
            "grade": col("STRING", allowNull=False),
            "gpa_point": col(dec(4, 2)),
            "remark": col("STRING"),
        },
        "indexes": [{"fields": ["institution_id", "level_id", "name", "grade"], "unique": True}],
        "associations": [
            "GradeScale.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "GradeScale.belongsTo(models.EducationLevel, { foreignKey: 'level_id', as: 'level' });",
        ],
    },
    {
        "table": "report_cards",
        "model": "ReportCard",
        "file": "reportCard.js",
        "group": "20260619010300-finance-attendance-performance.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "term_id": col("UUID", allowNull=False, references=fk("terms_semesters")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "class_id": col("UUID", references=fk("classes", on_delete="SET NULL")),
            "overall_average": col(dec(5, 2)),
            "overall_grade": col("STRING"),
            "position_in_class": col("INTEGER"),
            "teacher_remark": col("TEXT"),
            "head_remark": col("TEXT"),
            "is_published": col("BOOLEAN", allowNull=False, default=False),
            "published_at": col("DATE"),
        },
        "indexes": [{"fields": ["student_id", "term_id", "academic_year_id"], "unique": True}],
        "associations": [
            "ReportCard.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "ReportCard.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });",
            "ReportCard.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "ReportCard.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
        ],
    },
    {
        "table": "notifications",
        "model": "Notification",
        "file": "notification.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "sender_id": col("UUID", references=fk("users", on_delete="SET NULL")),
            "title": col("STRING", allowNull=False),
            "body": col("TEXT", allowNull=False),
            "type": col("STRING", allowNull=False),
            "target_roles": col(arr(ROLE_ENUM), allowNull=False, default=[]),
            "target_ids": col(arr("UUID")),
            "channels": col(arr(CHANNEL_ENUM), allowNull=False, default=[]),
            "scheduled_at": col("DATE"),
            "sent_at": col("DATE"),
            "status": col("STRING", allowNull=False, default="draft"),
        },
        "associations": [
            "Notification.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Notification.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });",
        ],
    },
    {
        "table": "messages",
        "model": "Message",
        "file": "message.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "sender_id": col("UUID", allowNull=False, references=fk("users")),
            "recipient_id": col("UUID", allowNull=False, references=fk("users")),
            "thread_id": col("UUID"),
            "content": col("TEXT", allowNull=False),
            "attachments": col("JSONB", allowNull=False, default=[]),
            "read_at": col("DATE"),
            "is_deleted_by_sender": col("BOOLEAN", allowNull=False, default=False),
            "is_deleted_by_recipient": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["thread_id"]}],
        "associations": [
            "Message.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Message.belongsTo(models.User, { foreignKey: 'sender_id', as: 'sender' });",
            "Message.belongsTo(models.User, { foreignKey: 'recipient_id', as: 'recipient' });",
        ],
    },
    {
        "table": "announcements",
        "model": "Announcement",
        "file": "announcement.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "created_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "title": col("STRING", allowNull=False),
            "content": col("TEXT", allowNull=False),
            "attachments": col("JSONB", allowNull=False, default=[]),
            "target_levels": col(arr(LEVEL_CODE_ENUM), allowNull=False, default=[]),
            "target_classes": col(arr("UUID"), allowNull=False, default=[]),
            "publish_at": col("DATE"),
            "expire_at": col("DATE"),
            "is_published": col("BOOLEAN", allowNull=False, default=False),
        },
        "associations": [
            "Announcement.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Announcement.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });",
        ],
    },
    {
        "table": "discipline_incidents",
        "model": "DisciplineIncident",
        "file": "disciplineIncident.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "reported_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "incident_date": col("DATEONLY", allowNull=False),
            "category": col("STRING", allowNull=False),
            "severity": col(DISCIPLINE_SEVERITY_ENUM, allowNull=False),
            "description": col("TEXT", allowNull=False),
            "action_taken": col("TEXT"),
            "parent_notified": col("BOOLEAN", allowNull=False, default=False),
            "counseling_required": col("BOOLEAN", allowNull=False, default=False),
            "follow_up_date": col("DATEONLY"),
            "status": col(RESOLUTION_STATUS_ENUM, allowNull=False, default="open"),
        },
        "associations": [
            "DisciplineIncident.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "DisciplineIncident.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "DisciplineIncident.belongsTo(models.User, { foreignKey: 'reported_by', as: 'reportedBy' });",
            "DisciplineIncident.hasMany(models.DemeritPoint, { foreignKey: 'incident_id', as: 'demeritPoints' });",
        ],
    },
    {
        "table": "demerit_points",
        "model": "DemeritPoint",
        "file": "demeritPoint.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "incident_id": col("UUID", allowNull=False, references=fk("discipline_incidents")),
            "points": col("INTEGER", allowNull=False),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
        },
        "associations": [
            "DemeritPoint.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "DemeritPoint.belongsTo(models.DisciplineIncident, { foreignKey: 'incident_id', as: 'incident' });",
            "DemeritPoint.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
        ],
    },
    {
        "table": "merit_points",
        "model": "MeritPoint",
        "file": "meritPoint.js",
        "group": "20260619010400-communication-and-discipline.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "reason": col("TEXT", allowNull=False),
            "points": col("INTEGER", allowNull=False),
            "awarded_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
        },
        "associations": [
            "MeritPoint.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "MeritPoint.belongsTo(models.User, { foreignKey: 'awarded_by', as: 'awardedBy' });",
            "MeritPoint.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
        ],
    },
    {
        "table": "transport_routes",
        "model": "TransportRoute",
        "file": "transportRoute.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "description": col("TEXT"),
            "monthly_fee": col(dec(12, 2)),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "TransportRoute.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "TransportRoute.hasMany(models.RouteStop, { foreignKey: 'route_id', as: 'stops' });",
            "TransportRoute.hasMany(models.Vehicle, { foreignKey: 'route_id', as: 'vehicles' });",
            "TransportRoute.hasMany(models.StudentTransport, { foreignKey: 'route_id', as: 'studentTransportAssignments' });",
            "TransportRoute.hasMany(models.TransportTrip, { foreignKey: 'route_id', as: 'trips' });",
        ],
    },
    {
        "table": "vehicles",
        "model": "Vehicle",
        "file": "vehicle.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "plate_number": col("STRING", allowNull=False),
            "type": col(VEHICLE_TYPE_ENUM, allowNull=False),
            "capacity": col("INTEGER", allowNull=False),
            "model": col("STRING"),
            "year": col("INTEGER"),
            "driver_id": col("UUID", references=fk("users", on_delete="SET NULL")),
            "route_id": col("UUID", references=fk("transport_routes", on_delete="SET NULL")),
            "gps_device_id": col("STRING"),
            "insurance_expiry": col("DATEONLY"),
            "roadworthy_expiry": col("DATEONLY"),
        },
        "indexes": [{"fields": ["institution_id", "plate_number"], "unique": True}],
        "associations": [
            "Vehicle.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Vehicle.belongsTo(models.User, { foreignKey: 'driver_id', as: 'driver' });",
            "Vehicle.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });",
            "Vehicle.hasMany(models.StudentTransport, { foreignKey: 'vehicle_id', as: 'studentAssignments' });",
            "Vehicle.hasMany(models.TransportTrip, { foreignKey: 'vehicle_id', as: 'trips' });",
        ],
    },
    {
        "table": "route_stops",
        "model": "RouteStop",
        "file": "routeStop.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "route_id": col("UUID", allowNull=False, references=fk("transport_routes")),
            "stop_name": col("STRING", allowNull=False),
            "latitude": col(dec(10, 7)),
            "longitude": col(dec(10, 7)),
            "stop_order": col("INTEGER", allowNull=False),
            "morning_time": col("TIME"),
            "afternoon_time": col("TIME"),
        },
        "indexes": [{"fields": ["route_id", "stop_order"], "unique": True}],
        "associations": [
            "RouteStop.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });",
            "RouteStop.hasMany(models.StudentTransport, { foreignKey: 'stop_id', as: 'studentAssignments' });",
        ],
    },
    {
        "table": "student_transport",
        "model": "StudentTransport",
        "file": "studentTransport.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "route_id": col("UUID", allowNull=False, references=fk("transport_routes")),
            "stop_id": col("UUID", allowNull=False, references=fk("route_stops")),
            "vehicle_id": col("UUID", references=fk("vehicles", on_delete="SET NULL")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "pickup_type": col(PICKUP_TYPE_ENUM, allowNull=False),
            "status": col("STRING", allowNull=False, default="active"),
        },
        "indexes": [{"fields": ["student_id", "academic_year_id"], "unique": True}],
        "associations": [
            "StudentTransport.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "StudentTransport.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });",
            "StudentTransport.belongsTo(models.RouteStop, { foreignKey: 'stop_id', as: 'stop' });",
            "StudentTransport.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });",
            "StudentTransport.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
        ],
    },
    {
        "table": "transport_trips",
        "model": "TransportTrip",
        "file": "transportTrip.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "vehicle_id": col("UUID", allowNull=False, references=fk("vehicles")),
            "route_id": col("UUID", allowNull=False, references=fk("transport_routes")),
            "driver_id": col("UUID", references=fk("users", on_delete="SET NULL")),
            "trip_type": col(TRIP_TYPE_ENUM, allowNull=False),
            "date": col("DATEONLY", allowNull=False),
            "departure_time": col("TIME"),
            "arrival_time": col("TIME"),
            "status": col(TRIP_STATUS_ENUM, allowNull=False, default="pending"),
        },
        "indexes": [{"fields": ["vehicle_id", "route_id", "date", "trip_type"], "unique": True}],
        "associations": [
            "TransportTrip.belongsTo(models.Vehicle, { foreignKey: 'vehicle_id', as: 'vehicle' });",
            "TransportTrip.belongsTo(models.TransportRoute, { foreignKey: 'route_id', as: 'route' });",
            "TransportTrip.belongsTo(models.User, { foreignKey: 'driver_id', as: 'driver' });",
            "TransportTrip.hasMany(models.TransportAttendance, { foreignKey: 'trip_id', as: 'transportAttendance' });",
        ],
    },
    {
        "table": "transport_attendance",
        "model": "TransportAttendance",
        "file": "transportAttendance.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "trip_id": col("UUID", allowNull=False, references=fk("transport_trips")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "status": col(TRANSPORT_ATTENDANCE_STATUS_ENUM, allowNull=False),
            "boarded_at": col("DATE"),
            "dropped_at": col("DATE"),
        },
        "indexes": [{"fields": ["trip_id", "student_id"], "unique": True}],
        "associations": [
            "TransportAttendance.belongsTo(models.TransportTrip, { foreignKey: 'trip_id', as: 'trip' });",
            "TransportAttendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
        ],
    },
    {
        "table": "hostels",
        "model": "Hostel",
        "file": "hostel.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "gender": col(HOSTEL_GENDER_ENUM, allowNull=False),
            "warden_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "capacity": col("INTEGER", allowNull=False),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "Hostel.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Hostel.belongsTo(models.Staff, { foreignKey: 'warden_id', as: 'warden' });",
            "Hostel.hasMany(models.HostelRoom, { foreignKey: 'hostel_id', as: 'rooms' });",
            "Hostel.hasMany(models.HostelAllocation, { foreignKey: 'hostel_id', as: 'allocations' });",
            "Hostel.hasMany(models.HostelVisitor, { foreignKey: 'hostel_id', as: 'visitors' });",
            "Hostel.hasMany(models.HostelAttendance, { foreignKey: 'hostel_id', as: 'attendanceRecords' });",
        ],
    },
    {
        "table": "hostel_rooms",
        "model": "HostelRoom",
        "file": "hostelRoom.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "hostel_id": col("UUID", allowNull=False, references=fk("hostels")),
            "room_number": col("STRING", allowNull=False),
            "floor": col("STRING"),
            "capacity": col("INTEGER", allowNull=False),
            "room_type": col(ROOM_TYPE_ENUM, allowNull=False),
        },
        "indexes": [{"fields": ["hostel_id", "room_number"], "unique": True}],
        "associations": [
            "HostelRoom.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });",
            "HostelRoom.hasMany(models.HostelBed, { foreignKey: 'room_id', as: 'beds' });",
            "HostelRoom.hasMany(models.HostelAllocation, { foreignKey: 'room_id', as: 'allocations' });",
        ],
    },
    {
        "table": "hostel_beds",
        "model": "HostelBed",
        "file": "hostelBed.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "room_id": col("UUID", allowNull=False, references=fk("hostel_rooms")),
            "bed_number": col("STRING", allowNull=False),
            "status": col(BED_STATUS_ENUM, allowNull=False, default="available"),
        },
        "indexes": [{"fields": ["room_id", "bed_number"], "unique": True}],
        "associations": [
            "HostelBed.belongsTo(models.HostelRoom, { foreignKey: 'room_id', as: 'room' });",
            "HostelBed.hasMany(models.HostelAllocation, { foreignKey: 'bed_id', as: 'allocations' });",
        ],
    },
    {
        "table": "hostel_allocations",
        "model": "HostelAllocation",
        "file": "hostelAllocation.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "bed_id": col("UUID", allowNull=False, references=fk("hostel_beds")),
            "room_id": col("UUID", allowNull=False, references=fk("hostel_rooms")),
            "hostel_id": col("UUID", allowNull=False, references=fk("hostels")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "check_in_date": col("DATEONLY", allowNull=False),
            "check_out_date": col("DATEONLY"),
            "status": col(HOSTEL_ALLOCATION_STATUS_ENUM, allowNull=False, default="active"),
        },
        "indexes": [{"fields": ["student_id", "academic_year_id"], "unique": True}],
        "associations": [
            "HostelAllocation.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "HostelAllocation.belongsTo(models.HostelBed, { foreignKey: 'bed_id', as: 'bed' });",
            "HostelAllocation.belongsTo(models.HostelRoom, { foreignKey: 'room_id', as: 'room' });",
            "HostelAllocation.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });",
            "HostelAllocation.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
        ],
    },
    {
        "table": "hostel_visitors",
        "model": "HostelVisitor",
        "file": "hostelVisitor.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "hostel_id": col("UUID", allowNull=False, references=fk("hostels")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "visitor_name": col("STRING", allowNull=False),
            "visitor_phone": col("STRING"),
            "relationship": col("STRING"),
            "visit_date": col("DATEONLY", allowNull=False),
            "check_in_time": col("TIME"),
            "check_out_time": col("TIME"),
            "approved_by": col("UUID", references=fk("users", on_delete="SET NULL")),
        },
        "associations": [
            "HostelVisitor.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });",
            "HostelVisitor.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
            "HostelVisitor.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });",
        ],
    },
    {
        "table": "hostel_attendance",
        "model": "HostelAttendance",
        "file": "hostelAttendance.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "hostel_id": col("UUID", allowNull=False, references=fk("hostels")),
            "student_id": col("UUID", allowNull=False, references=fk("students")),
            "date": col("DATEONLY", allowNull=False),
            "session": col(HOSTEL_SESSION_ENUM, allowNull=False),
            "status": col("STRING", allowNull=False),
        },
        "indexes": [{"fields": ["hostel_id", "student_id", "date", "session"], "unique": True}],
        "associations": [
            "HostelAttendance.belongsTo(models.Hostel, { foreignKey: 'hostel_id', as: 'hostel' });",
            "HostelAttendance.belongsTo(models.Student, { foreignKey: 'student_id', as: 'student' });",
        ],
    },
    {
        "table": "inventory_categories",
        "model": "InventoryCategory",
        "file": "inventoryCategory.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "description": col("TEXT"),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "InventoryCategory.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "InventoryCategory.hasMany(models.InventoryItem, { foreignKey: 'category_id', as: 'items' });",
        ],
    },
    {
        "table": "inventory_items",
        "model": "InventoryItem",
        "file": "inventoryItem.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "category_id": col("UUID", allowNull=False, references=fk("inventory_categories")),
            "name": col("STRING", allowNull=False),
            "description": col("TEXT"),
            "unit": col("STRING"),
            "barcode": col("STRING"),
            "current_stock": col("INTEGER", allowNull=False, default=0),
            "min_stock_level": col("INTEGER", allowNull=False, default=0),
            "unit_cost": col(dec(12, 2), allowNull=False, default=0),
            "location": col("STRING"),
            "status": col(INVENTORY_STATUS_ENUM, allowNull=False, default="active"),
        },
        "indexes": [{"fields": ["institution_id", "barcode"], "unique": True}],
        "associations": [
            "InventoryItem.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "InventoryItem.belongsTo(models.InventoryCategory, { foreignKey: 'category_id', as: 'category' });",
            "InventoryItem.hasMany(models.StockMovement, { foreignKey: 'item_id', as: 'stockMovements' });",
        ],
    },
    {
        "table": "stock_movements",
        "model": "StockMovement",
        "file": "stockMovement.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "item_id": col("UUID", allowNull=False, references=fk("inventory_items")),
            "movement_type": col(STOCK_MOVEMENT_ENUM, allowNull=False),
            "quantity": col("INTEGER", allowNull=False),
            "previous_stock": col("INTEGER", allowNull=False),
            "new_stock": col("INTEGER", allowNull=False),
            "reference": col("STRING"),
            "moved_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "moved_at": col("DATE", allowNull=False),
            "notes": col("TEXT"),
        },
        "associations": [
            "StockMovement.belongsTo(models.InventoryItem, { foreignKey: 'item_id', as: 'item' });",
            "StockMovement.belongsTo(models.User, { foreignKey: 'moved_by', as: 'movedBy' });",
        ],
    },
    {
        "table": "purchase_orders",
        "model": "PurchaseOrder",
        "file": "purchaseOrder.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "supplier_name": col("STRING", allowNull=False),
            "supplier_contact": col("STRING"),
            "items": col("JSONB", allowNull=False, default=[]),
            "total_amount": col(dec(12, 2), allowNull=False),
            "status": col(PURCHASE_ORDER_STATUS_ENUM, allowNull=False, default="draft"),
            "ordered_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "ordered_at": col("DATE"),
        },
        "associations": [
            "PurchaseOrder.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "PurchaseOrder.belongsTo(models.User, { foreignKey: 'ordered_by', as: 'orderedBy' });",
        ],
    },
    {
        "table": "timetable_periods",
        "model": "TimetablePeriod",
        "file": "timetablePeriod.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "start_time": col("TIME", allowNull=False),
            "end_time": col("TIME", allowNull=False),
            "is_break": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "TimetablePeriod.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "TimetablePeriod.hasMany(models.TimetableSlot, { foreignKey: 'period_id', as: 'slots' });",
        ],
    },
    {
        "table": "timetables",
        "model": "Timetable",
        "file": "timetable.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "class_id": col("UUID", allowNull=False, references=fk("classes")),
            "academic_year_id": col("UUID", allowNull=False, references=fk("academic_years")),
            "term_id": col("UUID", references=fk("terms_semesters", on_delete="SET NULL")),
            "is_active": col("BOOLEAN", allowNull=False, default=True),
            "published_at": col("DATE"),
        },
        "indexes": [
            {"fields": ["institution_id", "academic_year_id"]},
            {"fields": ["class_id", "academic_year_id", "term_id"], "unique": True},
        ],
        "associations": [
            "Timetable.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "Timetable.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });",
            "Timetable.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });",
            "Timetable.belongsTo(models.TermSemester, { foreignKey: 'term_id', as: 'term' });",
            "Timetable.hasMany(models.TimetableSlot, { foreignKey: 'timetable_id', as: 'slots' });",
        ],
    },
    {
        "table": "timetable_slots",
        "model": "TimetableSlot",
        "file": "timetableSlot.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "timetable_id": col("UUID", allowNull=False, references=fk("timetables")),
            "period_id": col("UUID", allowNull=False, references=fk("timetable_periods")),
            "day_of_week": col("INTEGER", allowNull=False),
            "subject_id": col("UUID", references=fk("subjects", on_delete="SET NULL")),
            "teacher_id": col("UUID", references=fk("staff", on_delete="SET NULL")),
            "room": col("STRING"),
            "is_free_period": col("BOOLEAN", allowNull=False, default=False),
        },
        "indexes": [{"fields": ["timetable_id", "period_id", "day_of_week"], "unique": True}],
        "associations": [
            "TimetableSlot.belongsTo(models.Timetable, { foreignKey: 'timetable_id', as: 'timetable' });",
            "TimetableSlot.belongsTo(models.TimetablePeriod, { foreignKey: 'period_id', as: 'period' });",
            "TimetableSlot.belongsTo(models.Subject, { foreignKey: 'subject_id', as: 'subject' });",
            "TimetableSlot.belongsTo(models.Staff, { foreignKey: 'teacher_id', as: 'teacher' });",
        ],
    },
    {
        "table": "salary_grades",
        "model": "SalaryGrade",
        "file": "salaryGrade.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "grade_name": col("STRING", allowNull=False),
            "basic_salary": col(dec(12, 2), allowNull=False),
            "allowances": col("JSONB", allowNull=False, default={}),
            "deductions": col("JSONB", allowNull=False, default={}),
        },
        "indexes": [{"fields": ["institution_id", "grade_name"], "unique": True}],
        "associations": [
            "SalaryGrade.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
        ],
    },
    {
        "table": "payroll_runs",
        "model": "PayrollRun",
        "file": "payrollRun.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "month": col("INTEGER", allowNull=False),
            "year": col("INTEGER", allowNull=False),
            "status": col(PAYROLL_STATUS_ENUM, allowNull=False, default="draft"),
            "processed_by": col("UUID", references=fk("users", on_delete="SET NULL")),
            "processed_at": col("DATE"),
        },
        "indexes": [{"fields": ["institution_id", "month", "year"], "unique": True}],
        "associations": [
            "PayrollRun.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "PayrollRun.belongsTo(models.User, { foreignKey: 'processed_by', as: 'processedBy' });",
            "PayrollRun.hasMany(models.PayrollRecord, { foreignKey: 'payroll_run_id', as: 'records' });",
        ],
    },
    {
        "table": "payroll_records",
        "model": "PayrollRecord",
        "file": "payrollRecord.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "payroll_run_id": col("UUID", allowNull=False, references=fk("payroll_runs")),
            "staff_id": col("UUID", allowNull=False, references=fk("staff")),
            "basic_salary": col(dec(12, 2), allowNull=False),
            "allowances": col("JSONB", allowNull=False, default={}),
            "deductions": col("JSONB", allowNull=False, default={}),
            "net_salary": col(dec(12, 2), allowNull=False),
            "payment_method": col(PAYMENT_METHOD_ENUM, allowNull=False),
            "payment_status": col(PAYMENT_STATUS_ENUM, allowNull=False, default="pending"),
            "payment_date": col("DATEONLY"),
        },
        "indexes": [{"fields": ["payroll_run_id", "staff_id"], "unique": True}],
        "associations": [
            "PayrollRecord.belongsTo(models.PayrollRun, { foreignKey: 'payroll_run_id', as: 'payrollRun' });",
            "PayrollRecord.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });",
        ],
    },
    {
        "table": "leave_types",
        "model": "LeaveType",
        "file": "leaveType.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "institution_id": col("UUID", allowNull=False, references=fk("institutions")),
            "name": col("STRING", allowNull=False),
            "days_per_year": col("INTEGER", allowNull=False),
            "is_paid": col("BOOLEAN", allowNull=False, default=True),
        },
        "indexes": [{"fields": ["institution_id", "name"], "unique": True}],
        "associations": [
            "LeaveType.belongsTo(models.Institution, { foreignKey: 'institution_id', as: 'institution' });",
            "LeaveType.hasMany(models.LeaveRequest, { foreignKey: 'leave_type_id', as: 'leaveRequests' });",
        ],
    },
    {
        "table": "leave_requests",
        "model": "LeaveRequest",
        "file": "leaveRequest.js",
        "group": "20260619010500-operations-and-hr.js",
        "columns": {
            "staff_id": col("UUID", allowNull=False, references=fk("staff")),
            "leave_type_id": col("UUID", allowNull=False, references=fk("leave_types")),
            "start_date": col("DATEONLY", allowNull=False),
            "end_date": col("DATEONLY", allowNull=False),
            "days_count": col("INTEGER", allowNull=False),
            "reason": col("TEXT"),
            "status": col(REQUEST_STATUS_ENUM, allowNull=False, default="pending"),
            "approved_by": col("UUID", references=fk("users", on_delete="SET NULL")),
        },
        "associations": [
            "LeaveRequest.belongsTo(models.Staff, { foreignKey: 'staff_id', as: 'staff' });",
            "LeaveRequest.belongsTo(models.LeaveType, { foreignKey: 'leave_type_id', as: 'leaveType' });",
            "LeaveRequest.belongsTo(models.User, { foreignKey: 'approved_by', as: 'approvedBy' });",
        ],
    },
]


GROUP_ORDER = [
    "20260619010100-core-tenancy-and-academics.js",
    "20260619010200-people-and-medical.js",
    "20260619010300-finance-attendance-performance.js",
    "20260619010400-communication-and-discipline.js",
    "20260619010500-operations-and-hr.js",
]


TYPE_MAP = {
    "UUID": "UUID",
    "STRING": "STRING",
    "TEXT": "TEXT",
    "INTEGER": "INTEGER",
    "BOOLEAN": "BOOLEAN",
    "DATE": "DATE",
    "DATEONLY": "DATEONLY",
    "JSONB": "JSONB",
    "TIME": "TIME",
}


def render_type(spec, namespace):
    prefix = "DataTypes" if namespace == "model" else "Sequelize"
    if isinstance(spec, str):
        return f"{prefix}.{TYPE_MAP[spec]}"
    if spec["kind"] == "decimal":
        return f"{prefix}.DECIMAL({spec['precision']}, {spec['scale']})"
    if spec["kind"] == "enum":
        values = ", ".join(json.dumps(value) for value in spec["values"])
        return f"{prefix}.ENUM({values})"
    if spec["kind"] == "array":
        return f"{prefix}.ARRAY({render_type(spec['of'], namespace)})"
    raise ValueError(f"Unsupported spec: {spec}")


def render_default(value, namespace):
    prefix = "DataTypes" if namespace == "model" else "Sequelize"
    if value is None:
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, (list, dict)):
        return json.dumps(value)
    if value == "UUIDV4":
        return f"{prefix}.UUIDV4"
    return json.dumps(value)


def migration_column(name, definition):
    lines = [f"      {json.dumps(name)}: {{", f"        type: {render_type(definition['type'], 'migration')},"]
    if not definition.get("allowNull", True):
        lines.append("        allowNull: false,")
    default = render_default(definition.get("default"), "migration")
    if default is not None:
        lines.append(f"        defaultValue: {default},")
    if definition.get("unique"):
        lines.append("        unique: true,")
    if "references" in definition:
        ref = definition["references"]
        lines.extend(
            [
                "        references: {",
                f"          model: {json.dumps(ref['model'])},",
                f"          key: {json.dumps(ref['key'])},",
                "        },",
                f"        onUpdate: {json.dumps(ref['onUpdate'])},",
                f"        onDelete: {json.dumps(ref['onDelete'])},",
            ]
        )
    lines.append("      },")
    return "\n".join(lines)


def model_column(name, definition):
    lines = [f"    {json.dumps(name)}: {{", f"      type: {render_type(definition['type'], 'model')},"]
    if not definition.get("allowNull", True):
        lines.append("      allowNull: false,")
    default = render_default(definition.get("default"), "model")
    if default is not None:
        lines.append(f"      defaultValue: {default},")
    if definition.get("unique"):
        lines.append("      unique: true,")
    if "references" in definition:
        ref = definition["references"]
        lines.extend(
            [
                "      references: {",
                f"        model: {json.dumps(ref['model'])},",
                f"        key: {json.dumps(ref['key'])},",
                "      },",
            ]
        )
    lines.append("    },")
    return "\n".join(lines)


def base_migration_columns():
    return {
        "id": {
            "type": "UUID",
            "allowNull": False,
            "default": {"literal": "gen_random_uuid()"},
        }
    }


def render_base_columns_for_migration():
    return """      "id": {
        type: Sequelize.UUID,
        allowNull: false,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      "created_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "updated_at": {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      "deleted_at": {
        type: Sequelize.DATE,
      },"""


def render_model_content(table):
    attribute_chunks = [
        """    "id": {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },"""
    ]
    attribute_chunks.extend(model_column(name, definition) for name, definition in table["columns"].items())
    indexes = build_indexes(table)
    index_lines = []
    for index in indexes:
        opts = [f"fields: {json.dumps(index['fields'])}"]
        if index.get("unique"):
            opts.append("unique: true")
        if index.get("name"):
            opts.append(f"name: {json.dumps(index['name'])}")
        index_lines.append(f"      {{ {', '.join(opts)} }},")

    association_lines = "\n".join(f"  {line}" for line in table["associations"])
    return f"""module.exports = (sequelize, DataTypes) => {{
  const {table['model']} = sequelize.define(
    {json.dumps(table['model'])},
    {{
{chr(10).join(attribute_chunks)}
    }},
    {{
      tableName: {json.dumps(table['table'])},
      underscored: true,
      paranoid: true,
      timestamps: true,
      freezeTableName: true,
      indexes: [
{chr(10).join(index_lines)}
      ],
    }}
  );

  {table['model']}.associate = (models) => {{
{association_lines}
  }};

  return {table['model']};
}};
"""


def build_indexes(table):
    indexes = list(table.get("indexes", []))
    covered = {tuple(index["fields"]) for index in indexes}
    referenced_fields = [
        column_name
        for column_name, definition in table["columns"].items()
        if "references" in definition
    ]
    for field in referenced_fields:
        if (field,) not in covered:
            indexes.append({"fields": [field]})
            covered.add((field,))
    return indexes


def enum_drop_queries(table):
    drops = []
    for name, definition in table["columns"].items():
        type_spec = definition["type"]
        if isinstance(type_spec, dict) and type_spec["kind"] == "enum":
            drops.append(f"    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_{table['table']}_{name}\";');")
        if isinstance(type_spec, dict) and type_spec["kind"] == "array":
            inner = type_spec["of"]
            if isinstance(inner, dict) and inner["kind"] == "enum":
                drops.append(f"    await queryInterface.sequelize.query('DROP TYPE IF EXISTS \"enum_{table['table']}_{name}\";');")
    return drops


def render_migration(group_name, tables):
    up_lines = []
    down_lines = []
    if group_name == GROUP_ORDER[0]:
        up_lines.append('    await queryInterface.sequelize.query(\'CREATE EXTENSION IF NOT EXISTS "pgcrypto";\');')

    for table in tables:
        column_blocks = [render_base_columns_for_migration()]
        column_blocks.extend(migration_column(name, definition) for name, definition in table["columns"].items())
        up_lines.append(
            f"""    await queryInterface.createTable({json.dumps(table['table'])}, {{
{chr(10).join(column_blocks)}
    }});"""
        )
        for index in build_indexes(table):
            options = [json.dumps(table["table"]), json.dumps(index["fields"])]
            if index.get("unique"):
                options.append("{ unique: true }")
                up_lines.append(f"    await queryInterface.addIndex({options[0]}, {options[1]}, {options[2]});")
            else:
                up_lines.append(f"    await queryInterface.addIndex({options[0]}, {options[1]});")

    for table in reversed(tables):
        down_lines.append(f"    await queryInterface.dropTable({json.dumps(table['table'])});")
        down_lines.extend(enum_drop_queries(table))

    return f"""'use strict';

module.exports = {{
  async up(queryInterface, Sequelize) {{
{chr(10).join(up_lines)}
  }},

  async down(queryInterface) {{
{chr(10).join(down_lines)}
  }},
}};
"""


def render_models_index(model_tables):
    import_lines = []
    init_lines = []
    associate_lines = []
    result_lines = []
    for table in model_tables:
        var_name = table["model"]
        import_lines.append(
            f"const {var_name}Factory = require('./{Path(table['file']).stem}');"
        )
        init_lines.append(f"  models.{var_name} = {var_name}Factory(sequelize, DataTypes);")
        associate_lines.append(
            f"  if (models.{var_name}.associate) models.{var_name}.associate(models);"
        )
        result_lines.append(f"  {var_name}: models.{var_name},")

    return f"""const {{ Sequelize, DataTypes }} = require('sequelize');

{chr(10).join(import_lines)}

let cached = null;

module.exports = (sequelize) => {{
  if (cached) {{
    return cached;
  }}

  if (!(sequelize instanceof Sequelize)) {{
    throw new Error('A Sequelize instance is required to initialize EDUOVA models.');
  }}

  const models = {{}};

{chr(10).join(init_lines)}
{chr(10).join(associate_lines)}

  cached = {{
    sequelize,
    Sequelize,
{chr(10).join('    ' + line for line in result_lines)}
  }};

  return cached;
}};
"""


def render_sequelize_config():
    return """const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
  },
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
  },
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },
};
"""


def render_sequelizerc():
    return """const path = require('path');

module.exports = {
  config: path.resolve('database/config/config.js'),
  'models-path': path.resolve('database/models'),
  'seeders-path': path.resolve('database/seeders'),
  'migrations-path': path.resolve('database/migrations'),
};
"""


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content)


def main():
    migrations_dir = ROOT / "database" / "migrations"
    models_dir = ROOT / "database" / "models"
    config_dir = ROOT / "database" / "config"
    seeders_dir = ROOT / "database" / "seeders"

    write(ROOT / ".sequelizerc", render_sequelizerc())
    write(config_dir / "config.js", render_sequelize_config())
    seeders_dir.mkdir(parents=True, exist_ok=True)

    by_group = {group: [] for group in GROUP_ORDER}
    for table in TABLES:
        by_group[table["group"]].append(table)
        write(models_dir / table["file"], render_model_content(table))

    for group in GROUP_ORDER:
        write(migrations_dir / group, render_migration(group, by_group[group]))

    write(models_dir / "index.js", render_models_index(TABLES))


if __name__ == "__main__":
    main()
