const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, field: 'request_id' },
  uploadedById: { type: DataTypes.UUID, field: 'uploaded_by_id' },
  filename: { type: DataTypes.STRING(255) },
  originalName: { type: DataTypes.STRING(255), field: 'original_name' },
  filePath: { type: DataTypes.STRING(500), field: 'file_path' },
  fileSize: { type: DataTypes.INTEGER, field: 'file_size' },
  mimeType: { type: DataTypes.STRING(100), field: 'mime_type' },
  montant: { type: DataTypes.DECIMAL(15, 2) },
  description: { type: DataTypes.TEXT }
}, {
  tableName: 'invoices',
  underscored: true
});

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, field: 'user_id' },
  requestId: { type: DataTypes.UUID, field: 'request_id' },
  titre: { type: DataTypes.STRING(255) },
  message: { type: DataTypes.TEXT },
  type: {
    type: DataTypes.ENUM('info', 'success', 'warning', 'error'),
    defaultValue: 'info'
  },
  lu: { type: DataTypes.BOOLEAN, defaultValue: false },
  dateLu: { type: DataTypes.DATE, field: 'date_lu' }
}, {
  tableName: 'notifications',
  underscored: true
});

module.exports = { Invoice, Notification };
