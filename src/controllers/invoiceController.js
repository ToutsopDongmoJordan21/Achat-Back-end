const { Invoice, PurchaseRequest } = require('../models');
const path = require('path');
const fs = require('fs');

exports.addInvoice = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await PurchaseRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: 'Demande non trouvée' });
    if (!['valide_directeur', 'en_cours_achat'].includes(request.statut)) {
      return res.status(400).json({ message: 'Factures seulement ajoutables par le service Achats' });
    }
    if (!req.file) return res.status(400).json({ message: 'Fichier requis' });

    const invoice = await Invoice.create({
      requestId,
      uploadedById: req.user.id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      filePath: `/uploads/invoices/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      montant: req.body.montant || null,
      description: req.body.description || null
    });
    res.status(201).json(invoice);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByPk(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Facture non trouvée' });
    const filePath = path.join(process.cwd(), invoice.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await invoice.destroy();
    res.json({ message: 'Facture supprimée' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
