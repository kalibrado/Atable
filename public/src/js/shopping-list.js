/**
 * @fileoverview Gestion de la liste de courses générée depuis les repas
 * @module shopping-list
 */

import { WeeksManager } from './weeks-manager.js';
import { UIManager } from './ui-handlers.js';

/**
 * Classe de gestion de la liste de courses
 */
export class ShoppingList {
  /** @type {Set<string>} Éléments marqués comme achetés */
  static purchasedItems = new Set();

  /** @type {HTMLElement|null} Élément modal */
  static modal = null;

  /**
   * Initialise la liste de courses
   */
  static init() {
    this.modal = document.getElementById('shopping-list-modal');
    if (!this.modal) return;

    // Fermeture au clic sur le backdrop
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Fermeture clavier
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.close();
      }
    });
  }

  /**
   * Parse un repas (string) pour extraire les ingrédients individuels
   * Ex: "Carottes, Poulet et Riz" → ["Carottes", "Poulet", "Riz"]
   * @param {string} meal
   * @returns {string[]}
   */
  static parseMeal(meal) {
    if (!meal || typeof meal !== 'string' || meal.trim() === '') return [];

    const normalized = meal
      .replace(/\s+et\s+/gi, ',')
      .replace(/\s+avec\s+/gi, ',');

    return normalized
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  /**
   * Agrège tous les ingrédients depuis toutes les semaines
   * @returns {Map<string, {label: string, count: number}>}
   */
  static aggregateIngredients() {
    const counts = new Map();

    // Récupère toutes les semaines depuis WeeksManager
    const allWeeksData = WeeksManager.getAllWeeksData();

    // S'assurer que la semaine courante est incluse
    const currentWeekData = UIManager.getState().mealsData;
    const currentWeekKey = `week${WeeksManager.getCurrentWeek()}`;
    if (currentWeekData) {
      allWeeksData[currentWeekKey] = currentWeekData;
    }

    for (const weekData of Object.values(allWeeksData)) {
      if (!weekData) continue;

      for (const dayData of Object.values(weekData)) {
        if (!dayData) continue;

        const meals = [dayData.midi, dayData.soir].filter(Boolean);
        for (const meal of meals) {
          for (const ingredient of this.parseMeal(meal)) {
            const key = ingredient.toLowerCase();
            if (!counts.has(key)) {
              counts.set(key, { label: ingredient, count: 0 });
            }
            counts.get(key).count += 1;
          }
        }
      }
    }

    return counts;
  }

  /**
   * Ouvre la modale
   */
  static open() {
    if (!this.modal) this.init();
    if (!this.modal) return;

    this.purchasedItems.clear();
    this.render();
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    this.modal.querySelector('.sl-close-btn')?.focus();
  }

  /**
   * Ferme la modale
   */
  static close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  /**
   * Bascule l'état acheté d'un item
   * @param {string} key - clé en minuscules de l'ingrédient
   */
  static toggleItem(key) {
    if (this.purchasedItems.has(key)) {
      this.purchasedItems.delete(key);
    } else {
      this.purchasedItems.add(key);
    }

    const item = this.modal?.querySelector(`[data-key="${key}"]`);
    if (item) {
      const isPurchased = this.purchasedItems.has(key);
      item.classList.toggle('purchased', isPurchased);
      item.setAttribute('aria-checked', String(isPurchased));
    }

    this.updateCounter();
  }

  /**
   * Met à jour le compteur et la barre de progression
   */
  static updateCounter() {
    const total = this.modal?.querySelectorAll('.sl-item').length || 0;
    const bought = this.purchasedItems.size;
    const counter = this.modal?.querySelector('.sl-counter');
    const progressFill = this.modal?.querySelector('#sl-progress');

    if (counter) {
      if (bought === 0) {
        counter.textContent = `${total} article${total > 1 ? 's' : ''}`;
      } else if (bought === total) {
        counter.textContent = `✓ Tous les articles achetés !`;
      } else {
        counter.textContent = `${bought} / ${total} acheté${bought > 1 ? 's' : ''}`;
      }
      counter.className = `sl-counter${bought === total && total > 0 ? ' sl-counter--done' : ''}`;
    }

    if (progressFill) {
      progressFill.style.width = total > 0 ? `${(bought / total) * 100}%` : '0%';
    }
  }

  /**
   * Remet à zéro les achats
   */
  static resetAll() {
    this.purchasedItems.clear();
    this.modal?.querySelectorAll('.sl-item').forEach(el => {
      el.classList.remove('purchased');
      el.setAttribute('aria-checked', 'false');
    });
    this.updateCounter();
  }

  /**
   * Génère et affiche la liste dans la modale
   */
  static render() {
    const listContainer = this.modal?.querySelector('.sl-list');
    const emptyState = this.modal?.querySelector('.sl-empty');
    if (!listContainer) return;

    const ingredients = this.aggregateIngredients();

    if (ingredients.size === 0) {
      listContainer.innerHTML = '';
      emptyState?.classList.remove('hidden');
      this.updateCounter();
      return;
    }

    emptyState?.classList.add('hidden');

    // Tri alphabétique (fr)
    const sorted = [...ingredients.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );

    listContainer.innerHTML = sorted.map(({ label, count }) => {
      const key = label.toLowerCase();
      const safeKey = key.replace(/"/g, '&quot;');
      const badgeHtml = count > 1
        ? `<span class="sl-item-badge">${count}<span class="sl-times">×</span></span>`
        : '';
      const checkSvg = `<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>`;

      return `<li
          class="sl-item"
          data-key="${safeKey}"
          role="checkbox"
          aria-checked="false"
          tabindex="0"
          onclick="window.shoppingListHandlers.toggleItem(this.dataset.key)"
          onkeydown="if(event.key==='Enter'||event.key===' '){window.shoppingListHandlers.toggleItem(this.dataset.key);event.preventDefault();}"
        >
          <span class="sl-item-check" aria-hidden="true">${checkSvg}</span>
          <span class="sl-item-label">${label}</span>
          ${badgeHtml}
        </li>`;
    }).join('');

    this.updateCounter();
  }
}