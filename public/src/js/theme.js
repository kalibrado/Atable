// ========================================
// Gestion du thème (Mode Sombre / Mode Clair)
// ========================================

/**
 * Classe de gestion du thème de l'application
 * Gère le changement entre mode clair et mode sombre
 */
export class ThemeManager {
  /**
   * Clé de stockage local pour le thème
   * @private
   */
  static STORAGE_KEY = 'atable-theme-preference';

  /**
   * Thèmes disponibles
   */
  static THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
  };

  /**
   * Initialise le gestionnaire de thème
   * Charge la préférence sauvegardée ou détecte la préférence système
   */
  static initialize() {
    console.log('🎨 Initialisation du gestionnaire de thème...');

    // Charger le thème sauvegardé ou détecter la préférence système
    const savedTheme = this.getSavedTheme();
    const systemTheme = this.getSystemTheme();
    const initialTheme = savedTheme || systemTheme;

    // Appliquer le thème
    this.applyTheme(initialTheme);

    // Mettre à jour le toggle dans l'UI
    this.updateToggle();

    // Écouter les changements de préférence système
    this.watchSystemTheme();

    console.log(`Thème initialisé: ${initialTheme}`);
  }

  /**
   * Récupère le thème sauvegardé dans le localStorage
   * @returns {string|null} Le thème sauvegardé ou null
   */
  static getSavedTheme() {
    try {
      return localStorage.getItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Erreur lecture thème sauvegardé:', error);
      return null;
    }
  }

  /**
   * Détecte la préférence de thème du système
   * @returns {string} 'dark' ou 'light'
   */
  static getSystemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return this.THEMES.DARK;
    }
    return this.THEMES.LIGHT;
  }

  /**
   * Obtient le thème actuel
   * @returns {string} Le thème actuel ('dark' ou 'light')
   */
  static getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || this.THEMES.LIGHT;
  }

  /**
   * Applique un thème à l'application
   * @param {string} theme - Le thème à appliquer ('dark' ou 'light')
   */
  static applyTheme(theme) {
    if (theme === this.THEMES.DARK) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }

    // Sauvegarder la préférence
    this.saveTheme(theme);

    // Mettre à jour la couleur de la barre d'adresse (PWA)
    this.updateMetaThemeColor(theme);

    console.log(`Thème appliqué: ${theme}`);
  }

  /**
   * Toggle entre mode clair et mode sombre
   * @returns {string} Le nouveau thème
   */
  static toggle() {
    const currentTheme = this.getCurrentTheme();
    const newTheme = currentTheme === this.THEMES.DARK
      ? this.THEMES.LIGHT
      : this.THEMES.DARK;

    this.applyTheme(newTheme);
    this.updateToggle();

    return newTheme;
  }

  /**
   * Sauvegarde la préférence de thème
   * @param {string} theme - Le thème à sauvegarder
   */
  static saveTheme(theme) {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.error('Erreur sauvegarde thème:', error);
    }
  }

  /**
   * Met à jour l'état du toggle dans l'interface
   */
  static updateToggle() {
    const darkModeToggle = document.getElementById('dark-mode');

    if (darkModeToggle) {
      const isDark = this.getCurrentTheme() === this.THEMES.DARK;
      darkModeToggle.checked = isDark;
    }
  }

  /**
   * Configure l'écouteur d'événements pour le toggle
   */
  static setupToggleListener() {
    const darkModeToggle = document.getElementById('dark-mode');

    if (darkModeToggle) {
      darkModeToggle.addEventListener('change', (event) => {
        const theme = event.target.checked
          ? this.THEMES.DARK
          : this.THEMES.LIGHT;

        this.applyTheme(theme);

        // Feedback visuel
        this.showThemeChangeNotification(theme);
      });
    }
  }

  /**
   * Affiche une notification de changement de thème
   * @param {string} theme - Le nouveau thème
   */
  static showThemeChangeNotification(theme) {
    // Import dynamique pour éviter la circularité
    import('./ui-handlers.js').then(({ UIManager }) => {
      const message = theme === this.THEMES.DARK
        ? '🌙 Mode sombre activé'
        : '☀️ Mode clair activé';

      UIManager.showStatus(message, 'success');
    });
  }

  /**
   * Met à jour la couleur de la barre d'adresse (meta theme-color)
   * @param {string} theme - Le thème actuel
   */
  static updateMetaThemeColor(theme) {
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');

    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.name = 'theme-color';
      document.head.appendChild(metaThemeColor);
    }

    // Couleurs pour la barre d'adresse
    const colors = {
      [this.THEMES.LIGHT]: '#069494',
      [this.THEMES.DARK]: '#1e293b'
    };

    metaThemeColor.content = colors[theme];
  }

  /**
   * Écoute les changements de préférence système
   * Met à jour automatiquement si l'utilisateur n'a pas de préférence sauvegardée
   */
  static watchSystemTheme() {
    if (!window.matchMedia) {
      return;
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    darkModeQuery.addEventListener('change', (event) => {
      // Ne changer que si pas de préférence manuelle sauvegardée
      const savedTheme = this.getSavedTheme();

      if (!savedTheme) {
        const systemTheme = event.matches
          ? this.THEMES.DARK
          : this.THEMES.LIGHT;

        this.applyTheme(systemTheme);
        this.updateToggle();

        console.log('Thème mis à jour selon préférence système:', systemTheme);
      }
    });
  }

  /**
   * Réinitialise le thème à la préférence système
   */
  static resetToSystemTheme() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      const systemTheme = this.getSystemTheme();
      this.applyTheme(systemTheme);
      this.updateToggle();

      console.log('Thème réinitialisé à la préférence système');
    } catch (error) {
      console.error('Erreur réinitialisation thème:', error);
    }
  }

  /**
   * Vérifie si le mode sombre est actif
   * @returns {boolean} True si mode sombre actif
   */
  static isDarkMode() {
    return this.getCurrentTheme() === this.THEMES.DARK;
  }
}