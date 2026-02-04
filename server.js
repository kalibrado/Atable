const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3030;
const DATA_FILE = path.join(__dirname, 'data', 'data.json');

// Middleware pour parser le JSON et servir les fichiers statiques
app.use(express.json());
app.use(express.static('public'));

/**
 * Initialise le fichier data.json s'il n'existe pas
 */
async function initializeDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch (error) {
    // Le fichier n'existe pas, on le crée avec des données par défaut
    const defaultData = {
      lundi: { midi: '', soir: '' },
      mardi: { midi: '', soir: '' },
      mercredi: { midi: '', soir: '' },
      jeudi: { midi: '', soir: '' },
      vendredi: { midi: '', soir: '' },
      samedi: { midi: '', soir: '' },
      dimanche: { midi: '', soir: '' }
    };
    await fs.writeFile(DATA_FILE, JSON.stringify(defaultData, null, 2));
    console.log('📝 Fichier data.json créé avec succès');
  }
}

/**
 * Route GET - Récupère toutes les données des repas
 */
app.get('/api/meals', async (req, res) => {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Erreur lors de la lecture des données:', error);
    res.status(500).json({ error: 'Erreur lors de la lecture des données' });
  }
});

/**
 * Route PUT - Met à jour les données des repas
 */
app.put('/api/meals', async (req, res) => {
  try {
    const newData = req.body;
    
    // Validation basique des données
    const validDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
    const isValid = Object.keys(newData).every(day => 
      validDays.includes(day) && 
      newData[day].hasOwnProperty('midi') && 
      newData[day].hasOwnProperty('soir')
    );
    
    if (!isValid) {
      return res.status(400).json({ error: 'Format de données invalide' });
    }
    
    // Écriture du fichier
    await fs.writeFile(DATA_FILE, JSON.stringify(newData, null, 2));
    res.json({ success: true, message: 'Données sauvegardées avec succès' });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde des données:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde des données' });
  }
});

/**
 * Démarrage du serveur
 */
async function startServer() {
  await initializeDataFile();
  app.listen(PORT, () => {
    console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`📊 Fichier de données: ${DATA_FILE}`);
  });
}

startServer();
