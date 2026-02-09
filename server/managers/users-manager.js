// ========================================
// Gestion des utilisateurs - Structure unifiée
// ========================================

const fs = require('fs').promises;
const bcrypt = require('bcrypt');
const path = require('path');
const CONFIG = require('../../config');

const USERS_DIR = CONFIG.usersDir;
const SALT_ROUNDS = 12;

/**
 * Initialise le dossier des utilisateurs
 */
async function initializeUsersDir() {
    try {
        await fs.mkdir(USERS_DIR, { recursive: true });
        console.log('Dossier utilisateurs initialisé');
    } catch (error) {
        console.error('Erreur création dossier users:', error);
    }
}

/**
 * Obtient le chemin du fichier d'un utilisateur
 */
function getUserFilePath(userId) {
    return path.join(USERS_DIR, `${userId}.json`);
}

/**
 * Crée la structure par défaut d'un utilisateur
 */
function createDefaultUserStructure(email, passwordHash, firstname = '', lastname = '') {
    const now = new Date().toISOString();
    return {
        id: generateId(),
        email: email.toLowerCase(),
        passwordHash,
        firstname,
        lastname,
        createdAt: now,
        updatedAt: now,
        preference: {
            showWeeks: CONFIG.defaultWeeks,
            darkMode: false
        },
        devices: [],
        weeksPlans: createDefaultWeeksPlans(CONFIG.defaultWeeks)
    };
}

/**
 * Crée les plans de semaines par défaut
 */
function createDefaultWeeksPlans(numberOfWeeks) {
    const plans = {};
    for (let i = 1; i <= 4; i++) {
        plans[`week${i}`] = {
            enabled: i <= numberOfWeeks,
            days: { ...CONFIG.default_atable }
        };
    }
    return plans;
}

/**
 * Lit les données d'un utilisateur
 */
async function readUserData(userId) {
    const filePath = getUserFilePath(userId);
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        return null;
    }
}

/**
 * Sauvegarde les données d'un utilisateur
 */
async function writeUserData(userId, userData) {
    const filePath = getUserFilePath(userId);
    userData.updatedAt = new Date().toISOString();
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
}

/**
 * Liste tous les utilisateurs
 */
async function listAllUsers() {
    try {
        const files = await fs.readdir(USERS_DIR);
        const users = [];
        
        for (const file of files) {
            if (file.endsWith('.json')) {
                const userId = file.replace('.json', '');
                const userData = await readUserData(userId);
                if (userData) {
                    users.push(userData);
                }
            }
        }
        
        return users;
    } catch (error) {
        return [];
    }
}

/**
 * Trouve un utilisateur par email
 */
async function findUserByEmail(email) {
    const users = await listAllUsers();
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

/**
 * Trouve un utilisateur par ID
 */
async function findUserById(userId) {
    return await readUserData(userId);
}

/**
 * Crée un nouvel utilisateur
 */
async function createUser(email, password, firstname = '', lastname = '') {
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
        throw new Error('Cet email est déjà utilisé');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    const userData = createDefaultUserStructure(email, passwordHash, firstname, lastname);
    await writeUserData(userData.id, userData);

    const { passwordHash: _, ...userWithoutPassword } = userData;
    return userWithoutPassword;
}

/**
 * Vérifie les credentials
 */
async function verifyUser(email, password) {
    const user = await findUserByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) return null;

    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

/**
 * Met à jour un utilisateur
 */
async function updateUser(userId, updates) {
    const userData = await readUserData(userId);
    if (!userData) {
        throw new Error('Utilisateur non trouvé');
    }

    Object.assign(userData, updates);

    if (updates.password) {
        userData.passwordHash = await bcrypt.hash(updates.password, SALT_ROUNDS);
        delete userData.password;
    }

    await writeUserData(userId, userData);

    const { passwordHash: _, ...userWithoutPassword } = userData;
    return userWithoutPassword;
}

/**
 * Ajoute ou met à jour un device
 */
async function updateDevice(userId, deviceId, isMobile = false) {
    const userData = await readUserData(userId);
    if (!userData) throw new Error('Utilisateur non trouvé');

    const deviceIndex = userData.devices.findIndex(d => d.deviceId === deviceId);
    const deviceData = {
        deviceId,
        lastConnected: new Date().toISOString(),
        isMobile
    };

    if (deviceIndex >= 0) {
        userData.devices[deviceIndex] = deviceData;
    } else {
        userData.devices.push(deviceData);
    }

    await writeUserData(userId, userData);
    return userData;
}

/**
 * Génère un ID unique
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

module.exports = {
    initializeUsersDir,
    findUserByEmail,
    findUserById,
    createUser,
    verifyUser,
    updateUser,
    updateDevice,
    readUserData,
    writeUserData,
    listAllUsers
};