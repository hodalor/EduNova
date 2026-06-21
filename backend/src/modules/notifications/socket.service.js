const { verifyAccessToken } = require('../../shared/helpers/auth');

const namespaces = {
  notifications: null,
  transport: null,
  attendance: null,
  chat: null,
};

const vehicleEmitWindow = new Map();

const parseToken = (socket) => {
  const queryToken = socket.handshake.query?.token;
  const authToken = socket.handshake.auth?.token;
  return queryToken || authToken || null;
};

const authenticateSocket = (socket) => {
  const token = parseToken(socket);
  if (!token) {
    throw Object.assign(new Error('Missing socket token.'), { status: 401 });
  }

  return verifyAccessToken(token);
};

const initializeSocketNamespaces = ({ io }) => {
  namespaces.notifications = io.of('/notifications');
  namespaces.transport = io.of('/transport');
  namespaces.attendance = io.of('/attendance');
  namespaces.chat = io.of('/chat');

  namespaces.notifications.use((socket, next) => {
    try {
      socket.data.auth = authenticateSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  namespaces.notifications.on('connection', (socket) => {
    const userId = socket.data.auth?.sub;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });

  namespaces.transport.use((socket, next) => {
    try {
      socket.data.auth = authenticateSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  namespaces.transport.on('connection', (socket) => {
    const vehicleId = socket.handshake.query?.vehicle_id;
    if (vehicleId) {
      socket.join(`vehicle:${vehicleId}`);
    }
  });

  namespaces.attendance.use((socket, next) => {
    try {
      socket.data.auth = authenticateSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  namespaces.attendance.on('connection', (socket) => {
    socket.on('attendance:join_session', (payload = {}) => {
      if (payload.session_id) {
        socket.join(`session:${payload.session_id}`);
      }
    });
  });

  namespaces.chat.use((socket, next) => {
    try {
      socket.data.auth = authenticateSocket(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  namespaces.chat.on('connection', (socket) => {
    const userId = socket.data.auth?.sub;
    if (userId) {
      socket.join(`user:${userId}`);
    }
  });
};

const emitNotification = ({ userId, notification }) => {
  if (!namespaces.notifications) {
    return;
  }

  namespaces.notifications.to(`user:${userId}`).emit('notification:new', notification);
};

const emitNotificationBadge = ({ userId, unread }) => {
  if (!namespaces.notifications) {
    return;
  }

  namespaces.notifications.to(`user:${userId}`).emit('notification:badge_update', {
    unread,
  });
};

const emitBusLocationUpdate = ({ vehicleId, payload }) => {
  if (!namespaces.transport || !vehicleId) {
    return;
  }

  const cacheKey = `vehicle:${vehicleId}`;
  const lastEmitAt = vehicleEmitWindow.get(cacheKey) || 0;
  const now = Date.now();
  if (now - lastEmitAt < 5000) {
    return;
  }

  vehicleEmitWindow.set(cacheKey, now);
  namespaces.transport.to(cacheKey).emit('bus:location_update', payload);
};

const emitAttendanceMarked = ({ sessionId, payload }) => {
  if (!namespaces.attendance || !sessionId) {
    return;
  }

  namespaces.attendance
    .to(`session:${sessionId}`)
    .emit('attendance:marked', payload);
};

const emitChatMessage = ({ userId, message }) => {
  if (!namespaces.chat || !userId) {
    return;
  }

  namespaces.chat.to(`user:${userId}`).emit('message:new', message);
};

const emitChatRead = ({ userId, payload }) => {
  if (!namespaces.chat || !userId) {
    return;
  }

  namespaces.chat.to(`user:${userId}`).emit('message:read', payload);
};

const getNamespaces = () => namespaces;

module.exports = {
  initializeSocketNamespaces,
  emitNotification,
  emitNotificationBadge,
  emitBusLocationUpdate,
  emitAttendanceMarked,
  emitChatMessage,
  emitChatRead,
  getNamespaces,
};
