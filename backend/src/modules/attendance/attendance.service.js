const communicationService = require('../communication/communication.service');
const socketService = require('../notifications/socket.service');
const analyticsService = require('../analytics/analytics.service');
const { models } = require('../../config/database');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const databaseReady = () =>
  Boolean(models.Student && models.User && models.AttendanceRecord && models.AttendanceSession);

const markAttendance = async ({ institutionId, sessionId, payload, userId, ip }) => {
  const session = store.attendance.sessions.find(
    (item) => item.id === sessionId && item.institution_id === institutionId
  );
  if (!session) {
    throw Object.assign(new Error('Attendance session not found.'), { statusCode: 404 });
  }

  const record = {
    id: `att-${store.attendance.records.length + 1}`,
    institution_id: institutionId,
    session_id: sessionId,
    student_id: payload.student_id,
    student_name: payload.student_name,
    status: payload.status,
    marked_at: new Date().toISOString(),
    arrival_time: payload.arrival_time || null,
  };
  store.attendance.records.push(record);

  socketService.emitAttendanceMarked({
    sessionId,
    payload: {
      student_id: record.student_id,
      status: record.status,
    },
  });

  if (record.status === 'absent') {
    await communicationService.saveAndDispatch({
      institutionId,
      senderId: userId,
      title: 'Attendance Alert',
      body: `${record.student_name} was marked absent.`,
      type: 'attendance',
      targetIds: payload.parent_ids || [],
      channels: ['push'],
      priority: 'high',
    });
  }

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'attendance_record',
    resourceId: record.id,
    newValues: record,
    ip,
  });

  return record;
};

const closeSession = async ({ institutionId, sessionId, userId, ip }) => {
  const session = store.attendance.sessions.find(
    (item) => item.id === sessionId && item.institution_id === institutionId
  );
  if (!session) {
    throw Object.assign(new Error('Attendance session not found.'), { statusCode: 404 });
  }

  session.status = 'closed';
  await analyticsService.invalidateAnalyticsCache(institutionId);
  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'attendance_session',
    resourceId: session.id,
    oldValues: { status: 'open' },
    newValues: session,
    ip,
  });
  return session;
};

const getToday = async ({ institutionId }) => {
  const today = new Date().toISOString().slice(0, 10);

  if (databaseReady()) {
    const [students, records] = await Promise.all([
      models.Student.findAll({
        where: { institution_id: institutionId, status: 'active' },
        include: [{ model: models.User, as: 'user', required: false }],
        order: [['created_at', 'DESC']],
      }).catch(() => []),
      models.AttendanceRecord.findAll({
        include: [
          {
            model: models.Student,
            as: 'student',
            required: true,
            where: { institution_id: institutionId },
          },
          {
            model: models.AttendanceSession,
            as: 'session',
            required: true,
            where: { date: today },
          },
        ],
        order: [['created_at', 'DESC']],
      }).catch(() => []),
    ]);

    const statusMap = new Map(records.map((item) => [item.student_id, item.status]));
    return students.map((student) => ({
      id: student.id,
      student: `${student.user?.first_name || ''} ${student.user?.last_name || ''}`.trim() || student.student_number,
      status: statusMap.get(student.id) || 'present',
    }));
  }

  const statusMap = new Map(
    store.attendance.records
      .filter((item) => item.institution_id === institutionId)
      .map((item) => [item.student_id, item.status])
  );

  return store.students.profiles
    .filter((item) => item.institution_id === institutionId)
    .map((student) => ({
      id: student.id,
      student: student.full_name || `${student.first_name || ''} ${student.last_name || ''}`.trim(),
      status: statusMap.get(student.id) || 'present',
    }));
};

const getReport = async ({ institutionId }) => {
  const records = store.attendance.records.filter((item) => item.institution_id === institutionId);
  const grouped = records.reduce((acc, record) => {
    if (!acc[record.student_id]) {
      acc[record.student_id] = {
        id: record.student_id,
        student: record.student_name,
        days: 0,
        present: 0,
        absent: 0,
        late: 0,
      };
    }
    acc[record.student_id].days += 1;
    acc[record.student_id][record.status] += 1;
    return acc;
  }, {});

  return Object.values(grouped).map((item) => ({
    ...item,
    rate: item.days ? Math.round(((item.present + item.late) / item.days) * 100) : 0,
  }));
};

module.exports = {
  markAttendance,
  closeSession,
  getToday,
  getReport,
};
