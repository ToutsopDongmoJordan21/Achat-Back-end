const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PurchaseRequest = sequelize.define('PurchaseRequest', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  numero: { type: DataTypes.STRING(30), unique: true },
  designation: { type: DataTypes.STRING(500), allowNull: false },
  unite: { type: DataTypes.STRING(50), allowNull: false },
  utilisation: { type: DataTypes.TEXT, allowNull: false },
  quantite: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  statut: {
    type: DataTypes.ENUM(
      'brouillon', 'soumis', 'valide_superieur', 'valide_directeur',
      'en_cours_achat', 'valide_stock', 'rejete'
    ),
    defaultValue: 'soumis'
  },
  niveauActuel: {
    type: DataTypes.ENUM('emetteur', 'superieur', 'directeur', 'achat', 'stock'),
    defaultValue: 'superieur',
    field: 'niveau_actuel'
  },
  createurId: { type: DataTypes.UUID, field: 'createur_id' },
  serviceId: { type: DataTypes.UUID, field: 'service_id' },
  superieurId: { type: DataTypes.UUID, field: 'superieur_id' },
  directeurId: { type: DataTypes.UUID, field: 'directeur_id' },
  achatId: { type: DataTypes.UUID, field: 'achat_id' },
  stockId: { type: DataTypes.UUID, field: 'stock_id' },
  commentaireSuperieur: { type: DataTypes.TEXT, field: 'commentaire_superieur' },
  commentaireDirecteur: { type: DataTypes.TEXT, field: 'commentaire_directeur' },
  commentaireAchat: { type: DataTypes.TEXT, field: 'commentaire_achat' },
  commentaireStock: { type: DataTypes.TEXT, field: 'commentaire_stock' },
  dateValidationSuperieur: { type: DataTypes.DATE, field: 'date_validation_superieur' },
  dateValidationDirecteur: { type: DataTypes.DATE, field: 'date_validation_directeur' },
  dateValidationAchat: { type: DataTypes.DATE, field: 'date_validation_achat' },
  dateValidationStock: { type: DataTypes.DATE, field: 'date_validation_stock' },
  motifRejet: { type: DataTypes.TEXT, field: 'motif_rejet' }
}, {
  tableName: 'purchase_requests',
  underscored: true,
  hooks: {
    beforeCreate: async (req) => {
      const count = await PurchaseRequest.count();
      const year = new Date().getFullYear();
      req.numero = `DA-${year}-${String(count + 1).padStart(5, '0')}`;
    }
  }
});

module.exports = PurchaseRequest;
