// ========================================
// Point d'entrée principal de l'application Atable!
// Ce fichier initialise l'application, charge les données nécessaires, et configure les interactions utilisateur.
// Il importe les modules de gestion de l'interface utilisateur, des paramètres, et de l'authentification.
// L'application est structurée en modules pour une meilleure organisation et maintenabilité.
// ========================================

import { UIManager } from './ui-handlers.js';
import { SettingsManager, AuthManager, GeneratorManager } from './settings.js';
import { ThemeManager } from './theme.js';
import { WeeksManager } from './weeks-manager.js';
import { UserManager } from './user-manager.js';

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
            // Initialiser le thème (doit être fait en premier pour éviter le flash)
            ThemeManager.initialize();

            // Charger les informations utilisateur
            await AuthManager.loadUserInfo();

            // Charger et afficher les données des repas
            await UIManager.loadAndRender();

            // Initialiser le système de notifications
            await SettingsManager.initialize();

            // Configurer les listeners de connectivité
            UIManager.setupConnectivityListeners();

            // Configurer la sauvegarde avant déchargement
            UIManager.setupBeforeUnload();

            // Configurer les événements de la modal
            SettingsManager.setupModalEvents();

            // Configurer le toggle du mode sombre
            ThemeManager.setupToggleListener();

            // Exposer les handlers globalement
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
        // Handlers pour les semaines
        window.weeksHandlers = {
            switchWeek: (weekNumber) => WeeksManager.switchWeek(weekNumber),
            updateNumberOfWeeks: (number) => WeeksManager.updateNumberOfWeeks(number)
        };
        window.generatorHandlers = {
            generateFillEmpty: () => GeneratorManager.generateAllMeals(false),
            generateReplaceAll: () => GeneratorManager.generateAllMeals(true),
            showPreview: () => GeneratorManager.showPreview()
        };
        
        window.userManager = {
            changePassword: () => UserManager.changePassword(),
            changeEmail: () => UserManager.changeEmail(),
            deleteAccount: () => UserManager.deleteAccount()
        }
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