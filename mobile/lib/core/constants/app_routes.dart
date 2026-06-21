abstract final class AppRoutes {
  static const String login = '/login';
  static const String forgotPassword = '/forgot-password';
  static const String app = '/app';

  static const String parentHome = '/app/parent/home';
  static const String parentChildren = '/app/parent/children';
  static const String parentFees = '/app/parent/fees';
  static const String parentMessages = '/app/parent/messages';

  static const String studentHome = '/app/student/home';
  static const String studentResults = '/app/student/results';
  static const String studentAttendance = '/app/student/attendance';
  static const String studentTimetable = '/app/student/timetable';

  static const String teacherHome = '/app/teacher/home';
  static const String teacherAttendance = '/app/teacher/attendance';
  static const String teacherGradebook = '/app/teacher/gradebook';
  static const String teacherMessages = '/app/teacher/messages';

  static const String childrenList = '/app/parent/children/list';
  static const String childProfile = '/app/parent/children/profile';
  static const String invoices = '/app/parent/fees/invoices';
  static const String receipts = '/app/parent/fees/receipts';
  static const String payment = '/app/parent/fees/payment';
  static const String reportCard = '/app/parent/results/report-card';
  static const String transportTracking = '/app/parent/transport/tracking';
  static const String chat = '/app/chat';
}
