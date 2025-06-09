const venom = require('venom-bot');
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

let client;
let qrCodeData = null;
let isConnected = false;

// Venom-bot setup
venom
  .create({
    session: 'aviator-bot-session',
    multidevice: false,
    headless: true,
    qrTimeout: 0,
    logQR: false,
    disableWelcome: true,
    createPathFileToken: true,
    folderNameToken: 'tokens',
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
    onQRCode: (base64Qr) => {
      // stocker le QR code pour l'afficher dans la page web
      qrCodeData = base64Qr;
      console.log('QR code reçu');
    }
  })
  .then((c) => {
    client = c;
    isConnected = true;
    console.log('WhatsApp connecté');
  })
  .catch((error) => {
    console.error('Erreur Venom:', error);
  });

// Route principale affiche QR code ou message connecté
app.get('/', (req, res) => {
  if (!isConnected && qrCodeData) {
    // afficher l'image QR dans la page
    res.send(`
      <h1>Scanne le QR code avec WhatsApp pour connecter le bot</h1>
      <img src="${qrCodeData}" alt="QR Code" />
      <p>Recharge la page si tu ne vois rien</p>
    `);
  } else if (isConnected) {
    res.send('<h1>Bot WhatsApp connecté ✅</h1><p>Tu peux maintenant utiliser le webhook /predict</p>');
  } else {
    res.send('<h1>Chargement...</h1>');
  }
});

// Webhook prédiction
app.post('/predict', async (req, res) => {
  try {
    if (!isConnected) {
      return res.status(503).json({ error: 'Bot pas connecté encore' });
    }

    const { to } = req.body;
    if (!to) {
      return res.status(400).json({ error: 'Paramètre "to" manquant' });
    }

    const prediction = predictCrashMultiplier();
    const styled = styleMultiplier(prediction);

    await client.sendText(to, `🎯 Prédiction Aviator:\n${styled}`);

    res.json({ success: true, prediction });
  } catch (e) {
    console.error('Erreur sendText:', e);
    res.status(500).json({ error: 'Erreur interne' });
  }
});

// Fonction de prédiction aléatoire
function predictCrashMultiplier() {
  const r = Math.random();
  if (r < 0.7) return (Math.random() * (1.89 - 1.0) + 1.0).toFixed(2);
  else if (r < 0.9) return (Math.random() * (4.99 - 2.0) + 2.0).toFixed(2);
  else if (r < 0.99) return (Math.random() * (25 - 5) + 5).toFixed(2);
  else return (Math.random() * (100 - 25) + 25).toFixed(2);
}

// Style le message selon la valeur
function styleMultiplier(m) {
  const val = parseFloat(m);
  if (val < 2) return `🚨 ${val}x 💥🚀 Crash!`;
  if (val < 5) return `🟡 ${val}x ⚠️ Vol moyen...`;
  if (val < 25) return `🟢 ${val}x 🚀 En plein vol !`;
  return `🌈 ${val}x 💸 JACKPOT 💸`;
}

// Démarre serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
