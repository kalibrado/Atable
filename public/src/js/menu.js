/**
 * @fileoverview Gestion du menu hamburger mobile
 * @module menu
 */

/**
 * Classe de gestion du menu hamburger mobile
 * Gère l'ouverture, la fermeture et les animations du menu
 */
export class Menu {
  /** @type {HTMLElement|null} Élément modal du menu */
  static modal = null;

  /** @type {boolean} État d'ouverture du menu */
  static isOpen = false;

  /** @type {HTMLElement|null} Élément qui avait le focus avant l'ouverture */
  static previousFocusElement = null;

  /** @type {NodeList|null} Éléments focusables dans le menu */
  static focusableElements = null;

  /** @type {number|null} Timeout pour l'animation de fermeture */
  static closeTimeout = null;

  /**
   * Initialise le gestionnaire de menu
   * Configure les événements et prépare les éléments
   * @returns {void}
   */
  static init() {
    this.modal = document.getElementById('mobile-menu-modal');
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeBtn = this.modal?.querySelector('.close-menu-btn');

    if (!this.modal || !hamburgerBtn) {
      console.warn('Éléments du menu introuvables');
      return;
    }

    // Événements des boutons
    hamburgerBtn.addEventListener('click', () => this.toggle());
    closeBtn?.addEventListener('click', () => this.close());

    // Empêcher la propagation des clics sur le contenu du menu
    const menuContent = this.modal.querySelector('.mobile-menu-content');
    if (menuContent) {
      menuContent.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    }

    // Fermeture au clic sur le backdrop
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // Support du clavier
    this.setupKeyboardNavigation();

    // Récupérer les éléments focusables
    this.updateFocusableElements();
  }

  /**
   * Configure la navigation au clavier
   * @private
   * @returns {void}
   */
  static setupKeyboardNavigation() {
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      switch (e.key) {
        case 'Escape':
          this.close();
          break;
        case 'Tab':
          this.handleTabKey(e);
          break;
      }
    });
  }

  /**
   * Gère la navigation par Tab pour garder le focus dans le menu
   * @private
   * @param {KeyboardEvent} event - L'événement clavier
   * @returns {void}
   */
  static handleTabKey(event) {
    if (!this.focusableElements || this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  /**
   * Met à jour la liste des éléments focusables
   * @private
   * @returns {void}
   */
  static updateFocusableElements() {
    if (!this.modal) return;

    const selector = 'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = this.modal.querySelectorAll(selector);
  }

  /**
   * Bascule l'état du menu (ouvert/fermé)
   * @returns {void}
   */
  static toggle() {
    this.isOpen ? this.close() : this.open();
  }

  /**
   * Ouvre le menu
   * @returns {void}
   */
  static open() {
    if (!this.modal || this.isOpen) return;

    // Annuler un éventuel timeout de fermeture en cours
    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }

    // Sauvegarder l'élément qui a le focus
    this.previousFocusElement = document.activeElement;

    // Ouvrir le menu
    this.modal.classList.remove('closing');
    this.modal.classList.add('active');
    this.isOpen = true;

    // Bloquer le scroll du body
    document.body.style.overflow = 'hidden';

    // Donner le focus au bouton de fermeture après l'animation
    setTimeout(() => {
      const closeBtn = this.modal?.querySelector('.close-menu-btn');
      closeBtn?.focus();
    }, 100);

    // Annoncer l'ouverture pour les lecteurs d'écran
    this.announceToScreenReader('Menu ouvert');
  }

  /**
   * Ferme le menu avec animation
   * @returns {void}
   */
  static close() {
    if (!this.modal || !this.isOpen) return;

    // Ajouter la classe pour l'animation de sortie
    this.modal.classList.add('closing');
    this.isOpen = false;

    // Restaurer le scroll du body
    document.body.style.overflow = '';

    // Restaurer le focus
    if (this.previousFocusElement && typeof this.previousFocusElement.focus === 'function') {
      this.previousFocusElement.focus();
    }

    // Annoncer la fermeture pour les lecteurs d'écran
    this.announceToScreenReader('Menu fermé');

    // Retirer les classes après l'animation
    this.closeTimeout = setTimeout(() => {
      this.modal.classList.remove('active', 'closing');
      this.closeTimeout = null;
    }, 300); // Correspond à la durée de l'animation CSS
  }

  /**
   * Annonce un message aux lecteurs d'écran
   * @private
   * @param {string} message - Le message à annoncer
   * @returns {void}
   */
  static announceToScreenReader(message) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Vérifie si le menu est ouvert
   * @returns {boolean} True si le menu est ouvert
   */
  static isMenuOpen() {
    return this.isOpen;
  }

  /**
   * Force la fermeture du menu (sans animation)
   * Utile pour les changements de page
   * @returns {void}
   */
  static forceClose() {
    if (!this.modal) return;

    this.modal.classList.remove('active', 'closing');
    this.isOpen = false;
    document.body.style.overflow = '';

    if (this.closeTimeout) {
      clearTimeout(this.closeTimeout);
      this.closeTimeout = null;
    }
  }
}

// Fonction globale pour la compatibilité avec le HTML existant
window.toggleMobileMenu = function() {
  Menu.toggle();
};