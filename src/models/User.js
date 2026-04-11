const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nom: { type: DataTypes.STRING(100), allowNull: false },
  prenom: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
  password: { type: DataTypes.STRING(255), allowNull: false },
  telephone: { type: DataTypes.STRING(20) },
  photoProfile: { type: DataTypes.STRING(500), field: 'photo_profile' },
  role: {
    type: DataTypes.ENUM('super_admin', 'employe', 'superieur_hierarchique', 'directeur_production', 'achat', 'responsable_stock'),
    allowNull: false,
    defaultValue: 'employe'
  },
  fonction: { type: DataTypes.STRING(150) },
  serviceId: { type: DataTypes.UUID, field: 'service_id' },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_active' },
  lastLogin: { type: DataTypes.DATE, field: 'last_login' },
  notificationsEnabled: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'notifications_enabled' }
}, {
  tableName: 'users',
  underscored: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) user.password = await bcrypt.hash(user.password, 12);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) user.password = await bcrypt.hash(user.password, 12);
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = User;