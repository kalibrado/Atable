/**
 * @fileoverview Gestion des événements et interactions utilisateur
 * @module ui-handlers
 */

import { API_CONFIG, STATUS_TYPES } from './config.js';
import { APIManager } from './api.js';
import { UIRenderer } from './ui-renderer.js';
import { StorageManager } from './storage.js';
import { WeeksManager } from './weeks-manager.js';

/**
 * Classe de gestion des interactions utilisateur
 * Gère les événements, les clics, les saisies, etc.
 */
export class UIManager {
    /**
     * État de l'application
     * @private
     * @type {Object}
     */
    static state = {
        mealsData: {},
        saveTimeout: null,
        statusTimeout: null
    };

    /**
     * Affiche un message de statut à l'utilisateur
     * @param {string} message - Le message à afficher
     * @param {string} [type='success'] - Le type de message ('success', 'error', 'warning')
     * @returns {void}
     */
    static showStatus(message, type = STATUS_TYPES.SUCCESS) {
        const el = document.getElementById('status-message');
        if (!el) return;

        el.textContent = message;
        el.className = `status-message ${type} show`;

        clearTimeout(UIManager.state.statusTimeout);
        UIManager.state.statusTimeout = setTimeout(() => el.classList.remove('show'), 3000);
    }

    /**
     * Gère les changements dans les textareas
     * Déclenche la sauvegarde automatique
     * @param {Event} event - L'événement de changement
     * @returns {void}
     */
    static handleTextareaChange(event) {
        const textarea = event.target;
        const day = textarea.dataset.day;
        const mealType = textarea.dataset.atable;
        const value = textarea.value;

        if (!UIManager.state.mealsData[day]) {
            UIManager.state.mealsData[day] = { midi: '', soir: '' };
        }
        UIManager.state.mealsData[day][mealType] = value;

        UIManager.scheduleSave();
    }

    /**
     * Planifie une sauvegarde automatique avec délai (debouncing)
     * Annule la sauvegarde précédente si l'utilisateur continue de taper
     * @returns {void}
     */
    static scheduleSave() {
        if (UIManager.state.saveTimeout) {
            clearTimeout(UIManager.state.saveTimeout);
        }

        UIManager.state.saveTimeout = setTimeout(async () => {
            await WeeksManager.saveAllWeeks();
        }, API_CONFIG.SAVE_DELAY);
    }

    /**
     * Attache les événements aux textareas
     * Doit être appelé après le rendu de l'interface
     * @returns {void}
     */
    static attachEventListeners() {
        const inputs = [
            ...document.querySelectorAll('.atable-textarea'),
            ...document.querySelectorAll('input')
        ];

        inputs.forEach(input => {
            if (input.className === 'atable-textarea') {
                input.addEventListener('input', UIManager.handleTextareaChange);
            }

            input.addEventListener('focus', (e) => {
                e.target.parentElement.style.transform = 'scale(1.005)';
            });

            input.addEventListener('blur', (e) => {
                e.target.parentElement.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * Configure les listeners de connectivité réseau
     * Détecte quand l'utilisateur revient en ligne/hors ligne
     * @returns {void}
     */
    static setupConnectivityListeners() {
        window.addEventListener('online', async () => {
            UIManager.showStatus('🌐 Connexion rétablie', STATUS_TYPES.SUCCESS);
            await APIManager.syncPendingData();
        });

        window.addEventListener('offline', () => {
            UIManager.showStatus(
                '📡 Hors ligne - Les modifications seront synchronisées plus tard',
                STATUS_TYPES.WARNING
            );
        });
    }

    /**
     * Gère la sauvegarde avant le déchargement de la page
     * @returns {void}
     */
    static setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (UIManager.state.saveTimeout) {
                clearTimeout(UIManager.state.saveTimeout);

                const allWeeksData = WeeksManager.getAllWeeksData();
                StorageManager.saveToCache(allWeeksData);

                const pendingData = localStorage.getItem('atable-planner-pending-save');
                if (pendingData && navigator.sendBeacon) {
                    const blob = new Blob([pendingData], { type: 'application/json' });
                    navigator.sendBeacon(API_CONFIG.MEALS_URL, blob);
                }
            }
        });
    }

    /**
     * Charge et affiche les données
     * @returns {Promise<void>}
     */
    static async loadAndRender() {
        try {
            const { weeks, numberOfWeeks } = await APIManager.loadMeals();

            WeeksManager.initialize(numberOfWeeks, weeks);
            UIManager.state.mealsData = weeks;

            const currentWeek = WeeksManager.getCurrentWeekNumber();


            UIRenderer.renderAllDays(
                UIManager.state.mealsData[`week${currentWeek}`]
            );

            UIManager.attachEventListeners();

            await APIManager.syncPendingData();
        } catch (error) {
            console.error('Erreur chargement et rendu:', error);
            UIManager.showStatus(
                'Erreur de chargement des données',
                STATUS_TYPES.ERROR
            );
        }
    }

    /**
     * Récupère l'état actuel de l'application
     * @returns {Object} L'état actuel
     */
    static getState() {
        return UIManager.state;
    }
}