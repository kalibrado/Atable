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
    console.log('🎯 Initialisation de l\'accordéon des paramètres');
    
    // Récupérer la modal pour cibler uniquement ses sections
    const modal = document.getElementById('settings-modal');
    if (!modal) {
      console.warn('⚠️ Modal de paramètres non trouvée');
      return;
    }

    // Restaurer l'état sauvegardé
    this.restoreState();

    // Attacher les événements
    this.attachEventListeners(modal);

    console.log('✅ Accordéon initialisé');
  }

  /**
   * Attache les événements de clic sur les headers
   * @param {HTMLElement} container - Conteneur (modal) où chercher les headers
   */
  static attachEventListeners(container) {
    // Chercher UNIQUEMENT dans la modal
    const headers = container.querySelectorAll('.settings-section-header');
    
    console.log(`📍 Trouvé ${headers.length} headers d'accordéon`);

    headers.forEach((header, index) => {
      // Supprimer les anciens event listeners (cloner et replacer)
      const newHeader = header.cloneNode(true);
      header.parentNode.replaceChild(newHeader, header);

      // Ajouter le nouvel event listener
      newHeader.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const section = newHeader.closest('.settings-section');
        console.log(`🔘 Clic header #${index}:`, section?.dataset.section);
        
        if (section) {
          this.toggleSection(section);
        }
      });

      // Ajouter un curseur pour indiquer que c'est cliquable
      newHeader.style.cursor = 'pointer';
    });
  }

  /**
   * Toggle une section
   * @param {HTMLElement} section - L'élément section à toggler
   */
  static toggleSection(section) {
    if (!section) {
      console.warn('⚠️ Section non trouvée');
      return;
    }

    const sectionId = section.dataset.section;
    const isCollapsed = section.classList.contains('collapsed');

    console.log(`🔄 Toggle section "${sectionId}" (actuellement: ${isCollapsed ? 'fermée' : 'ouverte'})`);

    if (isCollapsed) {
      // Ouvrir la section
      section.classList.remove('collapsed');
      this.state.collapsedSections.delete(sectionId);
      console.log(`✅ Ouverture: ${sectionId}`);
    } else {
      // Fermer la section
      section.classList.add('collapsed');
      this.state.collapsedSections.add(sectionId);
      console.log(`✅ Fermeture: ${sectionId}`);
    }

    // Sauvegarder l'état dans localStorage
    this.saveState();
  }

  /**
   * Ouvre toutes les sections
   */
  static expandAll() {
    console.log('📂 Ouverture de TOUTES les sections');
    
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const sections = modal.querySelectorAll('.settings-section');
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
    console.log('📁 Fermeture de TOUTES les sections');
    
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    const sections = modal.querySelectorAll('.settings-section');
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
      const state = Array.from(this.state.collapsedSections);
      localStorage.setItem(
        'atable-settings-accordion-state',
        JSON.stringify(state)
      );
      console.log('💾 État accordéon sauvegardé:', state);
    } catch (error) {
      console.error('❌ Erreur sauvegarde état accordéon:', error);
    }
  }

  /**
   * Restaure l'état depuis localStorage
   */
  static restoreState() {
    try {
      const modal = document.getElementById('settings-modal');
      if (!modal) {
        console.warn('⚠️ Modal non trouvée pour restaurer l\'état');
        return;
      }

      const saved = localStorage.getItem('atable-settings-accordion-state');
      if (saved) {
        const collapsedIds = JSON.parse(saved);
        this.state.collapsedSections = new Set(collapsedIds);

        console.log('📂 État restauré:', collapsedIds);

        // Appliquer l'état
        const sections = modal.querySelectorAll('.settings-section');
        sections.forEach(section => {
          const sectionId = section.dataset.section;
          if (this.state.collapsedSections.has(sectionId)) {
            section.classList.add('collapsed');
          } else {
            section.classList.remove('collapsed');
          }
        });
      } else {
        // Par défaut, replier toutes les sections
        const sections = modal.querySelectorAll('.settings-section');
        sections.forEach(section => {
          section.classList.add('collapsed');
          const sectionId = section.dataset.section;
          this.state.collapsedSections.add(sectionId);
        });
        this.saveState();
      }
    } catch (error) {
      console.error('❌ Erreur restauration état accordéon:', error);
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
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        const section = modal.querySelector(`.settings-section[data-section="${sectionId}"]`);
        if (section) {
          this.toggleSection(section);
        }
      }
    };
    
    console.log('✅ Handlers accordéon exposés globalement');
  }
}