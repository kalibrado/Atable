// ========================================
// Gestion des ingrédients et préférences alimentaires
// ========================================

import { APIManager } from './api.js';
import { UIManager } from './ui-handlers.js';
import { STATUS_TYPES } from './config.js';

/**
 * Classe de gestion des ingrédients
 */
export class IngredientsManager {
  /**
   * État des ingrédients
   * @private
   */
  static state = {
    ingredients: {},
    categories: [],
    collapsedCategories: new Set()
  };

  /**
   * Initialise le gestionnaire d'ingrédients
   */
  static async initialize() {
    try {
      // Charger les ingrédients depuis l'API
      const data = await APIManager.fetchIngredients();
      this.state.ingredients = data.ingredients || {};

      // Récupérer les catégories depuis la config serveur
      this.state.categories = Object.keys(this.state.ingredients);

      console.log('✅ Ingrédients initialisés');
    } catch (error) {
      console.error('Erreur initialisation ingrédients:', error);
      UIManager.showStatus('Erreur lors du chargement des ingrédients', STATUS_TYPES.ERROR);
    }
  }

  /**
   * Rend l'interface des ingrédients dans la modal
   */
  static render() {
    const container = document.getElementById('ingredients-container');
    if (!container) return;

    if (Object.keys(this.state.ingredients).length === 0) {
      container.innerHTML = '<p class="empty-ingredients">Aucune catégorie d\'ingrédients disponible</p>';
      return;
    }

    const categoriesHTML = Object.entries(this.state.ingredients)
      .map(([category, data]) => this.renderCategory(category, data))
      .join('');

    container.innerHTML = categoriesHTML;

    // Attacher les événements
    this.attachEventListeners();
  }

  /**
   * Rend une catégorie d'ingrédients
   * @param {string} category - Nom de la catégorie
   * @param {Object} data - Données de la catégorie
   */
  static renderCategory(category, data) {
    const isCollapsed = this.state.collapsedCategories.has(category);
    const collapsedClass = isCollapsed ? 'collapsed' : '';

    const itemsHTML = data.items && data.items.length > 0
      ? data.items.map(item => this.renderItem(category, item)).join('')
      : '<span class="empty-items">Aucun ingrédient ajouté</span>';

    return `
            <div class="ingredient-category ${collapsedClass}" data-category="${category}">
                <div class="category-header" onclick="window.ingredientsHandlers.toggleCategory('${category}')">
                    <span class="category-title">${category}</span>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-content">
                    <div class="repas-toggles">
                        <div class="repas-toggle">
                            <input 
                                type="checkbox" 
                                id="midi-${category}" 
                                ${data.repas?.midi ? 'checked' : ''}
                                onchange="window.ingredientsHandlers.updateRepas('${category}', 'midi', this.checked)"
                            >
                            <label for="midi-${category}">☀️ Midi</label>
                        </div>
                        <div class="repas-toggle">
                            <input 
                                type="checkbox" 
                                id="soir-${category}" 
                                ${data.repas?.soir ? 'checked' : ''}
                                onchange="window.ingredientsHandlers.updateRepas('${category}', 'soir', this.checked)"
                            >
                            <label for="soir-${category}">🌙 Soir</label>
                        </div>
                    </div>
                    <div class="items-list" data-category-items="${category}">
                        ${itemsHTML}
                    </div>
                    <div class="add-item-form">
                        <input 
                            type="text" 
                            class="add-item-input" 
                            placeholder="Ajouter un ingrédient..."
                            data-category="${category}"
                            onkeypress="window.ingredientsHandlers.handleKeyPress(event, '${category}')"
                        >
                        <button 
                            class="add-item-btn" 
                            onclick="window.ingredientsHandlers.addItem('${category}')"
                        >
                            Ajouter
                        </button>
                    </div>
                </div>
            </div>
        `;
  }

  /**
   * Rend un item d'ingrédient
   * @param {string} category - Catégorie de l'item
   * @param {string} item - Nom de l'item
   */
  static renderItem(category, item) {
    return `
            <span class="item-tag">
                ${item}
                <button 
                    class="item-remove" 
                    onclick="window.ingredientsHandlers.removeItem('${category}', '${item}')"
                    aria-label="Supprimer ${item}"
                >
                    ×
                </button>
            </span>
        `;
  }

  /**
   * Toggle l'état replié/déplié d'une catégorie
   * @param {string} category - La catégorie à toggle
   */
  static toggleCategory(category) {
    const categoryElement = document.querySelector(`.ingredient-category[data-category="${category}"]`);
    if (!categoryElement) return;

    if (this.state.collapsedCategories.has(category)) {
      this.state.collapsedCategories.delete(category);
      categoryElement.classList.remove('collapsed');
    } else {
      this.state.collapsedCategories.add(category);
      categoryElement.classList.add('collapsed');
    }
  }

  /**
   * Ajoute un item à une catégorie
   * @param {string} category - La catégorie
   */
  static async addItem(category) {
    const input = document.querySelector(`.add-item-input[data-category="${category}"]`);
    if (!input) return;

    const item = input.value.trim();
    if (!item) {
      UIManager.showStatus('Veuillez saisir un ingrédient', STATUS_TYPES.WARNING);
      return;
    }

    try {
      const result = await APIManager.addIngredientItem(category, item);

      if (result.success) {
        // Mettre à jour l'état local
        if (!this.state.ingredients[category].items) {
          this.state.ingredients[category].items = [];
        }

        if (!this.state.ingredients[category].items.includes(item)) {
          this.state.ingredients[category].items.push(item);
        }

        // Vider l'input
        input.value = '';

        // Re-render la liste des items
        this.renderItemsList(category);

        UIManager.showStatus(`✓ ${item} ajouté`, STATUS_TYPES.SUCCESS);
      }
    } catch (error) {
      console.error('Erreur ajout item:', error);
      UIManager.showStatus('Erreur lors de l\'ajout', STATUS_TYPES.ERROR);
    }
  }

  /**
   * Supprime un item d'une catégorie
   * @param {string} category - La catégorie
   * @param {string} item - L'item à supprimer
   */
  static async removeItem(category, item) {
    try {
      const result = await APIManager.removeIngredientItem(category, item);

      if (result.success) {
        // Mettre à jour l'état local
        if (this.state.ingredients[category].items) {
          this.state.ingredients[category].items =
            this.state.ingredients[category].items.filter(i => i !== item);
        }

        // Re-render la liste des items
        this.renderItemsList(category);

        UIManager.showStatus(`✓ ${item} supprimé`, STATUS_TYPES.SUCCESS);
      }
    } catch (error) {
      console.error('Erreur suppression item:', error);
      UIManager.showStatus('Erreur lors de la suppression', STATUS_TYPES.ERROR);
    }
  }

  /**
   * Met à jour les préférences de repas pour une catégorie
   * @param {string} category - La catégorie
   * @param {string} mealType - 'midi' ou 'soir'
   * @param {boolean} checked - État du checkbox
   */
  static async updateRepas(category, mealType, checked) {
    try {
      // Mettre à jour l'état local
      if (!this.state.ingredients[category].repas) {
        this.state.ingredients[category].repas = { midi: true, soir: true };
      }
      this.state.ingredients[category].repas[mealType] = checked;

      // Envoyer au serveur
      const result = await APIManager.updateCategoryRepas(
        category,
        this.state.ingredients[category].repas
      );

      if (result.success) {
        UIManager.showStatus('✓ Préférences mises à jour', STATUS_TYPES.SUCCESS);
      }
    } catch (error) {
      console.error('Erreur mise à jour repas:', error);
      UIManager.showStatus('Erreur lors de la mise à jour', STATUS_TYPES.ERROR);

      // Revenir à l'état précédent
      const checkbox = document.getElementById(`${mealType}-${category}`);
      if (checkbox) {
        checkbox.checked = !checked;
      }
    }
  }

  /**
   * Gère l'appui sur la touche Entrée dans l'input
   * @param {Event} event - L'événement clavier
   * @param {string} category - La catégorie
   */
  static handleKeyPress(event, category) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addItem(category);
    }
  }

  /**
   * Re-render la liste des items d'une catégorie
   * @param {string} category - La catégorie
   */
  static renderItemsList(category) {
    const itemsContainer = document.querySelector(`.items-list[data-category-items="${category}"]`);
    if (!itemsContainer) return;

    const data = this.state.ingredients[category];
    const itemsHTML = data.items && data.items.length > 0
      ? data.items.map(item => this.renderItem(category, item)).join('')
      : '<span class="empty-items">Aucun ingrédient ajouté</span>';

    itemsContainer.innerHTML = itemsHTML;
  }

  /**
   * Attache les événements nécessaires
   */
  static attachEventListeners() {
    // Les événements sont gérés via les attributs onclick dans le HTML
    // pour simplifier la gestion avec les handlers globaux
  }

  /**
   * Expose les handlers globalement
   */
  static exposeHandlers() {
    window.ingredientsHandlers = {
      toggleCategory: (category) => this.toggleCategory(category),
      addItem: (category) => this.addItem(category),
      removeItem: (category, item) => this.removeItem(category, item),
      updateRepas: (category, mealType, checked) => this.updateRepas(category, mealType, checked),
      handleKeyPress: (event, category) => this.handleKeyPress(event, category)
    };
  }

  /**
   * Récupère les ingrédients actuels
   * @returns {Object} Les ingrédients
   */
  static getIngredients() {
    return this.state.ingredients;
  }
}