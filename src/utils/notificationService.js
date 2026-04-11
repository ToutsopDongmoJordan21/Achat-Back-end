const { Notification } = require('../models');

let io = null;

const setSocketIO = (socketIO) => { io = socketIO; };

const createNotification = async ({ userId, requestId, titre, message, type = 'info' }) => {
  const notif = await Notification.create({ userId, requestId, titre, message, type });
  if (io) {
    io.to(`user_${userId}`).emit('notification', {
      id: notif.id, titre, message, type, createdAt: notif.createdAt
    });
  }
  return notif;
};

const notifyWorkflowStep = async ({ request, toUserId, stepName, message }) => {
  if (!toUserId) return;
  await createNotification({
    userId: toUserId,
    requestId: request.id,
    titre: `Demande ${request.numero} - ${stepName}`,
    message,
    type: 'info'
  });
};

module.exports = { setSocketIO, createNotification, notifyWorkflowStep };
