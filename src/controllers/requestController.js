const { PurchaseRequest, User, Service, Invoice, Notification } = require('../models');
const { notifyWorkflowStep } = require('../utils/notificationService');
const { generatePDF } = require('../utils/pdfGenerator');
const { Op } = require('sequelize');

const INCLUDE_ALL = [
  { model: User, as: 'createur', attributes: ['id', 'nom', 'prenom', 'email', 'fonction', 'photoProfile'] },
  { model: Service, as: 'service' },
  { model: User, as: 'superieur', attributes: ['id', 'nom', 'prenom', 'email', 'fonction'] },
  { model: User, as: 'directeur', attributes: ['id', 'nom', 'prenom', 'email', 'fonction'] },
  { model: User, as: 'achat', attributes: ['id', 'nom', 'prenom', 'email', 'fonction'] },
  { model: User, as: 'stock', attributes: ['id', 'nom', 'prenom', 'email', 'fonction'] },
  { model: Invoice, as: 'factures', include: [{ model: User, as: 'uploadedBy', attributes: ['id', 'nom', 'prenom'] }] }
];

exports.getAll = async (req, res) => {
  try {
    const { statut, page = 1, limit = 20, search } = req.query;
    const user = req.user;
    const where = {};
    if (statut) where.statut = statut;
    if (search) where.numero = { [Op.like]: `%${search}%` };

    // Filter by role visibility
    if (user.role === 'employe') {
      where.createurId = user.id;
    } else if (user.role === 'superieur_hierarchique') {
      where[Op.or] = [{ createurId: user.id }, { superieurId: user.id }];
    } else if (user.role === 'directeur_production') {
      where[Op.or] = [{ createurId: user.id }, { directeurId: user.id }];
    } else if (user.role === 'achat') {
      where[Op.or] = [{ createurId: user.id }, { achatId: user.id }];
    } else if (user.role === 'responsable_stock') {
      where[Op.or] = [{ createurId: user.id }, { stockId: user.id }];
    }

    const { count, rows } = await PurchaseRequest.findAndCountAll({
      where, include: INCLUDE_ALL,
      offset: (page - 1) * limit, limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });
    res.json({ data: rows, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { designation, unite, utilisation, quantite } = req.body;
    const user = req.user;

    // Find hierarchical superior of this service
    const superieur = await User.findOne({
      where: { serviceId: user.serviceId, role: 'superieur_hierarchique', isActive: true }
    });
    const directeur = await User.findOne({ where: { role: 'directeur_production', isActive: true } });
    const achat = await User.findOne({ where: { role: 'achat', isActive: true } });
    const stock = await User.findOne({ where: { role: 'responsable_stock', isActive: true } });

    const request = await PurchaseRequest.create({
      designation, unite, utilisation, quantite,
      createurId: user.id,
      serviceId: user.serviceId,
      superieurId: superieur?.id,
      directeurId: directeur?.id,
      achatId: achat?.id,
      stockId: stock?.id,
      statut: 'soumis',
      niveauActuel: 'superieur'
    });

    // Notify superior
    if (superieur) {
      await notifyWorkflowStep({
        request,
        toUserId: superieur.id,
        stepName: 'Nouvelle demande à valider',
        message: `Une nouvelle demande d'achat (${request.numero}) de ${user.prenom} ${user.nom} attend votre validation.`
      });
    }

    const created = await PurchaseRequest.findByPk(request.id, { include: INCLUDE_ALL });
    res.status(201).json(created);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.validateBySuperieur = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, action } = req.body; // action: 'valider' | 'rejeter'
    const request = await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    if (request.superieurId !== req.user.id) return res.status(403).json({ message: 'Non autorisé' });
    if (request.statut !== 'soumis') return res.status(400).json({ message: 'Cette demande ne peut plus être traitée à ce niveau' });

    if (action === 'rejeter') {
      await request.update({ statut: 'rejete', motifRejet: commentaire, commentaireSuperieur: commentaire, niveauActuel: 'emetteur' });
      await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'Demande rejetée', message: `Votre demande ${request.numero} a été rejetée par le supérieur hiérarchique. Motif: ${commentaire || 'Non précisé'}` });
    } else {
      await request.update({
        statut: 'valide_superieur', commentaireSuperieur: commentaire,
        dateValidationSuperieur: new Date(), niveauActuel: 'directeur'
      });
      await notifyWorkflowStep({ request, toUserId: request.directeurId, stepName: 'Demande à valider', message: `La demande ${request.numero} validée par le supérieur hiérarchique attend votre approbation.` });
      await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'Demande validée', message: `Votre demande ${request.numero} a été validée par votre supérieur hiérarchique.` });
    }
    res.json(await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.validateByDirecteur = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire, action } = req.body;
    const request = await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    if (request.statut !== 'valide_superieur') return res.status(400).json({ message: 'Demande pas encore validée par le supérieur' });

    if (action === 'rejeter') {
      await request.update({ statut: 'rejete', motifRejet: commentaire, commentaireDirecteur: commentaire, niveauActuel: 'emetteur' });
      await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'Demande rejetée', message: `Votre demande ${request.numero} a été rejetée par le Directeur de Production.` });
    } else {
      await request.update({
        statut: 'valide_directeur', commentaireDirecteur: commentaire,
        dateValidationDirecteur: new Date(), niveauActuel: 'achat'
      });
      await notifyWorkflowStep({ request, toUserId: request.achatId, stepName: 'Demande à traiter', message: `La demande ${request.numero} est approuvée et transmise au service Achats.` });
      await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'Demande approuvée', message: `Votre demande ${request.numero} a été approuvée par le Directeur de Production.` });
    }
    res.json(await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.processAchat = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;
    const request = await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    if (request.statut !== 'valide_directeur') return res.status(400).json({ message: 'Demande pas encore validée par le directeur' });

    await request.update({
      statut: 'en_cours_achat', commentaireAchat: commentaire,
      dateValidationAchat: new Date(), niveauActuel: 'stock'
    });
    await notifyWorkflowStep({ request, toUserId: request.stockId, stepName: 'Demande traitée', message: `La demande ${request.numero} a été traitée par les Achats et transmise au Stock.` });
    await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'En cours de livraison', message: `Votre demande ${request.numero} est en cours de traitement aux Achats.` });
    res.json(await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.validateByStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { commentaire } = req.body;
    const request = await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    if (request.statut !== 'en_cours_achat') return res.status(400).json({ message: 'Demande pas encore traitée par les achats' });

    await request.update({
      statut: 'valide_stock', commentaireStock: commentaire,
      dateValidationStock: new Date(), niveauActuel: 'stock'
    });
    await notifyWorkflowStep({ request, toUserId: request.createurId, stepName: 'Demande clôturée', message: `Votre demande ${request.numero} a été clôturée par le Responsable Stock.` });
    res.json(await PurchaseRequest.findByPk(id, { include: INCLUDE_ALL }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.downloadPDF = async (req, res) => {
  try {
    const request = await PurchaseRequest.findByPk(req.params.id, { include: INCLUDE_ALL });
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    const pdf = await generatePDF(request);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="demande-${request.numero}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const { PurchaseRequest } = require('../models');
    const total = await PurchaseRequest.count();
    const byStatut = await PurchaseRequest.findAll({
      attributes: ['statut', [require('sequelize').fn('COUNT', '*'), 'count']],
      group: ['statut'], raw: true
    });
    res.json({ total, byStatut });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
