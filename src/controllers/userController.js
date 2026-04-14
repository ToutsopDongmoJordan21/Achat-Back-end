const { User, Service } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const FONCTIONS = [
  'Directeur Général', 'Directeur de Production', 'Directeur Financier', 'Directeur Technique',
  'Responsable des Achats', 'Responsable Stock', 'Responsable RH', 'Responsable Qualité',
  'Chef de Service', 'Ingénieur', 'Technicien', 'Comptable', 'Secrétaire', 'Agent de Maîtrise',
  'Opérateur de Production', 'Magasinier', 'Chauffeur', 'Superieur Hierarchique', 'Autre'
];

exports.getFonctions = async (req, res) => {
  res.json(FONCTIONS);
};

exports.getAll = async (req, res) => {
  try {
    const { search, role, serviceId, page = 1, limit = 20 } = req.query;
    const where = {};
    if (search) where[Op.or] = [
      { nom:    { [Op.like]: `%${search}%` } },
      { prenom: { [Op.like]: `%${search}%` } },
      { email:  { [Op.like]: `%${search}%` } }
    ];
    if (role)      where.role      = role;
    if (serviceId) where.serviceId = serviceId;

    const { count, rows } = await User.findAndCountAll({
      where,
      include: [{ association: 'service' }],
      offset: (page - 1) * limit,
      limit: parseInt(limit),
      order: [['nom', 'ASC']]
    });

    res.json({ data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, { include: [{ association: 'service' }] });
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { nom, prenom, email, password, telephone, role, fonction, serviceId } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return res.status(400).json({ message: 'Email déjà utilisé' });

    // beforeCreate hook hashes the password automatically
    const user = await User.create({
      nom, prenom, email, password,
      telephone, role, fonction,
      serviceId: serviceId || null
    });

    // Return full user with service
    const created = await User.findByPk(user.id, { include: [{ association: 'service' }] });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const { nom, prenom, email, role, fonction, serviceId, isActive, telephone } = req.body;

    // Only update fields that are provided
    const updates = {};
    if (nom       !== undefined) updates.nom       = nom;
    if (prenom    !== undefined) updates.prenom    = prenom;
    if (email     !== undefined) updates.email     = email;
    if (role      !== undefined) updates.role      = role;
    if (fonction  !== undefined) updates.fonction  = fonction;
    if (serviceId !== undefined) updates.serviceId = serviceId || null;
    if (isActive  !== undefined) updates.isActive  = isActive;
    if (telephone !== undefined) updates.telephone = telephone;

    await user.update(updates);

    res.json(await User.findByPk(user.id, { include: [{ association: 'service' }] }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    await user.update({ isActive: false });
    res.json({ message: 'Utilisateur désactivé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });

    const tempPassword = Math.random().toString(36).slice(-8) + 'A1!';

    // Hash manually and use raw update to bypass double-hashing by the hook
    const hashed = await bcrypt.hash(tempPassword, 12);
    await User.update(
      { password: hashed },
      { where: { id: user.id }, individualHooks: false }
    );

    res.json({ message: 'Mot de passe réinitialisé', temporaryPassword: tempPassword });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};