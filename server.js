// ========================================
// Serveur Express avec authentification et notifications push
// ========================================

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs').promises;

const usersManager = require('./server/managers/users-manager');
const pushManager = require('./server/managers/push-manager');
const notificationScheduler = require('./server/scheduler/notification-scheduler');
const { requireAuth, logRequest, protectAllRoutes } = require('./server/middleware/auth-middleware');
const setupRoutes = require('./server/routes');

const app = express();
const PORT = process.env.PORT || 3030;
const CONFIG = require('./config');

// ========================================
// Configuration des middlewares
// ========================================

app.use(express.json());
app.use(cookieParser());

app.use(session({
    secret: CONFIG.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
}));

app.use(protectAllRoutes);

if (process.env.NODE_ENV !== 'production') {
    app.use(logRequest);
    app.use(express.static('public'));
} else {
    app.use(express.static('public', {
        maxAge: '7d',
        etag: true
    }));
}

// ========================================
// Configuration des routes
// ========================================

setupRoutes(app);

// ========================================
// Pages statiques
// ========================================

app.get('/login', (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================
// Gestion des erreurs
// ========================================

app.use((req, res) => {
    res.status(404).json({
        error: 'Route non trouvée',
        path: req.path
    });
});

app.use((err, req, res, next) => {
    console.error('Erreur serveur:', err);
    res.status(500).json({
        error: 'Erreur interne du serveur',
        message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message
    });
});

// ========================================
// Initialisation et démarrage
// ========================================

async function startServer() {
    try {
        await fs.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await usersManager.initializeUsersDir();

        const pushConfigured = pushManager.setupWebPush();
        if (pushConfigured) {
            await pushManager.initializeNotificationsFile();
            notificationScheduler.startNotificationScheduler();
        } else {
            console.warn('⚠️  Notifications push non configurées');
            console.warn('   Exécutez: npm run generate-vapid');
        }

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