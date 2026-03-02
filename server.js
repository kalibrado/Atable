/**
 * @fileoverview Serveur Express principal avec authentification et notifications push
 * @module server
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');
const fsPromises = fs.promises;

const logger = require('./logger');
const process = require('process');

const usersManager = require('./server/managers/users-manager');
const pushManager = require('./server/managers/push-manager');
const notificationScheduler = require('./server/scheduler/notification-scheduler');
const { requireAuth, logRequest, protectAllRoutes } = require('./server/middleware/auth-middleware');
const setupRoutes = require('./server/routes');
const rateLimit = require('express-rate-limit')
const compression = require('compression');
const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG = require('./config');
const SQLiteStore = require('connect-sqlite3')(session);
const ServerResponse  = require('./response-handler');



const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 tentatives
    message: 'Trop de tentatives, réessayez plus tard'
});
/**
 * Configuration des middlewares
*/
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(compression());


app.use(session({
    store: new SQLiteStore({ db:  `data/sessions.db` }),
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
app.use(logRequest);
app.use(express.static('public'));

/**
 * Configuration des routes
 */
setupRoutes(app, ServerResponse);

/**
 * Page de login
 * @route GET /login
 */
app.get('/login', loginLimiter, (req, res) => {
    if (req.session && req.session.userId) {
        return res.redirect('/');
    }
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

/**
 * Page principale (protégée)
 * @route GET /
 */
app.get('/', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Gestion des erreurs 404
 */
app.use((req, res) => {
    return ServerResponse.notFound(res);
});

/**
 * Gestion des erreurs serveur
 */
app.use((err, req, res, next) => {
    logger.error('Erreur serveur:', err);
    return ServerResponse.error(res, 500, 'INTERNAL_ERROR', process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : err.message, { stack: err.stack });
});

/**
 * Initialise et démarre le serveur
 * @async
 * @returns {Promise<void>}
 */
async function startServer() {
    try {
        await fsPromises.mkdir(path.join(__dirname, 'data'), { recursive: true });
        await usersManager.initializeUsersDir();

        const pushConfigured = pushManager.setupWebPush();
        if (pushConfigured) {
            await pushManager.initializeNotificationsFile();
            notificationScheduler.startNotificationScheduler();
        } else {
            logger.warn('⚠️  Notifications push non configurées');
            logger.warn('   Exécutez: npm run generate-vapid');
        }

        app.listen(PORT, () => {
            logger.info('========================================');
            logger.info('Serveur Atable! démarré');
            logger.info(`URL: http://localhost:${PORT}`);
            logger.info('========================================');
        });

    } catch (error) {
        logger.error('❌ Erreur au démarrage:', error);
        process.exit(1);
    }
}

startServer();

process.on('SIGTERM', () => {
    logger.info('Arrêt gracieux du serveur...', 'SHUTDOWN');
    process.exit(0);
});

process.on('SIGINT', () => {
    logger.info('Interrupt reçu', 'SHUTDOWN');
    process.emit('SIGTERM');
});

/**
 * Gestion des erreurs non attrapées
 */
process.on('uncaughtException', (err) => {
    logger.error(`Exception non attrapée: ${err.message}`, 'CRASH');
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    logger.error(`Promise rejetée non gérée: ${reason}`, 'CRASH');
});