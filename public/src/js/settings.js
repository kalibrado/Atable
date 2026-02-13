/**
 * @fileoverview Gestion des paramètres et notifications
 * @module settings
 */

import { APIManager } from './api.js';
import { UIManager } from './ui-handlers.js';
import { STATUS_MESSAGES, STATUS_TYPES } from './config.js';
import { WeeksManager } from './weeks-manager.js';
import { IngredientsManager } from './ingredients-manager.js';
import { SettingsAccordion } from './settings-accordion.js';

/**
 * Gestionnaire des paramètres de l'application
 */
export class SettingsManager {
    /**
     * Ouvre la modal de paramètres
     * @returns {Promise<void>}
     */
    static async openModal() {
        const modal = document.getElementById('settings-modal');

        if (!modal) {
            console.warn('Modal de paramètres non trouvée');
            return;
        }

        modal.classList.add('show');

        const numberOfWeeks = WeeksManager.getNumberOfWeeks();
        const select = document.getElementById('number-of-weeks');
        if (select) {
            select.value = numberOfWeeks;
            select.addEventListener('change', async (e) => {
                await SettingsManager.updateNumberOfWeeks(parseInt(e.target.value));
            });
        }

        document.getElementById('notification-time')?.addEventListener('change', async () => {
            await SettingsManager.updateNotificationTime();
        });

        await SettingsManager.updateUI();

        await IngredientsManager.initialize();
        IngredientsManager.render();

        const notifToggle = document.getElementById('enable-notifications');
        if (notifToggle) {
            notifToggle.addEventListener('change', async () => {
                await SettingsManager.toggleNotifications();
            });
        }
        window.menuHandlers.close()
    }

    /**
     * Met à jour le nombre de semaines
     * @param {number} newValue - Nouveau nombre de semaines
     * @returns {Promise<void>}
     */
    static async updateNumberOfWeeks(newValue) {
        try {
            await WeeksManager.updateNumberOfWeeks(newValue);
            UIManager.showStatus(
                `Planification sur ${newValue} semaine(s) activée`,
                STATUS_TYPES.SUCCESS
            );
        } catch (error) {
            console.error('Erreur:', error);
            UIManager.showStatus('Erreur lors de la mise à jour', STATUS_TYPES.ERROR);
        }
    }

    /**
     * Ferme la modal de paramètres
     * @returns {void}
     */
    static closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Met à jour l'interface des paramètres
     * @returns {Promise<void>}
     */
    static async updateUI() {
        if (!window.notificationSystem) {
            console.warn('Système de notifications non chargé');
            return;
        }

        try {
            const userInfo = await APIManager.fetchUserInfo();
            const enableCheckbox = document.getElementById('enable-notifications');
            const { hour, minute } = userInfo?.notifications?.settings;
            const timeInput = document.getElementById('notification-time');
            const timeSetting = document.getElementById('time-setting');

            if (enableCheckbox) {
                enableCheckbox.checked = userInfo?.notifications?.settings?.enabled;
            }

            if (timeInput) {
                timeInput.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }

            if (timeSetting) {
                if (enableCheckbox.checked) {
                    timeSetting.style.opacity = '1';
                    timeInput.disabled = false;
                } else {
                    timeSetting.style.opacity = '0.5';
                    timeInput.disabled = true;
                }
            }

            SettingsManager.updatePermissionStatus();
        } catch (error) {
            UIManager.showStatus(`Erreur mise à jour UI: ${error}`, STATUS_TYPES.ERROR);
        }
    }

    /**
     * Met à jour l'affichage du statut de permission des notifications
     * @returns {void}
     */
    static updatePermissionStatus() {
        const statusDiv = document.getElementById('permission-status');
        const statusText = document.getElementById('permission-text');

        if (!statusDiv || !statusText) {
            return;
        }

        const notificationIsEnabled = document.getElementById('enable-notifications')?.checked;

        if (!('Notification' in window)) {
            UIManager.showStatus('Notifications non supportées', STATUS_TYPES.WARNING);
            statusDiv.className = 'permission-status denied';
            statusText.textContent = '❌ Navigateur non compatible';
            return;
        }

        if (!notificationIsEnabled) {
            statusDiv.className = 'permission-status default';
            statusText.textContent = '⚠️ Activez les notifications';
            return;
        }

        switch (Notification.permission) {
            case 'granted':
                statusDiv.className = 'permission-status granted';
                statusText.textContent = '✅ Notifications autorisées';
                break;

            case 'denied':
                statusDiv.className = 'permission-status denied';
                statusText.textContent = '❌ Notifications refusées';
                break;

            default:
                statusDiv.className = 'permission-status default';
                statusText.textContent = '⚠️ Permission non accordée';
                break;
        }
    }

    /**
     * Active/désactive les notifications
     * @returns {Promise<void>}
     */
    static async toggleNotifications() {
        const checkbox = document.getElementById('enable-notifications');

        if (!checkbox || !window.notificationSystem) {
            return;
        }

        const enabled = checkbox.checked;

        if (enabled) {
            const timeInput = document.getElementById('notification-time');
            const [hour, minute] = timeInput.value.split(':').map(Number);
            const success = await window.notificationSystem.subscribe({
                enabled,
                hour,
                minute
            });

            if (!success) {
                checkbox.checked = false;
                UIManager.showStatus(
                    'Impossible d\'activer les notifications',
                    STATUS_TYPES.ERROR
                );
                return;
            }
        } else {
            const success = await window.notificationSystem.unsubscribe();
            if (!success) {
                checkbox.checked = true;
                UIManager.showStatus(STATUS_MESSAGES.ERROR, STATUS_TYPES.ERROR);
                return;
            }
        }

        await SettingsManager.updateUI();
        UIManager.showStatus(
            enabled ? STATUS_MESSAGES.NOTIFICATION_ENABLED : STATUS_MESSAGES.NOTIFICATION_DISABLED,
            STATUS_TYPES.SUCCESS
        );
    }

    /**
     * Met à jour l'heure de notification
     * @returns {Promise<void>}
     */
    static async updateNotificationTime() {
        const timeInput = document.getElementById('notification-time');

        if (!timeInput || !window.notificationSystem) {
            return;
        }

        const [hour, minute] = timeInput.value.split(':').map(Number);

        await APIManager.updateSettings({ hour, minute });
        UIManager.showStatus(
            STATUS_MESSAGES.NOTIFICATION_TIME_UPDATED,
            STATUS_TYPES.SUCCESS
        );
    }

    /**
     * Initialise le système de notifications
     * @returns {Promise<void>}
     */
    static async initialize() {
        if (!window.notificationSystem) {
            UIManager.showStatus('Système de notifications non disponible', STATUS_TYPES.WARNING);
            return;
        }

        await window.notificationSystem.start();

        IngredientsManager.exposeHandlers();
        SettingsAccordion.initialize();

        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('show')) {
            await SettingsManager.updateUI();
        }
    }

    /**
     * Configure les événements de fermeture de la modal
     * @returns {void}
     */
    static setupModalEvents() {
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                SettingsManager.closeModal();
            }
        });
    }
}

/**
 * Gestionnaire d'authentification
 */
export class AuthManager {
    /**
     * Gère la déconnexion de l'utilisateur
     * @returns {Promise<void>}
     */
    static async handleLogout() {
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
            return;
        }

        try {
            const success = await APIManager.logout();
            if (success) {
                window.location.href = '/login';
            } else {
                UIManager.showStatus(
                    'Erreur lors de la déconnexion',
                    STATUS_TYPES.ERROR
                );
            }
        } catch (error) {
            UIManager.showStatus(
                'Erreur de connexion au serveur',
                STATUS_TYPES.ERROR
            );
        }
    }

    /**
     * Charge et affiche les informations utilisateur
     * @returns {Promise<void>}
     */
    static async loadUserInfo() {
        try {
            const { user } = await APIManager.fetchUserInfo();
            if (user && user.name) {
                const { UIRenderer } = await import('./ui-renderer.js');
                UIRenderer.displayUserName(user.name);
            }
        } catch (error) {
            UIManager.showStatus(`Erreur: ${error}`, STATUS_TYPES.ERROR);
        }
    }
}

/**
 * Gestionnaire de génération automatique
 */
export class GeneratorManager {
    /**
     * Génère tous les repas et recharge la page
     * @param {boolean} [replaceAll=false] - Remplacer tous les repas
     * @returns {Promise<void>}
     */
    static async generateAllMeals(replaceAll = false) {
        const confirmMsg = replaceAll
            ? 'Voulez-vous remplacer TOUS les repas existants ?'
            : 'Voulez-vous générer automatiquement les repas pour les cases vides ?';

        if (!confirm(confirmMsg)) {
            return;
        }

        UIManager.showStatus('💾 Sauvegarde en cours...', STATUS_TYPES.SUCCESS);

        try {
            await WeeksManager.saveAllWeeks();

            UIManager.showStatus('🔄 Génération en cours...', STATUS_TYPES.SUCCESS);

            const result = await APIManager.generateMeals(replaceAll);

            if (result.success) {
                UIManager.showStatus('✅ ' + result.message, STATUS_TYPES.SUCCESS);

                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            console.error('Erreur génération:', error);
            UIManager.showStatus(
                error.message || 'Erreur lors de la génération',
                STATUS_TYPES.ERROR
            );
        }
    }

    /**
     * Génère un seul repas pour un jour spécifique
     * @param {string} day - Le jour
     * @param {string} mealType - Type de repas ('midi' ou 'soir')
     * @returns {Promise<void>}
     */
    static async generateSingleMeal(day, mealType) {
        const textarea = document.getElementById(`${day}-${mealType}`);
        const button = document.querySelector(
            `.generate-meal-btn[onclick*="${day}"][onclick*="${mealType}"]`
        );

        if (!textarea) {
            console.error(`Textarea non trouvée pour ${day} ${mealType}`);
            return;
        }

        if (button) {
            button.disabled = true;
            button.classList.add('generating');
            button.textContent = '⏳ Génération...';
        }

        try {
            const currentWeekData = UIManager.getState().mealsData;
            const usedMeals = new Set();

            Object.values(currentWeekData).forEach(dayMeals => {
                if (dayMeals.midi) usedMeals.add(dayMeals.midi.trim().toLowerCase());
                if (dayMeals.soir) usedMeals.add(dayMeals.soir.trim().toLowerCase());
            });

            const result = await APIManager.generateSingleMeal(mealType, usedMeals);

            if (result.success && result.suggestion) {
                if (usedMeals.has(result.suggestion.trim().toLowerCase())) {
                    const retry = await APIManager.generateSingleMeal(mealType, usedMeals);
                    if (retry.success && retry.suggestion && !usedMeals.has(retry.suggestion.trim().toLowerCase())) {
                        textarea.value = retry.suggestion;
                    } else {
                        UIManager.showStatus(
                            '⚠️ Tous les repas disponibles sont déjà utilisés',
                            STATUS_TYPES.WARNING
                        );
                        return;
                    }
                } else {
                    textarea.value = result.suggestion;
                }

                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);

                UIManager.showStatus(
                    `✓ Repas généré pour ${day} ${mealType}`,
                    STATUS_TYPES.SUCCESS
                );
            } else {
                UIManager.showStatus(
                    'Impossible de générer un repas',
                    STATUS_TYPES.WARNING
                );
            }
        } catch (error) {
            console.error('Erreur génération:', error);
            UIManager.showStatus(
                error.message || 'Erreur lors de la génération',
                STATUS_TYPES.ERROR
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.classList.remove('generating');
                button.textContent = '🎲 Générer';
            }
        }
    }
}