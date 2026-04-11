const { Service, User } = require('../models');

exports.getAll = async (req, res) => {
  try {
    const services = await Service.findAll({
      include: [{ association: 'membres', attributes: ['id', 'nom', 'prenom', 'role'] }],
      order: [['nom', 'ASC']]
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nom, description, code } = req.body;
    if (!nom) return res.status(400).json({ message: 'Nom du service requis' });
    const service = await Service.create({ nom, description, code });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    await service.update(req.body);
    res.json(service);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service non trouvé' });
    await service.update({ isActive: false });
    res.json({ message: 'Service désactivé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
