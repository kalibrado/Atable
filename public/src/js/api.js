// ========================================
// Gestion des appels API vers le serveur
// ========================================

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

      // Sauvegarder dans le cache pour utilisation offline
      StorageManager.saveToCache(data);

      return data;

    } catch (error) {
      console.error('Erreur chargement repas:', error);

      // Tenter de charger depuis le cache local
      const cachedData = StorageManager.getFromCache();

      if (cachedData) {
        UIManager.showStatus(
          STATUS_MESSAGES.CACHE_LOADED,
          STATUS_TYPES.WARNING
        );
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
      // Vérifier la connectivité réseau
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
      const dataResponse = await response.json()
      if (!response.ok || dataResponse?.error) {
        throw new Error(`Erreur HTTP: ${response.status} ${dataResponse?.error}`);
      }

      // Sauvegarde réussie
      StorageManager.clearPendingData();
      StorageManager.saveToCache(data);

      UIManager.showStatus(
        dataResponse?.message || STATUS_MESSAGES.SAVED,
        STATUS_TYPES.SUCCESS
      );

      return true;

    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      UIManager.showStatus(
        error,
        STATUS_TYPES.ERROR
      );
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
    // Sauvegarder en local pour synchronisation ultérieure
    StorageManager.savePendingData(data);
    StorageManager.saveToCache(data);

    UIManager.showStatus(
      navigator.onLine
        ? STATUS_MESSAGES.LOCAL_SAVE
        : STATUS_MESSAGES.PENDING_OFFLINE,
      STATUS_TYPES.WARNING
    );

    return false;
  }

  /**
   * Synchronise les données en attente quand la connexion revient
   * Appelé automatiquement quand le navigateur détecte le retour de connexion
   * @returns {Promise<boolean>} True si synchronisation réussie
   */
  static async syncPendingData() {
    // Vérifier s'il y a des données en attente
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
        // Synchronisation réussie
        StorageManager.clearPendingData();

        UIManager.showStatus(
          STATUS_MESSAGES.SYNC_SUCCESS,
          STATUS_TYPES.SUCCESS
        );

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
   * @returns {Promise<Object>} Les informations utilisateur
   */
  static async fetchUserInfo() {
    try {
      const response = await fetch('/auth/me');

      if (response.ok) {
        const data = await response.json();
        return data;
      }

      if (response.status === 401) {
        // Utilisateur non authentifié, rediriger vers login
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
        // Effacer le cache local
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
   */
  static async updateSettings(settings) {
    try {
      const response = await fetch('/api/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      })
      const data = await response.json();
      if (!response.ok) {
        throw new Error('Erreur serveur');
      }
      // Mettre à jour localement
      return true;
    } catch (error) {
      console.error('Erreur mise à jour paramètres:', error);
      return false;
    }
  }


}