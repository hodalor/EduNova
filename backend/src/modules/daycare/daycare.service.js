const crypto = require('crypto');

const { logAudit } = require('../../shared/services/audit-log.service');
const { store } = require('../../shared/store/runtime-store');

const listPresentNow = async ({ institutionId }) =>
  store.daycare.presentNow.filter((item) => item.institution_id === institutionId);

const addMilestone = async ({ institutionId, studentId, payload, userId, ip }) => {
  const current = store.daycare.milestones[studentId] || [];
  const milestone = {
    id: `mile-${current.length + 1}`,
    institution_id: institutionId,
    student_id: studentId,
    note: payload.note,
    age_group: payload.age_group || 'general',
    observed_at: payload.observed_at || new Date().toISOString(),
  };
  store.daycare.milestones[studentId] = [...current, milestone];

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_milestone',
    resourceId: milestone.id,
    newValues: milestone,
    ip,
  });

  return milestone;
};

const getMilestones = async ({ studentId }) => store.daycare.milestones[studentId] || [];

const authorizePickup = async ({ institutionId, payload, userId, ip }) => {
  const pin = String(Math.floor(100000 + Math.random() * 900000));
  const tokenId = crypto.randomUUID();
  const record = {
    id: tokenId,
    institution_id: institutionId,
    student_id: payload.student_id,
    authorized_for: payload.authorized_for,
    pin,
    expires_at: payload.expires_at || new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    used: false,
  };
  store.daycare.pickupPins[tokenId] = record;

  await logAudit({
    userId,
    action: 'CREATE',
    resourceType: 'daycare_pickup_pin',
    resourceId: tokenId,
    newValues: { ...record, pin: 'redacted' },
    ip,
  });

  return { pickup_id: tokenId, pin, expires_at: record.expires_at };
};

const verifyPickup = async ({ institutionId, payload, userId, ip }) => {
  const record = store.daycare.pickupPins[payload.pickup_id];
  if (!record || record.institution_id !== institutionId) {
    throw Object.assign(new Error('Pickup authorization not found.'), { statusCode: 404 });
  }
  if (record.used) {
    throw Object.assign(new Error('Pickup PIN has already been used.'), { statusCode: 400 });
  }
  if (record.pin !== payload.pin) {
    throw Object.assign(new Error('Invalid pickup PIN.'), { statusCode: 400 });
  }
  if (record.expires_at < new Date().toISOString()) {
    throw Object.assign(new Error('Pickup PIN has expired.'), { statusCode: 400 });
  }

  record.used = true;

  await logAudit({
    userId,
    action: 'UPDATE',
    resourceType: 'daycare_pickup_pin',
    resourceId: record.id,
    newValues: { ...record, pin: 'redacted' },
    ip,
  });

  return { verified: true, student_id: record.student_id, authorized_for: record.authorized_for };
};

module.exports = {
  listPresentNow,
  addMilestone,
  getMilestones,
  authorizePickup,
  verifyPickup,
};
