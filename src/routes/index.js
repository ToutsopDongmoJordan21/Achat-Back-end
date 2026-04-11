const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate, authorize } = require('../middleware/auth');
const authCtrl    = require('../controllers/authController');
const userCtrl    = require('../controllers/userController');
const serviceCtrl = require('../controllers/serviceController');
const requestCtrl = require('../controllers/requestController');
const invoiceCtrl = require('../controllers/invoiceController');
const notifCtrl   = require('../controllers/notificationController');

const router = express.Router();

// ── Multer storage configs ─────────────────────────────────────────────────────
const profileStorage = multer.diskStorage({
  destination: './uploads/profiles',
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const invoiceStorage = multer.diskStorage({
  destination: './uploads/invoices',
  filename: (req, file, cb) => cb(null, `${uuidv4()}${path.extname(file.originalname)}`)
});
const uploadProfile = multer({ storage: profileStorage, limits: { fileSize: 5  * 1024 * 1024 } });
const uploadInvoice = multer({ storage: invoiceStorage, limits: { fileSize: 20 * 1024 * 1024 } });

// ── Auth ───────────────────────────────────────────────────────────────────────
router.post('/auth/login',   authCtrl.login);
router.get ('/auth/me',      authenticate, authCtrl.me);
router.put ('/auth/profile', authenticate, uploadProfile.single('photo'), authCtrl.updateProfile);
router.put ('/auth/password',authenticate, authCtrl.changePassword);

// ── Users ──────────────────────────────────────────────────────────────────────
// NOTE: /users/fonctions MUST come before /users/:id to avoid conflict
router.get ('/users/fonctions',            userCtrl.getFonctions);
router.get ('/users',                      authenticate, authorize('super_admin'),userCtrl.getAll);
router.post('/users',                      authenticate, authorize('super_admin'), userCtrl.create);
router.get ('/users/:id',                  authenticate, userCtrl.getById);
router.put ('/users/:id',                  authenticate, authorize('super_admin'), userCtrl.update);
router.delete('/users/:id',               authenticate, authorize('super_admin'), userCtrl.delete);
router.post('/users/:id/reset-password',  authenticate, authorize('super_admin'), userCtrl.resetPassword);

// ── Services ───────────────────────────────────────────────────────────────────
// Public GET so that the create-user form can load services without extra auth
router.get   ('/services',     serviceCtrl.getAll);
router.post  ('/services',     authenticate, authorize('super_admin'), serviceCtrl.create);
router.put   ('/services/:id', authenticate, authorize('super_admin'), serviceCtrl.update);
router.delete('/services/:id', authenticate, authorize('super_admin'), serviceCtrl.delete);

// ── Purchase Requests ──────────────────────────────────────────────────────────
// NOTE: /requests/stats MUST come before /requests/:id
router.get ('/requests/stats', authenticate, requestCtrl.getStats);
router.get ('/requests',       authenticate, requestCtrl.getAll);
router.post('/requests',       authenticate, requestCtrl.create);
router.get ('/requests/:id',   authenticate, requestCtrl.getById);
router.post('/requests/:id/valider-superieur', authenticate, authorize('superieur_hierarchique'), requestCtrl.validateBySuperieur);
router.post('/requests/:id/valider-directeur', authenticate, authorize('directeur_production'),   requestCtrl.validateByDirecteur);
router.post('/requests/:id/traiter-achat',     authenticate, authorize('achat'),                  requestCtrl.processAchat);
router.post('/requests/:id/valider-stock',     authenticate, authorize('responsable_stock'),       requestCtrl.validateByStock);
router.get ('/requests/:id/pdf',               authenticate, requestCtrl.downloadPDF);

// ── Invoices ───────────────────────────────────────────────────────────────────
router.post  ('/requests/:requestId/factures', authenticate, authorize('achat'), uploadInvoice.single('file'), invoiceCtrl.addInvoice);
router.delete('/factures/:id',                 authenticate, authorize('achat', 'super_admin'), invoiceCtrl.deleteInvoice);

// ── Notifications ──────────────────────────────────────────────────────────────
// NOTE: /notifications/mark-all-read MUST come before /notifications/:id/read
router.get('/notifications',                  authenticate, notifCtrl.getAll);
router.get('/notifications/unread-count',     authenticate, notifCtrl.getUnreadCount);
router.put('/notifications/mark-all-read',    authenticate, notifCtrl.markAllRead);
router.put('/notifications/:id/read',         authenticate, notifCtrl.markRead);

module.exports = router;