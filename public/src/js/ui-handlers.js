// ========================================
// Gestion des événements et interactions utilisateur 
// ========================================

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
     */
    static state = {
        mealsData: {},
        saveTimeout: null,
        statusTimeout: null
    };

    /**
     * Affiche un message de statut à l'utilisateur
     * @param {string} message - Le message à afficher
     * @param {string} type - Le type de message ('success', 'error', 'warning')
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
     */
    static handleTextareaChange(event) {
        const textarea = event.target;
        const day = textarea.dataset.day;
        const mealType = textarea.dataset.atable;
        const value = textarea.value;

        // Mettre à jour les données en mémoire
        if (!UIManager.state.mealsData[day]) {
            UIManager.state.mealsData[day] = { midi: '', soir: '' };
        }
        UIManager.state.mealsData[day][mealType] = value;

        // Planifier la sauvegarde automatique
        UIManager.scheduleSave();
    }

    /**
     * Planifie une sauvegarde automatique avec délai
     * Annule la sauvegarde précédente si l'utilisateur continue de taper
     * (Pattern: Debouncing)
     */
    static scheduleSave() {
        // Annuler la sauvegarde précédente
        if (UIManager.state.saveTimeout) {
            clearTimeout(UIManager.state.saveTimeout);
        }
        // Planifier une nouvelle sauvegarde
        UIManager.state.saveTimeout = setTimeout(async () => {
            await WeeksManager.saveAllWeeks();
        }, API_CONFIG.SAVE_DELAY);
    }
    /**
     * Attache les événements aux textareas
     * Doit être appelé après le rendu de l'interface
     */
    static attachEventListeners() {
        const inputs = [...document.querySelectorAll('.atable-textarea'), ...document.querySelectorAll("input")];


        inputs.forEach(input => {
            if (input.className === "atable-textarea") {
                input.addEventListener('input', UIManager.handleTextareaChange);
            }
            // Effet visuel au focus
            input.addEventListener('focus', (e) => {
                e.target.parentElement.style.transform = 'scale(1.005)';
            });
            // Retour à la normale au blur
            input.addEventListener('blur', (e) => {
                e.target.parentElement.style.transform = 'scale(1)';
            });
        });
    }

    /**
     * Configure les listeners de connectivité réseau
     * Détecte quand l'utilisateur revient en ligne/hors ligne
     */
    static setupConnectivityListeners() {
        // Retour de connexion
        window.addEventListener('online', async () => {
            UIManager.showStatus(
                '🌐 Connexion rétablie',
                STATUS_TYPES.SUCCESS
            );
            await APIManager.syncPendingData();
        });

        // Perte de connexion
        window.addEventListener('offline', () => {
            UIManager.showStatus(
                '📡 Hors ligne - Les modifications seront synchronisées plus tard',
                STATUS_TYPES.WARNING
            );
        });
    }

    /**
     * Gère la sauvegarde avant le déchargement de la page
     */
    static setupBeforeUnload() {
        window.addEventListener('beforeunload', (event) => {
            if (UIManager.state.saveTimeout) {
                // Annuler le timeout de sauvegarde
                clearTimeout(UIManager.state.saveTimeout);

                // Sauvegarder toutes les semaines dans le cache
                const allWeeksData = WeeksManager.getAllWeeksData();
                StorageManager.saveToCache(allWeeksData);

                // Tenter d'envoyer avec sendBeacon si disponible
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
            // Charger les données
            const { weeks, numberOfWeeks } = await APIManager.loadMeals();
            // Initialiser le gestionnaire de semaines
            WeeksManager.initialize(numberOfWeeks, weeks);
            UIManager.state.mealsData = weeks
            const currentWeek = WeeksManager.getCurrentWeekNumber()
            // Rendre l'interface
            UIRenderer.renderAllDays(
                UIManager.state.mealsData[`week${currentWeek}`] // Charge uniquement la semain en cours
            );
            // Attacher les événements
            UIManager.attachEventListeners();
            // Tenter de synchroniser les données en attente
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