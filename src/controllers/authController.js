const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const generateToken = (user) => jwt.sign(
  { id: user.id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
);

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('\n── LOGIN ATTEMPT ──');
    console.log('Email   :', email);

    if (!email || !password) {
      return res.status(400).json({ message: 'Email et mot de passe requis' });
    }

    const user = await User.findOne({
      where: { email },
      include: [{ association: 'service' }]
    });

    console.log('User found :', user ? 'OUI' : 'NON');

    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    console.log('isActive   :', user.isActive);
    console.log('Hash prefix:', user.password ? user.password.substring(0, 7) : 'NULL');
    console.log('Is bcrypt  :', user.password && user.password.startsWith('$2') ? 'OUI' : 'NON — mot de passe en clair!');

    if (!user.isActive) {
      return res.status(401).json({ message: 'Compte désactivé' });
    }

    if (!user.password) {
      return res.status(401).json({ message: 'Mot de passe non configuré' });
    }

    // Always use bcrypt.compare directly (bypass instance method)
    const isValid = await bcrypt.compare(password, user.password);
    console.log('bcrypt result:', isValid ? 'VALID ✅' : 'INVALID ❌');

    if (!isValid) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    await user.update({ lastLogin: new Date() });
    const token = generateToken(user);
    console.log('Login success for:', email);

    return res.json({ token, user });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: err.message });
  }
};

exports.me = async (req, res) => {
  res.json(req.user);
};

exports.updateProfile = async (req, res) => {
  try {
    const { nom, prenom, telephone, notificationsEnabled } = req.body;
    const updates = {};
    if (nom !== undefined) updates.nom = nom;
    if (prenom !== undefined) updates.prenom = prenom;
    if (telephone !== undefined) updates.telephone = telephone;
    if (notificationsEnabled !== undefined) updates.notificationsEnabled = notificationsEnabled;
    if (req.file) updates.photoProfile = `/uploads/profiles/${req.file.filename}`;
    await req.user.update(updates);
    const updated = await User.findByPk(req.user.id, { include: [{ association: 'service' }] });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const isValid = await bcrypt.compare(currentPassword, req.user.password);
    if (!isValid) return res.status(400).json({ message: 'Mot de passe actuel incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    await User.update({ password: hashed }, { where: { id: req.user.id }, individualHooks: false });
    res.json({ message: 'Mot de passe modifié avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};