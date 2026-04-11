const sequelize = require('../config/database');
const User = require('./User');
const Service = require('./Service');
const PurchaseRequest = require('./PurchaseRequest');
const { Invoice, Notification } = require('./Invoice');

// Associations
User.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
Service.hasMany(User, { foreignKey: 'service_id', as: 'membres' });

PurchaseRequest.belongsTo(User, { foreignKey: 'createur_id', as: 'createur' });
PurchaseRequest.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });
PurchaseRequest.belongsTo(User, { foreignKey: 'superieur_id', as: 'superieur' });
PurchaseRequest.belongsTo(User, { foreignKey: 'directeur_id', as: 'directeur' });
PurchaseRequest.belongsTo(User, { foreignKey: 'achat_id', as: 'achat' });
PurchaseRequest.belongsTo(User, { foreignKey: 'stock_id', as: 'stock' });

Invoice.belongsTo(PurchaseRequest, { foreignKey: 'request_id', as: 'demande' });
Invoice.belongsTo(User, { foreignKey: 'uploaded_by_id', as: 'uploadedBy' });
PurchaseRequest.hasMany(Invoice, { foreignKey: 'request_id', as: 'factures' });

Notification.belongsTo(User, { foreignKey: 'user_id', as: 'destinataire' });
Notification.belongsTo(PurchaseRequest, { foreignKey: 'request_id', as: 'demande' });
User.hasMany(Notification, { foreignKey: 'user_id', as: 'notifications' });

module.exports = { sequelize, User, Service, PurchaseRequest, Invoice, Notification };
