/**
 * SCRIPT DE DIAGNOSTIC ET CORRECTION
 * Exécutez: node fix-admin.js
 * Depuis le dossier: backend/
 */

 require('dotenv').config();
 const bcrypt = require('bcryptjs');
 
 async function fixAdmin() {
   const { sequelize } = require('./src/models');
   const { User } = require('./src/models');
 
   try {
     await sequelize.authenticate();
     console.log('✅ Base de données connectée\n');
 
     // ── 1. Chercher tous les admins ──
     const admins = await User.findAll({ where: { role: 'super_admin' }, raw: true });
     console.log(`📋 Super admins trouvés: ${admins.length}`);
 
     if (admins.length === 0) {
       console.log('⚠️  Aucun admin trouvé — création en cours...');
       await User.create({
         nom: 'Admin', prenom: 'Super', email: 'admin@system.com',
         password: 'Admin@123', role: 'super_admin', fonction: 'Administrateur Système'
       });
       console.log('✅ Admin créé avec succès');
       process.exit(0);
     }
 
     for (const admin of admins) {
       console.log('\n─────────────────────────────────');
       console.log(`ID:       ${admin.id}`);
       console.log(`Email:    ${admin.email}`);
       console.log(`Password: ${admin.password}`);
       console.log(`IsHashed: ${admin.password?.startsWith('$2') ? 'OUI ✅' : 'NON ❌ (plain text!)'}`);
       console.log(`IsActive: ${admin.is_active}`);
 
       // ── 2. Test de comparaison ──
       if (admin.password?.startsWith('$2')) {
         const ok = await bcrypt.compare('Admin@123', admin.password);
         console.log(`bcrypt compare('Admin@123'): ${ok ? 'OK ✅' : 'ÉCHOUE ❌'}`);
       }
 
       // ── 3. Forcer le hash correct ──
       console.log('\n🔧 Application du hash correct...');
       const newHash = await bcrypt.hash('Admin@123', 12);
 
       // Mise à jour directe SQL sans passer par les hooks Sequelize
       await sequelize.query(
         `UPDATE users SET password = ?, is_active = 1 WHERE id = ?`,
         { replacements: [newHash, admin.id] }
       );
       console.log('✅ Mot de passe mis à jour en base');
 
       // ── 4. Vérification finale ──
       const [rows] = await sequelize.query(
         `SELECT password FROM users WHERE id = ?`,
         { replacements: [admin.id] }
       );
       const saved = rows[0]?.password;
       const verified = await bcrypt.compare('Admin@123', saved);
       console.log(`\n🎯 Vérification finale: ${verified ? 'SUCCÈS ✅' : 'ÉCHEC ❌'}`);
 
       if (verified) {
         console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
         console.log('✅ Connexion prête !');
         console.log(`   Email    : ${admin.email}`);
         console.log('   Password : Admin@123');
         console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
       }
     }
 
     process.exit(0);
   } catch (err) {
     console.error('❌ Erreur:', err.message);
     console.error(err);
     process.exit(1);
   }
 }
 
 fixAdmin();