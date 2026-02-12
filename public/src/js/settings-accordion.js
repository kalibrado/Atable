// ========================================
// Gestion de l'accordéon des paramètres
// ========================================

export class SettingsAccordion {
  /**
   * État des sections
   */
  static state = {
    collapsedSections: new Set()
  };

  /**
   * Initialise l'accordéon
   */
  static initialize() {
    // Replier toutes les sections par défaut
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
      const sectionId = section.dataset.section;
      if (sectionId) {
        section.classList.add('collapsed');
        this.state.collapsedSections.add(sectionId);
      }
    });

    // Attacher les événements
    this.attachEventListeners();
  }

  /**
   * Attache les événements de clic sur les headers
   */
  static attachEventListeners() {
    const headers = document.querySelectorAll('.settings-section-header');
    
    headers.forEach(header => {
      header.addEventListener('click', (e) => {
        e.preventDefault();
        const section = header.closest('.settings-section');
        this.toggleSection(section);
      });
    });
  }

  /**
   * Toggle une section
   * @param {HTMLElement} section - L'élément section à toggler
   */
  static toggleSection(section) {
    if (!section) return;

    const sectionId = section.dataset.section;
    const isCollapsed = section.classList.contains('collapsed');

    if (isCollapsed) {
      // Ouvrir la section
      section.classList.remove('collapsed');
      this.state.collapsedSections.delete(sectionId);
    } else {
      // Fermer la section
      section.classList.add('collapsed');
      this.state.collapsedSections.add(sectionId);
    }

    // Sauvegarder l'état dans localStorage
    this.saveState();
  }

  /**
   * Ouvre toutes les sections
   */
  static expandAll() {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
      section.classList.remove('collapsed');
      const sectionId = section.dataset.section;
      this.state.collapsedSections.delete(sectionId);
    });
    this.saveState();
  }

  /**
   * Ferme toutes les sections
   */
  static collapseAll() {
    const sections = document.querySelectorAll('.settings-section');
    sections.forEach(section => {
      section.classList.add('collapsed');
      const sectionId = section.dataset.section;
      this.state.collapsedSections.add(sectionId);
    });
    this.saveState();
  }

  /**
   * Sauvegarde l'état dans localStorage
   */
  static saveState() {
    try {
      localStorage.setItem(
        'atable-settings-accordion-state',
        JSON.stringify(Array.from(this.state.collapsedSections))
      );
    } catch (error) {
      console.error('Erreur sauvegarde état accordéon:', error);
    }
  }

  /**
   * Restaure l'état depuis localStorage
   */
  static restoreState() {
    try {
      const saved = localStorage.getItem('atable-settings-accordion-state');
      if (saved) {
        const collapsedIds = JSON.parse(saved);
        this.state.collapsedSections = new Set(collapsedIds);

        // Appliquer l'état
        const sections = document.querySelectorAll('.settings-section');
        sections.forEach(section => {
          const sectionId = section.dataset.section;
          if (this.state.collapsedSections.has(sectionId)) {
            section.classList.add('collapsed');
          } else {
            section.classList.remove('collapsed');
          }
        });
      }
    } catch (error) {
      console.error('Erreur restauration état accordéon:', error);
    }
  }

  /**
   * Expose les handlers globalement
   */
  static exposeHandlers() {
    window.settingsAccordion = {
      expandAll: () => this.expandAll(),
      collapseAll: () => this.collapseAll(),
      toggle: (sectionId) => {
        const section = document.querySelector(`.settings-section[data-section="${sectionId}"]`);
        if (section) {
          this.toggleSection(section);
        }
      }
    };
  }
}