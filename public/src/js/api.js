/**
 * @fileoverview Gestion des appels API vers le serveur
 * @module api
 * 
 */

import { API_CONFIG, STATUS_MESSAGES, STATUS_TYPES } from './config.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui-handlers.js';
import { ResponseHandler } from './response-handler.js';
/**
 * Classe de gestion des appels API
 * Gère la communication avec le serveur et la gestion offline
 * 
 */
export class APIManager {
    /**
     * Charge les données des repas depuis le serveur
     * En cas d'échec, tente de charger depuis le cache local
     * @returns {Promise<Object>} Les données des repas
     * @throws {Error} Si les données ne peuvent pas être chargées
     */
    static async loadMeals() {
        try {
            const response = await fetch(API_CONFIG.MEALS_URL);

            let result = null;
            await ResponseHandler.handle(response, {
                showMessage: false,  // Pas de message pour les chargements normaux
                onSuccess: (data) => {
                    console.debug('Données reçues du serveur:', data);
                    StorageManager.saveToCache(data);
                    result = data
                    console.log('✅ Repas chargés avec succès');
                },
                onError: (error) => {
                    console.error('❌ Erreur chargement repas:', error.message);
                    // Fallback sur cache
                    const cachedData = StorageManager.getFromCache();
                    if (cachedData) {
                        UIManager.showStatus(STATUS_MESSAGES.CACHE_LOADED, STATUS_TYPES.WARNING);
                        result = cachedData;
                    }
                }
            });

            return result;

        } catch (error) {
            console.error('Erreur chargement repas:', error);
            const cachedData = StorageManager.getFromCache();

            if (cachedData) {
                UIManager.showStatus(STATUS_MESSAGES.CACHE_LOADED, STATUS_TYPES.WARNING);
                return cachedData;
            }

            throw new Error('Impossible de charger les données');
        }
    }

    /**
     * Sauvegarde les données des repas vers le serveur
     * Gère le mode offline et la synchronisation différée
     * @param {Object} data - Les données à sauvegarder
     * @returns {Promise<boolean>} True si sauvegarde réussie
     */
    static async saveMeals(data) {
        try {
            console.debug('Envoi des données au serveur:', data);
            const response = await fetch(API_CONFIG.MEALS_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            let result = { success: false, message: 'Erreur inconnue' };
            await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: (data) => {
                    StorageManager.clearPendingData();
                    StorageManager.saveToCache(data);
                    result = data;
                    console.log('✅ Repas sauvegardés avec succès');
                },
                onError: (error) => {
                    console.error('❌ Erreur sauvegarde:', error.message);
                    result = { success: false, message: error.message };
                }
            });

            return result.success;

        } catch (error) {
            console.error('Erreur sauvegarde:', error);

            if (!navigator.onLine) {
                return this._handleOfflineSave(data);
            }

            ResponseHandler.handleNetworkError(error, 'saveMeals');
            return this._handleOfflineSave(data);
        }
    }

    /**
     * Gère la sauvegarde en mode offline
     * @private
     * @param {Object} data - Les données à sauvegarder
     * @returns {boolean} False (échec de sauvegarde serveur)
     */
    static _handleOfflineSave(data) {
        console.warn('📡 Enregistrement en mode hors ligne');
        StorageManager.savePendingData(data);
        StorageManager.saveToCache(data);

        UIManager.showStatus(
            navigator.onLine ? STATUS_MESSAGES.LOCAL_SAVE : STATUS_MESSAGES.PENDING_OFFLINE,
            STATUS_TYPES.WARNING
        );

        return false;
    }

    /**
     * Synchronise les données en attente quand la connexion revient
     * @returns {Promise<boolean>} True si synchronisation réussie
     */
    static async syncPendingData() {
        const pendingData = StorageManager.getPendingData();

        if (!pendingData || !navigator.onLine) {
            return false;
        }

        try {
            const response = await fetch(API_CONFIG.MEALS_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(pendingData)
            });

            const result = await ResponseHandler.handle(response, {
                showMessage: true,

                onSuccess: () => {
                    StorageManager.clearPendingData();
                    console.log('✅ Synchronisation réussie');
                },
                onError: (error) => {
                    console.error('❌ Erreur sync:', error.message);
                }
            });

            return result.success;

        } catch (error) {
            console.error('Erreur de synchronisation:', error);
            ResponseHandler.handleNetworkError(error, 'syncPendingData');
            return false;
        }
    }

    /**
     * Récupère les informations de l'utilisateur connecté
     * @returns {Promise<Object|null>} Les informations utilisateur ou null
     */
    static async fetchUserInfo() {
        try {
            const response = await fetch('/auth/me');

            const result = await ResponseHandler.handle(response, {
                showMessage: false,
                onSuccess: (data) => {
                    console.log('✅ Infos utilisateur chargées');
                    return data;
                },
                onError: (error) => {
                    console.error('❌ Erreur récupération utilisateur:', error.message);
                    if (error.status === 401) {
                        console.warn('⚠️ Session expirée');
                        ResponseHandler.handleUnauthorized({
                            redirect: true
                        });
                    }
                }
            });

            if (!result.success) {
                if (result.status === 401) {
                    ResponseHandler.handleUnauthorized({
                        redirect: true
                    });
                }
                return null;
            }
            return result;

        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
            ResponseHandler.handleNetworkError(error, 'fetchUserInfo');
            return null;
        }
    }

    /**
     * Déconnecte l'utilisateur
     * @returns {Promise<boolean>} True si déconnexion réussie
     */
    static async logout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST'
            });

            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    StorageManager.clearAll();
                    console.log('✅ Déconnecté avec succès');
                },
                onError: (error) => {
                    console.error('❌ Erreur déconnexion:', error.message);
                }
            });

            return result.success;

        } catch (error) {
            console.error('Erreur déconnexion:', error);
            ResponseHandler.handleNetworkError(error, 'logout');
            return false;
        }
    }

    /**
     * Met à jour les paramètres de notification sur le serveur
     * @param {Object} settings - Les paramètres de notification
     * @returns {Promise<boolean>} True si mise à jour réussie
     */
    static async updateSettings(settings) {
        try {
            const response = await fetch('/api/notifications/settings', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log('✅ Paramètres mis à jour');
                },
                onError: (error) => {
                    console.error('❌ Erreur mise à jour:', error.message);
                }
            });

            return result.success;

        } catch (error) {
            console.error('Erreur mise à jour paramètres:', error);
            ResponseHandler.handleNetworkError(error, 'updateSettings');
            return false;
        }
    }

    /**
     * Récupère les ingrédients de l'utilisateur
     * @returns {Promise<Object>} Les ingrédients
     */
    static async fetchIngredients() {
        try {
            const response = await fetch('/api/preferences/ingredients');
            const result = await ResponseHandler.handle(response, {
                showMessage: false,
                onSuccess: (data) => {
                    console.log('✅ Ingrédients chargés');
                },
                onError: (error) => {
                    console.warn('⚠️ Erreur ingrédients:', error.message);
                }
            });

            if (!result.success) {
                return { ingredients: {} };
            }

            return result.data || { ingredients: {} };

        } catch (error) {
            console.error('Erreur chargement ingrédients:', error);
            ResponseHandler.handleNetworkError(error, 'fetchIngredients');
            return { ingredients: {} };
        }
    }

    /**
     * Ajoute un item à une catégorie d'ingrédients
     * @param {string} category - La catégorie
     * @param {string} item - L'item à ajouter
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si l'ajout échoue
     */
    static async addIngredientItem(category, item) {
        try {
            const encodedCategory = encodeURIComponent(category);
            const response = await fetch(`/api/preferences/ingredients/${encodedCategory}/item`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ item })
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: (data) => {
                    console.log(`✅ Item "${item}" ajouté`);
                },
                onError: (error) => {
                    if (error.error === 'CONFLICT') {
                        console.warn(`⚠️ L'item "${item}" existe déjà`);
                    } else {
                        console.error('❌ Erreur ajout item:', error.message);
                    }
                }
            });
            if (!result.success) {
                throw new Error(result.message);
            }
            return result.data;
        } catch (error) {
            console.error('Erreur ajout item:', error);
            throw error;
        }
    }

    /**
     * Supprime un item d'une catégorie d'ingrédients
     * @param {string} category - La catégorie
     * @param {string} item - L'item à supprimer
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si la suppression échoue
     */
    static async removeIngredientItem(category, item) {
        try {
            const encodedCategory = encodeURIComponent(category);
            const response = await fetch(`/api/preferences/ingredients/${encodedCategory}/item`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ item })
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: (data) => {
                    console.log(`✅ Item "${item}" supprimé`);
                },
                onError: (error) => {
                    console.error('❌ Erreur suppression:', error.message);
                }
            });
            if (!result.success) {
                throw new Error(result.message);
            }
            return result.data;
        } catch (error) {
            console.error('Erreur suppression item:', error);
            throw error;
        }
    }

    /**
     * Met à jour les préférences de repas pour une catégorie
     * @param {string} category - La catégorie
     * @param {Object} repas - Les préférences de repas {midi: boolean, soir: boolean}
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si la mise à jour échoue
     */
    static async updateCategoryRepas(category, repas) {
        try {
            const encodedCategory = encodeURIComponent(category);
            const response = await fetch(`/api/preferences/ingredients/${encodedCategory}/repas`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(repas)
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log(`✅ Préférences mises à jour pour "${category}"`);
                },
                onError: (error) => {
                    console.error('❌ Erreur mise à jour repas:', error.message);
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur mise à jour repas:', error);
            throw error;
        }
    }

    /**
     * Met à jour les jours de la semaine pour une catégorie d'ingrédients
     * @param {string} category - La catégorie
     * @param {Object} days - Les jours activés {lundi: boolean, mardi: boolean, ...}
     * @returns {Promise<Object>} Résultat de l'opération avec les ingrédients mis à jour
     * @throws {Error} Si la mise à jour échoue
     */
    static async updateCategoryDays(category, days) {
        try {
            const encodedCategory = encodeURIComponent(category);
            const response = await fetch(`/api/preferences/ingredients/${encodedCategory}/days`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ days })
            });

            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log(`✅ Jours de la semaine mis à jour pour "${category}"`);
                },
                onError: (error) => {
                    console.error('❌ Erreur mise à jour jours:', error.message);
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur mise à jour jours:', error);
            throw error;
        }
    }

    /**
     * Génère automatiquement les repas de la semaine
     * @param {boolean} [replaceAll=false] - Remplacer tous les repas ou seulement les vides
     * @returns {Promise<Object>} Résultat de la génération
     * @throws {Error} Si la génération échoue
     */
    static async generateMeals(replaceAll = false) {
        try {
            const response = await fetch('/api/generator/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ replaceAll })
            });

            let result = { success: false, message: 'Erreur inconnue' };
            await ResponseHandler.handle(response, {
                showMessage: false,
                onSuccess: (data) => {
                    const action = replaceAll ? 'remplacés' : 'générés';
                    console.log(`✅ Repas ${action} avec succès`);
                    console.log('Données reçues:', data);
                    result = data;
                },
                onError: (error) => {
                    console.error('❌ Erreur génération:', error.message);
                    result = { success: false, message: error.message };
                }
            });
            return result;
        } catch (error) {
            console.error('Erreur génération repas:', error);
            throw error;
        }
    }

    /**
     * Génère une suggestion pour un repas unique
     * @param {string} mealType - Type de repas ('midi' ou 'soir')
     * @param {string} [dayOfWeek] - Jour de la semaine (optionnel, pour respecter les préférences)
     * @param {Set<string>} [usedMeals=new Set()] - Ensemble des repas déjà utilisés
     * @returns {Promise<Object>} Suggestion de repas
     * @throws {Error} Si la génération échoue
     */
    static async generateSingleMeal(mealType, dayOfWeek = null, usedMeals = new Set()) {
        try {
            const response = await fetch('/api/generator/generate-single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mealType,
                    dayOfWeek,
                    usedMeals: Array.from(usedMeals)
                })
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: (data) => {
                    console.log(`✅ Repas généré pour ${mealType}`);
                },
                onError: (error) => {
                    if (error.error === 'ALL_USED') {
                        console.warn('⚠️ Tous les repas disponibles sont utilisés');
                    } else {
                        console.error('❌ Erreur génération:', error.message);
                    }
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur génération repas unique:', error);
            throw error;
        }
    }

    /**
     * Crée une nouvelle catégorie d'ingrédients
     * @param {string} categoryName - Nom de la nouvelle catégorie
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si la création échoue
     */
    static async addCategory(categoryName) {
        try {
            const response = await fetch('/api/preferences/ingredients/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName })
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log(`✅ Catégorie "${categoryName}" créée`);
                },
                onError: (error) => {
                    if (error.error === 'CONFLICT') {
                        console.warn(`⚠️ La catégorie "${categoryName}" existe déjà`);
                    } else {
                        console.error('❌ Erreur création:', error.message);
                    }
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur création catégorie:', error);
            throw error;
        }
    }

    /**
     * Renomme une catégorie existante
     * @param {string} oldName - Nom actuel
     * @param {string} newName - Nouveau nom
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si le renommage échoue
     */
    static async renameCategory(oldName, newName) {
        try {
            const encoded = encodeURIComponent(oldName);
            const response = await fetch(`/api/preferences/ingredients/${encoded}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName })
            });
            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log(`✅ Catégorie renommée: "${oldName}" → "${newName}"`);
                },
                onError: (error) => {
                    if (error.error === 'NOT_FOUND') {
                        console.warn(`⚠️ Catégorie "${oldName}" introuvable`);
                    } else if (error.error === 'CONFLICT') {
                        console.warn(`⚠️ Une catégorie "${newName}" existe déjà`);
                    } else {
                        console.error('❌ Erreur renommage:', error.message);
                    }
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur renommage catégorie:', error);
            throw error;
        }
    }

    /**
     * Supprime une catégorie et tous ses items
     * @param {string} categoryName - Nom de la catégorie à supprimer
     * @returns {Promise<Object>} Résultat de l'opération
     * @throws {Error} Si la suppression échoue
     */
    static async deleteCategory(categoryName) {
        try {
            const encoded = encodeURIComponent(categoryName);
            const response = await fetch(`/api/preferences/ingredients/${encoded}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await ResponseHandler.handle(response, {
                showMessage: true,
                onSuccess: () => {
                    console.log(`✅ Catégorie "${categoryName}" supprimée`);
                },
                onError: (error) => {
                    if (error.error === 'NOT_FOUND') {
                        console.warn(`⚠️ Catégorie "${categoryName}" introuvable`);
                    } else {
                        console.error('❌ Erreur suppression:', error.message);
                    }
                }
            });

            if (!result.success) {
                throw new Error(result.message);
            }

            return result.data;

        } catch (error) {
            console.error('Erreur suppression catégorie:', error);
            throw error;
        }
    }
}