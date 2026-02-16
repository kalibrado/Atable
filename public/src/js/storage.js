/**
 * @fileoverview Gestion du stockage local et de la synchronisation
 * @module storage
 */

import { STORAGE_KEYS } from './config.js';

/**
 * Classe de gestion du stockage local
 * Gère le cache et la synchronisation des données
 */
export class StorageManager {
  /**
   * Sauvegarde les données dans le cache local
   * @param {Object} data - Les données à sauvegarder
   * @returns {void}
   */
  static saveToCache(data) {
    try {
      console.log(data)
      localStorage.setItem(STORAGE_KEYS.CACHE, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde cache:', error);
    }
  }

  /**
   * Récupère les données depuis le cache local
   * @returns {Object|null} Les données en cache ou null si aucune donnée
   */
  static getFromCache() {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.CACHE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Erreur lecture cache:', error);
      return null;
    }
  }

  /**
   * Sauvegarde les données en attente de synchronisation
   * Utilisé quand l'application est hors ligne
   * @param {Object} data - Les données à synchroniser plus tard
   * @returns {void}
   */
  static savePendingData(data) {
    try {
      localStorage.setItem(STORAGE_KEYS.PENDING_SAVE, JSON.stringify(data));
    } catch (error) {
      console.error('Erreur sauvegarde données en attente:', error);
    }
  }

  /**
   * Récupère les données en attente de synchronisation
   * @returns {Object|null} Les données en attente ou null
   */
  static getPendingData() {
    try {
      const pending = localStorage.getItem(STORAGE_KEYS.PENDING_SAVE);
      return pending ? JSON.parse(pending) : null;
    } catch (error) {
      console.error('Erreur lecture données en attente:', error);
      return null;
    }
  }

  /**
   * Supprime les données en attente après synchronisation réussie
   * @returns {void}
   */
  static clearPendingData() {
    try {
      localStorage.removeItem(STORAGE_KEYS.PENDING_SAVE);
    } catch (error) {
      console.error('Erreur suppression données en attente:', error);
    }
  }

  /**
   * Efface tout le cache local
   * Utile pour le débogage ou la déconnexion
   * @returns {void}
   */
  static clearAll() {
    try {
      localStorage.removeItem(STORAGE_KEYS.CACHE);
      localStorage.removeItem(STORAGE_KEYS.PENDING_SAVE);
    } catch (error) {
      console.error('Erreur effacement cache:', error);
    }
  }
}