/**
 * @fileoverview Gestion des appels API vers le serveur
 * @module api
 */

import { API_CONFIG, STATUS_MESSAGES, STATUS_TYPES } from './config.js';
import { StorageManager } from './storage.js';
import { UIManager } from './ui-handlers.js';

/**
 * Classe de gestion des appels API
 * Gère la communication avec le serveur et la gestion offline
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

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            const data = await response.json();
            StorageManager.saveToCache(data);

            return data;
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
            if (!navigator.onLine) {
                return this._handleOfflineSave(data);
            }

            const response = await fetch(API_CONFIG.MEALS_URL, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const dataResponse = await response.json();

            if (!response.ok || dataResponse?.error) {
                throw new Error(`Erreur HTTP: ${response.status} ${dataResponse?.error}`);
            }

            StorageManager.clearPendingData();
            StorageManager.saveToCache(data);

            UIManager.showStatus(
                dataResponse?.message || STATUS_MESSAGES.SAVED,
                STATUS_TYPES.SUCCESS
            );

            return true;
        } catch (error) {
            console.error('Erreur sauvegarde:', error);
            UIManager.showStatus(error, STATUS_TYPES.ERROR);
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

            if (response.ok) {
                StorageManager.clearPendingData();
                UIManager.showStatus(STATUS_MESSAGES.SYNC_SUCCESS, STATUS_TYPES.SUCCESS);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erreur de synchronisation:', error);
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

            if (response.ok) {
                return await response.json();
            }

            if (response.status === 401) {
                window.location.replace('/login');
                return null;
            }

            throw new Error('Erreur récupération utilisateur');
        } catch (error) {
            console.error('Erreur récupération utilisateur:', error);
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

            if (response.ok) {
                StorageManager.clearAll();
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erreur déconnexion:', error);
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

            if (!response.ok) {
                throw new Error('Erreur serveur');
            }

            return true;
        } catch (error) {
            console.error('Erreur mise à jour paramètres:', error);
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

            if (!response.ok) {
                throw new Error(`Erreur HTTP: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur chargement ingrédients:', error);
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur mise à jour repas:', error);
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

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur génération repas:', error);
            throw error;
        }
    }

    /**
     * Génère une suggestion pour un repas unique
     * @param {string} mealType - Type de repas ('midi' ou 'soir')
     * @param {Set<string>} [usedMeals=new Set()] - Ensemble des repas déjà utilisés
     * @returns {Promise<Object>} Suggestion de repas
     * @throws {Error} Si la génération échoue
     */
    static async generateSingleMeal(mealType, usedMeals = new Set()) {
        try {
            const response = await fetch('/api/generator/generate-single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    mealType,
                    usedMeals: Array.from(usedMeals)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur génération repas unique:', error);
            throw error;
        }
    }
    /**
     * Crée une nouvelle catégorie d'ingrédients
     * @param {string} categoryName - Nom de la nouvelle catégorie
     * @returns {Promise<Object>} Résultat de l'opération
     */
    static async addCategory(categoryName) {
        try {
            const response = await fetch('/api/preferences/ingredients/category', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoryName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
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
     */
    static async renameCategory(oldName, newName) {
        try {
            const encoded = encodeURIComponent(oldName);
            const response = await fetch(`/api/preferences/ingredients/${encoded}/rename`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newName })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur renommage catégorie:', error);
            throw error;
        }
    }

    /**
     * Supprime une catégorie et tous ses items
     * @param {string} categoryName - Nom de la catégorie à supprimer
     * @returns {Promise<Object>} Résultat de l'opération
     */
    static async deleteCategory(categoryName) {
        try {
            const encoded = encodeURIComponent(categoryName);
            const response = await fetch(`/api/preferences/ingredients/${encoded}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur serveur');
            }

            return await response.json();
        } catch (error) {
            console.error('Erreur suppression catégorie:', error);
            throw error;
        }
    }
}