// ========================================
// WindowDynamique
// ========================================

export class WindowDynamique {

  static MOBILE_BREAKPOINT = 600;
  static initialized = false;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    this.runAll();
    this.bindEvents();
  }

  // POINT CENTRAL
  static runAll() {
    this.responsiveWeekTabs();
    this.responsiveHeaderTitle();
  }

  static responsiveHeaderTitle() {
    const header = document.querySelector('#name-user');
    if (!header) return;

    const isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;

    if (!header.dataset.fullTitle) {
      header.dataset.fullTitle = header.textContent.trim();
    }

    header.textContent = isMobile
      ? header.dataset.fullTitle.split(' ').map(word => word.charAt(0)).join('.')
      : header.dataset.fullTitle;
  }
  // -----------------------------
  // Fonctions responsive
  // -----------------------------

  static responsiveWeekTabs() {
    const tabs = document.querySelectorAll('#weeks-tabs-container .week-tab');
    if (!tabs.length) return;

    const isMobile = window.innerWidth <= this.MOBILE_BREAKPOINT;

    tabs.forEach(tab => {
      if (!tab.dataset.fullLabel) {
        tab.dataset.fullLabel = tab.textContent.trim();
      }

      tab.textContent = isMobile
        ? `S. ${tab.dataset.week}`
        : tab.dataset.fullLabel;
    });
  }

  // -----------------------------
  // Events globaux
  // -----------------------------

  static bindEvents() {
    const run = () => this.runAll();

    // Resize classique (desktop + certains mobiles)
    window.addEventListener('resize', run);

    // Orientation (mobile)
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', run);
    } else {
      // Fallback vieux navigateurs
      window.addEventListener('orientationchange', () => {
        setTimeout(run, 150);
      });
    }

    // Retour depuis background (PWA installée)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) run();
    });

    // PWA : retour au premier plan
    window.addEventListener('focus', run);

    // PWA Android : clavier virtuel / resize viewport
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        run()
      });

      // Masquer/afficher le header selon le clavier virtuel (PWA Android)
      const header = document.querySelector(".container>header");
      if (header) {
        const isKeyboardOpen = window.visualViewport.height < window.innerHeight * 0.75;
        header.style.display = isKeyboardOpen ? 'none' : 'block';
      }
    }
    run()
  };

}
