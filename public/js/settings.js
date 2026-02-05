// ========================================
// Gestion des paramètres et notifications
// ========================================

import { APIManager } from './api.js';
import { UIManager } from './ui-handlers.js';
import { STATUS_MESSAGES, STATUS_TYPES } from './config.js';

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
        // Mettre à jour l'UI
        console.log('Mise à jour de l\'interface des paramètres...');
        await SettingsManager.updateUI();

        // Attacher l'événement au toggle de notifications
        const notifToggle = document.getElementById('enable-notifications');
        if (notifToggle) {
            notifToggle.addEventListener('change', async () => {
                console.log('Toggle de notifications changé, mise à jour des paramètres...');
                await SettingsManager.toggleNotifications();
                await SettingsManager.updateUI();
            });
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
            // État du toggle (basé sur la subscription)
            const isSubscribed = await window.notificationSystem.isSubscribed();
            const enableCheckbox = document.getElementById('enable-notifications');
            if (enableCheckbox) {
                enableCheckbox.checked = isSubscribed;
            }

            // Heure de notification
            const { hour, minute } = await window.notificationSystem.getTime();
            const timeInput = document.getElementById('notification-time');
            if (timeInput) {
                timeInput.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            }

            // Activer/désactiver l'input de temps
            const timeSetting = document.getElementById('time-setting');
            if (timeSetting && timeInput) {
                if (isSubscribed) {
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
            console.error('Erreur mise à jour UI paramètres:', error);
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
            console.warn('Notifications non supportées par ce navigateur');
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
        console.log('Affichage du statut de permission:', Notification.permission);
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
            // S'abonner avec les paramètres actuels
            const { hour, minute } = window.notificationSystem.getTime();
            const success = await window.notificationSystem.subscribe({
                enabled,
                hour,
                minute
            });
            console.log('Résultat de l\'abonnement aux notifications:', success);
            if (!success) {
                checkbox.checked = false;
                alert('Impossible d\'activer les notifications. Vérifiez les permissions de votre navigateur.');
                return;
            }
        } else {
            // Se désabonner
            const success = await window.notificationSystem.unsubscribe();
            console.log('Résultat du désabonnement des notifications:', success);
            if (!success) {
                checkbox.checked = true;
                alert('Impossible de désactiver les notifications. Réessayez.');
                return;
            }
        }
        // Mettre à jour l'UI
        await SettingsManager.updateUI();
    }

    /**
     * Met à jour l'heure de notification
     */
    static async updateNotificationTime() {
        console.log('Mise à jour de l\'heure de notification...');
        const timeInput = document.getElementById('notification-time');

        if (!timeInput || !window.notificationSystem) {
            return;
        }

        const [hour, minute] = timeInput.value.split(':').map(Number);

        console.log('Nouvelle heure de notification:', hour, minute);
        await window.notificationSystem.saveTime(hour, minute);
        console.log('Heure de notification mise à jour avec succès');
        UIManager.showStatus(
            STATUS_MESSAGES.NOTIFICATION_TIME_UPDATED,
            STATUS_TYPES.SUCCESS
        );
    }

    /**
     * Initialise le système de notifications
     */
    static async initialize() {
        console.log('Initialisation du système de notifications...');
        if (!window.notificationSystem) {
            console.warn('Système de notifications non disponible');
            return;
        }

        // Démarrer le système de notifications
        console.log('Démarrage du système de notifications...');
        await window.notificationSystem.start();
        console.log('Système de notifications initialisé avec succès');
        // Mettre à jour l'UI si la modal est ouverte
        const modal = document.getElementById('settings-modal');
        if (modal && modal.classList.contains('show')) {
            console.log('Modal de paramètres ouverte, mise à jour de l\'interface...');
            await SettingsManager.updateUI();
            console.log('Interface des paramètres mise à jour après initialisation du système de notifications');
        }
    }

    /**
     * Configure les événements de fermeture de la modal
     */
    static setupModalEvents() {
        console.log('Configuration des événements de la modal de paramètres...');
        // Fermer en cliquant en dehors
        window.addEventListener('click', (event) => {
            const modal = document.getElementById('settings-modal');
            if (event.target === modal) {
                console.log('Clic en dehors de la modal, fermeture...');
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
        console.log('Déconnexion de l\'utilisateur...');
        if (!confirm('Voulez-vous vraiment vous déconnecter ?')) {
            return;
        }

        try {
            const success = await APIManager.logout();
            console.log('Résultat de la déconnexion:', success);
            if (success) {
                // Rediriger vers la page de login
                console.log('Redirection vers la page de login...');
                window.location.href = '/login';
            } else {
                UIManager.showStatus(
                    'Erreur lors de la déconnexion',
                    STATUS_TYPES.ERROR
                );
            }
        } catch (error) {
            console.error('Erreur déconnexion:', error);
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
        console.log('Chargement des informations utilisateur...');
        try {
            const { user, subscriptions } = await APIManager.fetchUserInfo();
            console.log('Informations utilisateur chargées:', user);
            if (user && user.name) {
                // Import dynamique pour éviter la circularité
                const { UIRenderer } = await import('./ui-renderer.js');
                UIRenderer.displayUserName(user.name);
            }
            if (subscriptions) {
                console.log('Subscriptions utilisateur chargées:', subscriptions);
            }
        } catch (error) {
            console.error('Erreur chargement infos utilisateur:', error);
        }
    }
}