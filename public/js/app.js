// ========================================
// Point d'entrée principal de l'application Atable!
// Ce fichier initialise l'application, charge les données nécessaires, et configure les interactions utilisateur.
// Il importe les modules de gestion de l'interface utilisateur, des paramètres, et de l'authentification.
// L'application est structurée en modules pour une meilleure organisation et maintenabilité.
// ========================================

import { UIManager } from './ui-handlers.js';
import { SettingsManager, AuthManager } from './settings.js';
import { ThemeManager } from './theme.js';

/**
 * Classe principale de l'application
 * Orchestre l'initialisation et la coordination des modules
 */
class AtableApp {
    /**
     * Initialise l'application au chargement de la page
     */
    static async initialize() {
        console.log('🚀 Initialisation de l\'application Atable...');

        try {
            // 0. Initialiser le thème (doit être fait en premier pour éviter le flash)
            ThemeManager.initialize();

            // 1. Charger les informations utilisateur
            await AuthManager.loadUserInfo();

            // 2. Charger et afficher les données des repas
            await UIManager.loadAndRender();

            // 3. Initialiser le système de notifications
            await SettingsManager.initialize();

            // 4. Configurer les listeners de connectivité
            UIManager.setupConnectivityListeners();

            // 5. Configurer la sauvegarde avant déchargement
            UIManager.setupBeforeUnload();

            // 6. Configurer les événements de la modal
            SettingsManager.setupModalEvents();

            // 7. Configurer le toggle du mode sombre
            ThemeManager.setupToggleListener();

            // 8. Exposer les handlers globalement
            this.exposeGlobalHandlers();

            console.log('Application prête');

        } catch (error) {
            console.error('Erreur lors de l\'initialisation:', error);
            UIManager.showStatus(
                'Erreur d\'initialisation de l\'application',
                'error'
            );
        }
    }

    /**
     * Expose les fonctions nécessaires globalement
     * Pour les handlers onclick dans le HTML
     */
    static exposeGlobalHandlers() {
        // Handlers pour les paramètres
        window.openSettings = () => SettingsManager.openModal();
        window.closeSettings = () => SettingsManager.closeModal();
        window.toggleNotifications = () => SettingsManager.toggleNotifications();
        window.updateNotificationTime = () => SettingsManager.updateNotificationTime();
        window.getMachineId = () => SettingsManager.getMachineId();
        // Handler pour la déconnexion
        window.handleLogout = () => AuthManager.handleLogout();

        // Handlers pour l'UI
        window.appHandlers = {
            toggleDay: (day) => UIManager.toggleDay(day)
        };
        // Handlers pour le thème
        window.themeHandlers = {
            toggle: () => ThemeManager.toggle(),
            reset: () => ThemeManager.resetToSystemTheme(),
            isDark: () => ThemeManager.isDarkMode()
        };
    }
}

// ========================================
// Lancement de l'application
// ========================================

/**
 * Point d'entrée : lance l'app quand le DOM est chargé
 */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        AtableApp.initialize();
    });
} else {
    AtableApp.initialize();
}