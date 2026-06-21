const communicationService = require('../communication/communication.service');
const socketService = require('../notifications/socket.service');
const analyticsService = require('../analytics/analytics.service');
const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

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
  getReport,
};
