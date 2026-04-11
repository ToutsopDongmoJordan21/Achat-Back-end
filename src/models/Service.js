const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Service = sequelize.define('Service', {
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  nom: { type: DataTypes.STRING(150), allowNull: false },
  description: { type: DataTypes.TEXT },
  code: { type: DataTypes.STRING(20), unique: true },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' }
}, {
  tableName: 'services',
  underscored: true
});

module.exports = Service;
