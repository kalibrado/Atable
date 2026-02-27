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
import { Menu } from './menu.js';
import { ShoppingList } from './shopping-list.js';
import { SettingsAccordion } from './settings-accordion.js';
import { ResponseHandler } from './response-handler.js';
/**
 * Classe principale de l'application
 * Orchestre l'initialisation et la coordination des modules
 */
class AtableApp {
    static async checkAuth() {
        try {
            const response = await fetch('/auth/me');
            if (response.status === 401) {
                // console.warn('⚠️ Non authentifié, redirection vers login');

                ResponseHandler.handleUnauthorized({
                    redirect: true
                });
            } else {
                // console.log('✅ Utilisateur authentifié');
            }
        } catch (error) {
            // console.log('Utilisateur non connecté');
        }
    }

    /**
     * Initialise l'application au chargement de la page
     */
    static async initialize() {
        this.checkAuth(); // Vérifie l'authentification avant de continuer
        try {
            // 1. EXPOSE LES HANDLERS EN PREMIER (avant tout événement DOM)
            // Ceci doit être fait AVANT l'initialisation des modules pour que les onclick HTML fonctionnent
            this.exposeGlobalHandlers();

            // 2. Initialiser le thème (doit être fait en premier pour éviter le flash)
            ThemeManager.initialize();

            // 3. Initialiser les composants de l'interface
            Menu.init();
            ShoppingList.init();

            // 4. Charger les informations utilisateur
            await AuthManager.loadUserInfo();

            // 5. Charger et afficher les données des repas
            await UIManager.loadAndRender();

            // 6. Initialiser le système de notifications
            await SettingsManager.initialize();

            // 7. Configurer les listeners de connectivité
            UIManager.setupConnectivityListeners();

            // 8. Configurer la sauvegarde avant déchargement
            UIManager.setupBeforeUnload();

            // 9. Configurer les événements de la modal
            SettingsManager.setupModalEvents();

            // 10. Configurer l'accordéon des paramètres
            SettingsAccordion.initialize();

            // 11. Configurer le toggle du mode sombre
            ThemeManager.setupToggleListener();

        } catch (error) {
            // console.error('Erreur lors de l\'initialisation:', error);
            UIManager.showStatus(
                'Erreur d\'initialisation de l\'application',
                'error'
            );
        }
    }

    /**
     * Expose les fonctions nécessaires globalement
     * Pour les handlers onclick dans le HTML
     * ⚠️ CRITIQUE : Ceci doit être appelé AVANT le rendu du DOM
     */
    static exposeGlobalHandlers() {
        // Handlers pour les paramètres
        window.responseHandler = (response) => ResponseHandler.handle(response);
        window.openSettings = () => SettingsManager.openModal();
        window.closeSettings = () => SettingsManager.closeModal();
        window.toggleNotifications = () => SettingsManager.toggleNotifications();
        window.updateNotificationTime = () => SettingsManager.updateNotificationTime();
        
        // Handler pour la déconnexion
        window.handleLogout = () => AuthManager.handleLogout();

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

        // Handlers pour la génération de repas
        window.generatorHandlers = {
            generateFillEmpty: () => GeneratorManager.generateAllMeals(false),
            generateReplaceAll: () => GeneratorManager.generateAllMeals(true),
            showPreview: () => GeneratorManager.showPreview(),
            generateSingleMeal: (day, mealType) => GeneratorManager.generateSingleMeal(day, mealType)
        };

        // Handlers pour la gestion utilisateur
        window.userManager = {
            changePassword: () => UserManager.changePassword(),
            changeEmail: () => UserManager.changeEmail(),
            deleteAccount: () => UserManager.deleteAccount()
        };

        // Handlers pour le menu hamburger
        window.menuHandlers = {
            toggle: () => Menu.toggle(),
            open: () => Menu.open(),
            close: () => Menu.close(),
            isOpen: () => Menu.isMenuOpen()
        };

        // Handlers pour la liste de courses
        window.shoppingListHandlers = {
            open: () => ShoppingList.open(),
            close: () => ShoppingList.close(),
            toggleItem: (key) => ShoppingList.toggleItem(key),
            resetAll: () => ShoppingList.resetAll()
        };

        // Pour compatibilité avec le HTML existant (onclick="toggleMobileMenu()")
        window.toggleMobileMenu = () => Menu.toggle();

        // console.log('✅ Handlers globaux exposés');
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