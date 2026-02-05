// ========================================
// Serveur Express avec authentification et notifications push
// Version refactorisée avec routeur modulaire
// ========================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;

// Managers
const usersManager = require('./server/managers/users-manager');
const pushManager = require('./server/managers/push-manager');
const notificationScheduler = require('./server/scheduler/notification-scheduler');
const { requireAuth, logRequest, protectAllRoutes } = require('./server/middleware/auth-middleware');

// Routeur principal
const setupRoutes = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3030;
const CONFIG = require('./config');

// ========================================
// Configuration des middlewares
// ========================================

app.use(express.json());
app.use(cookieParser());

// Configuration des sessions
app.use(session({
    secret: CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Mettre à true en HTTPS
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 jours
    }
}));

// Protection globale des routes
app.use(protectAllRoutes);

// Logging des requêtes (développement)
if (process.env.NODE_ENV !== 'production') {
    app.use(logRequest);
}

// ========================================
// Configuration des routes via le routeur
// ========================================

setupRoutes(app);

// ========================================
// Pages statiques
// ========================================

// Servir les fichiers statiques
app.use(express.static('public'));

// Page de login pour les non-authentifiés
app.get('/login', (req, res) => {
    // Si déjà connecté, rediriger vers l'app
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Page principale (nécessite authentification)
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================
// Gestion des erreurs 404
// ========================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path
    });
});

// ========================================
// Gestion globale des erreurs
// ========================================

app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'production'
            ? 'Une erreur est survenue'
            : err.message
    });
});

// ========================================
// Initialisation et démarrage
// ========================================

async function startServer() {
    try {
        // Créer le dossier data s'il n'existe pas
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });

        // Initialiser le fichier users.json
        await usersManager.initializeUsersFile();

        // Initialiser le système de notifications push
        const pushConfigured = pushManager.setupWebPush();
        if (pushConfigured) {
            await pushManager.initializeSubscriptionsFile();

            // Démarrer le scheduler de notifications
            notificationScheduler.startNotificationScheduler();
        } else {
            console.warn('⚠️  Notifications push non configurées');
            console.warn('   Exécutez: npm run generate-vapid');
        }

        // Démarrer le serveur
        app.listen(PORT, () => {
            console.log('========================================');
            console.log('🚀 Serveur Atable! démarré');
            console.log(`📍 URL: http://localhost:${PORT}`);
            console.log(`🔐 Mode: Authentification activée`);
            console.log(`🔔 Notifications: ${pushConfigured ? 'Activées' : 'Désactivées'}`);
            console.log('========================================');
        });
    } catch (error) {
        console.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
}

startServer();