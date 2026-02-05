// ========================================
// Routes d'authentification
// ========================================
const app = require('../server');
/**
 * POST /auth/register
 * Inscription d'un nouvel utilisateur
 */
app.post('/auth/register', async (req, res) => {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
        return res.status(400).json({
            error: 'Email et mot de passe requis'
        });
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            error: 'Format d\'email invalide'
        });
    }

    // Validation mot de passe (minimum 6 caractères pour simplicité)
    if (password.length < 6) {
        return res.status(400).json({
            error: 'Le mot de passe doit contenir au moins 6 caractères'
        });
    }

    try {
        const user = await usersManager.createUser(email, password, name);

        // Connexion automatique après inscription
        req.session.userId = user.id;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Erreur inscription:', error);
        res.status(400).json({
            error: error.message || 'Erreur lors de l\'inscription'
        });
    }
});

/**
 * POST /auth/login
 * Connexion d'un utilisateur
 */
app.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            error: 'Email et mot de passe requis'
        });
    }

    try {
        const user = await usersManager.verifyUser(email, password);

        if (!user) {
            return res.status(401).json({
                error: 'Email ou mot de passe incorrect'
            });
        }

        // Créer la session
        req.session.userId = user.id;
        req.session.userEmail = user.email;

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    } catch (error) {
        console.error('Erreur login:', error);
        res.status(500).json({
            error: 'Erreur lors de la connexion'
        });
    }
});

/**
 * POST /auth/logout
 * Déconnexion de l'utilisateur
 */
app.post('/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({
                error: 'Erreur lors de la déconnexion'
            });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

/**
 * GET /auth/me
 * Obtient les informations de l'utilisateur connecté
 */
app.get('/auth/me', async (req, res) => {

    return usersManager.findUserById(req.session.userId).then(user => {
        if (!user) {
            return res.status(401).json({ message: 'Utilisateur non authentifié' });
        }

        res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name
            }
        });
    }).catch(() => {
        res.status(500).json({
            error: 'Erreur serveur'
        });
    });
});
