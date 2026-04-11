const { Notification, PurchaseRequest } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      include: [{ association: 'demande', attributes: ['id', 'numero', 'statut'] }],
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    await Notification.update(
      { lu: true, dateLu: new Date() },
      { where: { id: req.params.id, userId: req.user.id } }
    );
    res.json({ message: 'Notification marquée comme lue' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await Notification.update(
      { lu: true, dateLu: new Date() },
      { where: { userId: req.user.id, lu: false } }
    );
    res.json({ message: 'Toutes les notifications marquées comme lues' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, lu: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
