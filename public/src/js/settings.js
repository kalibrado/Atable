// ========================================
// Gestion des paramètres et notifications
// ========================================

import { APIManager } from './api.js';
import { UIManager } from './ui-handlers.js';
import { STATUS_MESSAGES, STATUS_TYPES } from './config.js';
import { WeeksManager } from './weeks-manager.js';
import { IngredientsManager } from './ingredients-manager.js';

/**
 * Classe de gestion des paramètres de l'application
 * Gère les notifications, les préférences utilisateur, etc.
 */
export class SettingsManager {
    /**
     * Ouvre la modal de paramètres
     */
    static async openModal() {
        const modal = document.getElementById('settings-modal');

        if (!modal) {
            console.warn('Modal de paramètres non trouvée');
            return;
        }

        modal.classList.add('show');

        // Initialiser le nombre de semaines
        const numberOfWeeks = WeeksManager.getNumberOfWeeks();
        const select = document.getElementById('number-of-weeks');
        if (select) {
            select.value = numberOfWeeks;
            select.addEventListener('change', async (e) => {
                console.log('change', e)
                await SettingsManager.updateNumberOfWeeks(parseInt(e.target.value));
            });
        }

        // Initialiser l'heure de notification
        document.getElementById('notification-time')?.addEventListener('change', async (e) => {
            await SettingsManager.updateNotificationTime()
        });

        // Mettre à jour l'UI
        await SettingsManager.updateUI();

        // Initialiser et afficher les ingrédients
        await IngredientsManager.initialize();
        IngredientsManager.render();

        // Attacher l'événement au toggle de notifications
        const notifToggle = document.getElementById('enable-notifications');
        if (notifToggle) {
            notifToggle.addEventListener('change', async () => {
                await SettingsManager.toggleNotifications();
            });
        }
    }

    static async updateNumberOfWeeks(newValue) {
        try {
            console.log(newValue)
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
     */
    static closeModal() {
        const modal = document.getElementById('settings-modal');
        if (modal) {
            modal.classList.remove('show');
        }
    }

    /**
     * Met à jour l'interface des paramètres
     */
    static async updateUI() {
        // Vérifier que le système de notifications est disponible
        if (!window.notificationSystem) {
            console.warn('Système de notifications non chargé');
            return;
        }

        try {
            // État du toggle (basé sur la notification)
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

            if (timeInput) {
                if (enableCheckbox.checked) {
                    timeSetting.style.opacity = '1';
                    timeInput.disabled = false;
                } else {
                    timeSetting.style.opacity = '0.5';
                    timeInput.disabled = true;
                }
            }

            // Mettre à jour le statut de la permission
            SettingsManager.updatePermissionStatus();

        } catch (error) {
            UIManager.showStatus(`Erreur mise à jour UI paramètres: ${error}`, STATUS_TYPES.ERROR)
        }
    }

    /**
     * Met à jour l'affichage du statut de permission des notifications
     */
    static updatePermissionStatus() {
        const statusDiv = document.getElementById('permission-status');
        const statusText = document.getElementById('permission-text');

        if (!statusDiv || !statusText) {
            return;
        }

        const notificationIsEnabled = document.getElementById('enable-notifications')?.checked;

        // Vérifier le support des notifications
        if (!('Notification' in window)) {
            UIManager.showStatus('Notifications non supportées par ce navigateur', STATUS_TYPES.WARNING)
            statusDiv.className = 'permission-status denied';
            statusText.textContent = '❌ Votre navigateur ne supporte pas les notifications';
            return;
        }

        // Si les notifications ne sont pas activées
        if (!notificationIsEnabled) {
            statusDiv.className = 'permission-status default';
            statusText.textContent = '⚠️ Activez les notifications pour voir le statut de permission';
            return;
        }

        // Afficher le statut de la permission
        switch (Notification.permission) {
            case 'granted':
                statusDiv.className = 'permission-status granted';
                statusText.textContent = '✅ Notifications autorisées';
                break;

            case 'denied':
                statusDiv.className = 'permission-status denied';
                statusText.textContent = '❌ Notifications refusées. Autorisez-les dans les paramètres de votre navigateur.';
                break;

            default:
                statusDiv.className = 'permission-status default';
                statusText.textContent = '⚠️ Permission non accordée. Activez les notifications pour demander l\'autorisation.';
                break;
        }
    }

    /**
     * Active/désactive les notifications
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
                UIManager.showStatus('Impossible d\'activer les notifications. Vérifiez les permissions de votre navigateur.', STATUS_TYPES.ERROR)
                return;
            }
        } else {
            // Se désabonner
            const success = await window.notificationSystem.unsubscribe();
            if (!success) {
                checkbox.checked = true;
                UIManager.showStatus(STATUS_MESSAGES.ERROR, STATUS_TYPES.ERROR)
                return;
            }

        }
        // Mettre à jour l'UI
        await SettingsManager.updateUI();
        enabled
            ? UIManager.showStatus(STATUS_MESSAGES.NOTIFICATION_ENABLED, STATUS_TYPES.SUCCESS)
            : UIManager.showStatus(STATUS_MESSAGES.NOTIFICATION_DISABLED, STATUS_TYPES.SUCCESS)

    }

    /**
     * Met à jour l'heure de notification
     */
    static async updateNotificationTime() {
        const timeInput = document.getElementById('notification-time');

        if (!timeInput || !window.notificationSystem) {
            return;
        }

        const [hour, minute] = timeInput.value.split(':').map(Number);

        await APIManager.updateSettings({
            hour, minute
        })
        UIManager.showStatus(
            STATUS_MESSAGES.NOTIFICATION_TIME_UPDATED,
            STATUS_TYPES.SUCCESS
        );
    }

    /**
     * Initialise le système de notifications
     */
    static async initialize() {
        if (!window.notificationSystem) {
            UIManager.showStatus('Système de notifications non disponible', STATUS_TYPES.WARNING)
            return;
        }

        // Démarrer le système de notifications
        await window.notificationSystem.start();

        // Initialiser les ingrédients
        IngredientsManager.exposeHandlers();

        // Mettre à jour l'UI si la modal est ouverte
        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('show')) {
            await SettingsManager.updateUI();
        }
    }

    /**
     * Configure les événements de fermeture de la modal
     */
    static setupModalEvents() {
        // Fermer en cliquant en dehors
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                SettingsManager.closeModal();
            }
        });
    }
}


/**
 * Classe de gestion de l'authentification
 */
export class AuthManager {
    /**
     * Gère la déconnexion de l'utilisateur
     */
    static async handleLogout() {
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
            return;
        }

        try {
            const success = await APIManager.logout();
            if (success) {
                // Rediriger vers la page de login 
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
     */
    static async loadUserInfo() {
        try {
            const { user, notifications } = await APIManager.fetchUserInfo();
            if (user && user.name) {
                // Import dynamique pour éviter la circularité
                const { UIRenderer } = await import('./ui-renderer.js');
                UIRenderer.displayUserName(user.name);

            }
            if (notifications) {
                console.log('Notifications utilisateur chargées:', notifications);
            }
        } catch (error) {
            UIManager.showStatus(`Erreur chargement infos utilisateur: ${error}`, STATUS_TYPES.ERROR)
        }
    }
}


/**
 * Classe de gestion de la génération automatique
 */
export class GeneratorManager {
    /**
     * Génère tous les repas et recharge la page
     * @param {boolean} replaceAll - Remplacer tous les repas
     */
    static async generateAllMeals(replaceAll = false) {
        const confirmMsg = replaceAll
            ? 'Voulez-vous remplacer TOUS les repas existants par des repas générés automatiquement ?'
            : 'Voulez-vous générer automatiquement les repas pour les cases vides ?';

        if (!confirm(confirmMsg)) {
            return;
        }

        UIManager.showStatus('🔄 Génération en cours...', STATUS_TYPES.SUCCESS);

        try {
            const result = await APIManager.generateMeals(replaceAll);

            if (result.success) {
                UIManager.showStatus('✅ ' + result.message, STATUS_TYPES.SUCCESS);

                // Recharger l'application après 1 seconde
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
     * Génère un seul repas pour un jour et type de repas spécifique
     * @param {string} day - Le jour (lundi, mardi, etc.)
     * @param {string} mealType - Le type de repas ('midi' ou 'soir')
     */
    static async generateSingleMeal(day, mealType) {
        // Récupérer la textarea correspondante
        const textarea = document.getElementById(`${day}-${mealType}`);
        const button = document.querySelector(
            `.generate-meal-btn[onclick*="${day}"][onclick*="${mealType}"]`
        );
        if (!textarea) {
            console.error(`Textarea non trouvée pour ${day} ${mealType}`);
            return;
        }

        // Désactiver le bouton et afficher l'état de chargement
        if (button) {
            button.disabled = true;
            button.classList.add('generating');
            button.textContent = '⏳ Génération...';
        }

        try {
            // Récupérer tous les repas de la semaine actuelle pour éviter les doublons
            const currentWeekData = UIManager.getState().mealsData;
            const usedMeals = new Set();

            // Collecter tous les repas déjà utilisés dans la semaine
            Object.values(currentWeekData).forEach(dayMeals => {
                if (dayMeals.midi) usedMeals.add(dayMeals.midi.trim().toLowerCase());
                if (dayMeals.soir) usedMeals.add(dayMeals.soir.trim().toLowerCase());
            });

            // Appeler l'API pour générer un repas
            const result = await APIManager.generateSingleMeal(mealType, usedMeals);

            if (result.success && result.suggestion) {
                // Vérifier une dernière fois que le repas n'est pas déjà utilisé
                if (usedMeals.has(result.suggestion.trim().toLowerCase())) {
                    // Réessayer une fois
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
                    // Insérer le repas dans la textarea
                    textarea.value = result.suggestion;
                }

                // Déclencher l'événement de changement pour sauvegarder
                const event = new Event('input', { bubbles: true });
                textarea.dispatchEvent(event);

                UIManager.showStatus(
                    `✓ Repas généré pour ${day} ${mealType}`,
                    STATUS_TYPES.SUCCESS
                );
            } else {
                UIManager.showStatus(
                    'Impossible de générer un repas. Vérifiez vos préférences alimentaires.',
                    STATUS_TYPES.WARNING
                );
            }
        } catch (error) {
            console.error('Erreur génération repas unique:', error);
            UIManager.showStatus(
                error.message || 'Erreur lors de la génération',
                STATUS_TYPES.ERROR
            );
        } finally {
            // Réactiver le bouton
            if (button) {
                button.disabled = false;
                button.classList.remove('generating');
                button.textContent = '🎲 Générer';
            }
        }
    }

    /**
     * Affiche un aperçu des repas générés
     */
    static async showPreview() {
        try {
            const result = await APIManager.previewGeneratedMeals();

            if (result.success && result.preview) {
                this.displayPreviewModal(result.preview);
            }
        } catch (error) {
            console.error('Erreur aperçu:', error);
            UIManager.showStatus(
                error.message || 'Erreur lors de l\'aperçu',
                STATUS_TYPES.ERROR
            );
        }
    }

    /**
     * Affiche la modal d'aperçu
     * @param {Object} preview - Les repas générés
     */
    static displayPreviewModal(preview) {
        const weeks = Object.keys(preview);

        let previewHTML = '<div class="preview-container">';

        weeks.forEach(weekKey => {
            const weekNumber = weekKey.replace('week', '');
            previewHTML += `<h4>Semaine ${weekNumber}</h4>`;
            previewHTML += '<div class="preview-week">';

            Object.entries(preview[weekKey]).forEach(([day, meals]) => {
                previewHTML += `
          <div class="preview-day">
            <strong>${day.charAt(0).toUpperCase() + day.slice(1)}</strong>
            <div>☀️ ${meals.midi || '(vide)'}</div>
            <div>🌙 ${meals.soir || '(vide)'}</div>
          </div>
        `;
            });

            previewHTML += '</div>';
        });

        previewHTML += '</div>';

        // Afficher dans une alerte ou modal personnalisée
        // (Simplification pour l'exemple)
        alert('Aperçu des repas générés:\n\n' +
            Object.entries(preview.week1 || {})
                .map(([day, meals]) => `${day}: ${meals.midi} / ${meals.soir}`)
                .join('\n')
        );
    }
}