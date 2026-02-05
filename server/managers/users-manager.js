// ========================================
// Gestion des utilisateurs via fichier JSON
// Ce module gère les utilisateurs de l'application, stockés dans un fichier JSON.
// Les fonctions permettent de lire, écrire et mettre à jour les utilisateurs.
// Les mots de passe sont hashés avec bcrypt pour la sécurité.
// En cas d'erreur, des exceptions sont levées pour être gérées par les routes ou autres modules.
// ========================================

const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const CONFIG = require('../../config');

/**
 * Constantes de configuration
 */
const USERS_FILE = CONFIG.usersFile;
const SALT_ROUNDS = 12;

/**
 * Initialise le fichier users.json s'il n'existe pas
 */
async function initializeUsersFile() {
    try {
        await fs.access(USERS_FILE);
    } catch (error) {
        // Le fichier n'existe pas, on le crée
        const defaultUsers = [];
        await fs.writeFile(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
        console.log('Fichier users.json créé');
    }
}

/**
 * Lit tous les utilisateurs
 * @returns {Promise<Array>}
 */
async function readUsers() {
    try {
        const data = await fs.readFile(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Erreur lecture users.json:', error);
        return [];
    }
}

/**
 * Sauvegarde les utilisateurs
 * @param {Array} users
 */
async function writeUsers(users) {
    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Trouve un utilisateur par email
 * @param {string} email
 * @returns {Promise<Object|null>}
 */
async function findUserByEmail(email) {
    const users = await readUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Trouve un utilisateur par ID
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function findUserById(id) {
    const users = await readUsers();
    return users.find(u => u.id === id) || null;
}

/**
 * Crée un nouvel utilisateur
 * @param {string} email
 * @param {string} password
 * @param {string} name
 * @returns {Promise<Object>}
 */
async function createUser(email, password, name = '') {
    const users = await readUsers();

    // Vérifier si l'email existe déjà
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Cet email est déjà utilisé');
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Créer l'utilisateur
    const newUser = {
        id: generateId(),
        email: email.toLowerCase(),
        passwordHash,
        name,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.push(newUser);
    await writeUsers(users);

    // Retourner l'utilisateur sans le hash du mot de passe
    const { passwordHash: _, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
}

/**
 * Vérifie les credentials d'un utilisateur
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object|null>}
 */
async function verifyUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user) {
        return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        return null;
    }

    // Retourner l'utilisateur sans le hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Met à jour un utilisateur
 * @param {string} id
 * @param {Object} updates
 * @returns {Promise<Object>}
 */
async function updateUser(id, updates) {
    const users = await readUsers();
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        throw new Error('Utilisateur non trouvé');
    }

    // Mettre à jour
    users[index] = {
        ...users[index],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    // Si le mot de passe est dans les updates, le hasher
    if (updates.password) {
        users[index].passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
        delete users[index].password;
    }

    await writeUsers(users);

    const { passwordHash: _, ...userWithoutPassword } = users[index];
    return userWithoutPassword;
}

/**
 * Génère un ID unique
 * @returns {string}
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
    initializeUsersFile,
    findUserByEmail,
    findUserById,
    createUser,
    verifyUser,
    updateUser,
    readUsers
};