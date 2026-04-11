const PDFDocument = require('pdfkit');

const STATUT_LABELS = {
  brouillon: 'Brouillon', soumis: 'Soumis', valide_superieur: 'Validé (Supérieur)',
  valide_directeur: 'Validé (Directeur)', en_cours_achat: 'En cours (Achats)',
  valide_stock: 'Clôturé (Stock)', rejete: 'Rejeté'
};

const NIVEAU_LABELS = {
  emetteur: 'Émetteur', superieur: 'Supérieur Hiérarchique',
  directeur: 'Directeur de Production', achat: 'Service Achats', stock: 'Responsable Stock'
};

const generatePDF = (request) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    const primary = '#1a237e';
    const accent = '#e65100';
    const gray = '#757575';

    // Header
    doc.rect(0, 0, 595, 100).fill(primary);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
      .text('DEMANDE D\'ACHAT', 50, 30, { align: 'center' });
    doc.fontSize(12).font('Helvetica')
      .text(`Numéro: ${request.numero}`, 50, 58, { align: 'center' });
    doc.fillColor('#333').fontSize(10).font('Helvetica')
      .text(`Générée le: ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 50, 110, { align: 'right' });

    // Status badge
    const statutLabel = STATUT_LABELS[request.statut] || request.statut;
    const statusColors = { valide_stock: '#2e7d32', rejete: '#c62828', soumis: '#1565c0', valide_superieur: '#6a1b9a', valide_directeur: '#e65100', en_cours_achat: '#f57f17' };
    const sc = statusColors[request.statut] || '#546e7a';
    doc.roundedRect(50, 120, 150, 24, 5).fill(sc);
    doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
      .text(statutLabel, 55, 127, { width: 140, align: 'center' });

    // Section helper
    const section = (title, y) => {
      doc.fillColor(primary).fontSize(11).font('Helvetica-Bold').text(title, 50, y);
      doc.moveTo(50, y + 16).lineTo(545, y + 16).strokeColor(primary).lineWidth(1).stroke();
    };

    const field = (label, value, x, y, w = 220) => {
      doc.fillColor(gray).fontSize(8).font('Helvetica').text(label.toUpperCase(), x, y);
      doc.fillColor('#212121').fontSize(10).font('Helvetica-Bold').text(value || 'N/A', x, y + 12, { width: w });
    };

    // Info section
    section('INFORMATIONS DE LA DEMANDE', 155);
    field('Désignation', request.designation, 50, 178, 490);
    field('Unité', request.unite, 50, 215);
    field('Quantité', String(request.quantite), 300, 215);
    doc.fillColor(gray).fontSize(8).font('Helvetica').text('UTILISATION', 50, 252);
    doc.fillColor('#212121').fontSize(10).font('Helvetica').text(request.utilisation || 'N/A', 50, 264, { width: 490 });

    // Createur
    section('ÉMETTEUR', 305);
    const c = request.createur;
    if (c) {
      field('Nom & Prénom', `${c.prenom} ${c.nom}`, 50, 328);
      field('Email', c.email, 300, 328);
      field('Fonction', c.fonction || 'N/A', 50, 365);
      field('Service', request.service?.nom || 'N/A', 300, 365);
    }
    field('Date de création', request.createdAt ? new Date(request.createdAt).toLocaleDateString('fr-FR') : 'N/A', 50, 402);

    // Workflow
    section('PARCOURS DE VALIDATION', 435);
    const steps = [
      { label: 'Supérieur Hiérarchique', user: request.superieur, date: request.dateValidationSuperieur, comment: request.commentaireSuperieur },
      { label: 'Directeur de Production', user: request.directeur, date: request.dateValidationDirecteur, comment: request.commentaireDirecteur },
      { label: 'Service Achats', user: request.achat, date: request.dateValidationAchat, comment: request.commentaireAchat },
      { label: 'Responsable Stock', user: request.stock, date: request.dateValidationStock, comment: request.commentaireStock }
    ];

    let sy = 460;
    steps.forEach((step, i) => {
      const validated = !!step.date;
      doc.circle(62, sy + 8, 6).fill(validated ? '#2e7d32' : '#bdbdbd');
      doc.fillColor(validated ? '#2e7d32' : '#9e9e9e').fontSize(9).font('Helvetica-Bold')
        .text(`${i + 1}. ${step.label}`, 76, sy + 2);
      if (step.user) {
        doc.fillColor('#616161').fontSize(8).font('Helvetica')
          .text(`${step.user.prenom} ${step.user.nom}${validated ? ' — ' + new Date(step.date).toLocaleDateString('fr-FR') : ''}`, 76, sy + 14);
      }
      if (step.comment) {
        doc.fillColor('#9e9e9e').fontSize(7).text(`"${step.comment}"`, 76, sy + 26, { width: 460 });
        sy += 42;
      } else {
        sy += 32;
      }
    });

    if (request.factures?.length) {
      section('FACTURES ASSOCIÉES', sy + 10);
      sy += 35;
      request.factures.forEach((f) => {
        doc.fillColor('#212121').fontSize(9).font('Helvetica')
          .text(`• ${f.originalName}${f.montant ? ' — ' + Number(f.montant).toLocaleString('fr-FR') + ' FCFA' : ''}`, 60, sy);
        sy += 16;
      });
    }

    // Footer
    const footerY = 790;
    doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor('#e0e0e0').stroke();
    doc.fillColor('#9e9e9e').fontSize(7).text('Document généré automatiquement — Système de Gestion des Demandes d\'Achat', 50, footerY + 5, { align: 'center' });

    doc.end();
  });
};

module.exports = { generatePDF };
