const logger = require('../../config/logger');
const { models } = require('../../config/database');

const logAudit = async ({
  userId,
  action,
  resourceType,
  resourceId,
  oldValues = null,
  newValues = null,
  ip = null,
}) => {
  const payload = {
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    old_values: oldValues,
    new_values: newValues,
    ip_address: ip,
  };

  if (models.AuditLog) {
    try {
      await models.AuditLog.create(payload);
      return;
    } catch (error) {
      logger.warn('Audit log persistence fallback to logger', {
        error: error.message,
      });
    }
  }

  logger.info('AUDIT', payload);
};

module.exports = {
  logAudit,
};
