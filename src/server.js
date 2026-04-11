require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { sequelize } = require('./models');
const routes = require('./routes');
const { setSocketIO } = require('./utils/notificationService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:4200', credentials: true }
});

setSocketIO(io);

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:4200', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/api', routes);

// Socket.IO
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Authentication error'));
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch { next(new Error('Invalid token')); }
});

io.on('connection', (socket) => {
  socket.join(`user_${socket.userId}`);
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;

// ── Services à créer automatiquement ──────────────────────────────────────────
const DEFAULT_SERVICES = [
  { nom: 'Direction Générale',         code: 'DG',   description: 'Direction Générale de l\'entreprise' },
  { nom: 'Direction de Production',    code: 'DP',   description: 'Gestion et supervision de la production' },
  { nom: 'Direction Financière',       code: 'DF',   description: 'Gestion financière et comptabilité' },
  { nom: 'Direction Technique',        code: 'DT',   description: 'Maintenance et support technique' },
  { nom: 'Service des Achats',         code: 'ACH',  description: 'Gestion des achats et approvisionnements' },
  { nom: 'Service Stock & Magasin',    code: 'STK',  description: 'Gestion des stocks et du magasin' },
  { nom: 'Ressources Humaines',        code: 'RH',   description: 'Gestion du personnel et des ressources humaines' },
  { nom: 'Service Qualité',            code: 'QUA',  description: 'Contrôle qualité et certification' },
  { nom: 'Service Informatique',       code: 'IT',   description: 'Systèmes d\'information et informatique' },
  { nom: 'Service Commercial',         code: 'COM',  description: 'Ventes et relations clients' },
  { nom: 'Service Juridique',          code: 'JUR',  description: 'Affaires juridiques et conformité' },
  { nom: 'Service Maintenance',        code: 'MAI',  description: 'Maintenance des équipements et infrastructures' },
  { nom: 'Service Logistique',         code: 'LOG',  description: 'Transport et logistique' },
  { nom: 'Service Sécurité',           code: 'SEC',  description: 'Sécurité industrielle et des biens' },
];

// ── Seed function ──────────────────────────────────────────────────────────────
const seedDatabase = async () => {
  const { Service } = require('./models');

  let created = 0;
  for (const svc of DEFAULT_SERVICES) {
    const existing = await Service.findOne({ where: { code: svc.code } });
    if (!existing) {
      await Service.create(svc);
      created++;
    }
  }

  if (created > 0) {
    console.log(`✅ ${created} service(s) créé(s) automatiquement`);
  } else {
    console.log(`ℹ️  Services déjà présents (${DEFAULT_SERVICES.length} services)`);
  }
};

// ── Start ──────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    await sequelize.sync({ alter: true });
    console.log('✅ Models synchronized');

    await seedDatabase();

    server.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
};

start();