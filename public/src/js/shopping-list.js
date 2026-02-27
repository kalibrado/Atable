/**
 * @fileoverview Gestion de la liste de courses — synchronisée avec le serveur
 * @module shopping-list
 */

import { WeeksManager } from './weeks-manager.js';
import { UIManager } from './ui-handlers.js';

const API_URL = '/api/shopping-list';

/**
 * Classe de gestion de la liste de courses
 */
export class ShoppingList {
  /** @type {Set<string>} Items cochés — miroir en mémoire de l'état serveur */
  static purchasedItems = new Set();

  /** @type {HTMLElement|null} */
  static modal = null;

  /** @type {boolean} Évite les sauvegardes concurrentes */
  static _saving = false;

  // ─── Initialisation ────────────────────────────────────────────

  static init() {
    this.modal = document.getElementById('shopping-list-modal');
    if (!this.modal) return;

    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('show')) {
        this.close();
      }
    });
  }

  // ─── API serveur ───────────────────────────────────────────────

  /**
   * Charge les items cochés depuis le serveur
   * @returns {Promise<void>}
   */
  static async loadFromServer() {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) return;
      const { purchasedItems } = await res.json();
      this.purchasedItems = new Set(purchasedItems || []);
    } catch (err) {
      console.warn('Impossible de charger la liste de courses depuis le serveur:', err);
    }
  }

  /**
   * Sauvegarde l'état actuel sur le serveur (debounce intégré)
   * @returns {Promise<void>}
   */
  static async saveToServer() {
    if (this._saving) return;
    this._saving = true;
    try {
      await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchasedItems: [...this.purchasedItems] }),
      });
    } catch (err) {
      console.warn('Impossible de sauvegarder la liste de courses:', err);
    } finally {
      this._saving = false;
    }
  }

  // ─── Parsing / agrégation ──────────────────────────────────────

  static parseMeal(meal) {
    if (!meal || typeof meal !== 'string' || meal.trim() === '') return [];
    return meal
      .replace(/\s+et\s+/gi, ',')
      .replace(/\s+avec\s+/gi, ',')
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  static aggregateIngredients() {
    const counts = new Map();

    const allWeeksData = WeeksManager.getAllWeeksData();
    const currentWeekData = UIManager.getState().mealsData;
    const currentWeekKey = `week${WeeksManager.getCurrentWeek()}`;
    if (currentWeekData) allWeeksData[currentWeekKey] = currentWeekData;

    for (const weekData of Object.values(allWeeksData)) {
      if (!weekData) continue;
      for (const dayData of Object.values(weekData)) {
        if (!dayData) continue;
        for (const meal of [dayData.midi, dayData.soir].filter(Boolean)) {
          for (const ingredient of this.parseMeal(meal)) {
            const key = ingredient.toLowerCase();
            if (!counts.has(key)) counts.set(key, { label: ingredient, count: 0 });
            counts.get(key).count += 1;
          }
        }
      }
    }

    return counts;
  }

  // ─── Ouverture / fermeture ─────────────────────────────────────

  /**
   * Ouvre la modale et charge l'état depuis le serveur
   */
  static async open() {
    if (!this.modal) this.init();
    if (!this.modal) return;

    // Afficher immédiatement avec l'état mémoire déjà connu
    this.render();
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    this.modal.querySelector('.sl-close-btn')?.focus();

    // Puis synchroniser depuis le serveur et mettre à jour si nécessaire
    await this.loadFromServer();
    this.render();
  }

  static close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
  }

  // ─── Actions ──────────────────────────────────────────────────

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
    this.saveToServer(); // non-bloquant
  }

  static async resetAll() {
    this.purchasedItems.clear();
    this.modal?.querySelectorAll('.sl-item').forEach(el => {
      el.classList.remove('purchased');
      el.setAttribute('aria-checked', 'false');
    });
    this.updateCounter();

    // Appel DELETE pour réinitialiser côté serveur
    try {
      await fetch(API_URL, { method: 'DELETE' });
    } catch (err) {
      console.warn('Impossible de réinitialiser la liste sur le serveur:', err);
    }
  }

  // ─── Rendu ────────────────────────────────────────────────────

  static updateCounter() {
    const total = this.modal?.querySelectorAll('.sl-item').length || 0;
    const bought = this.purchasedItems.size;
    const counter = this.modal?.querySelector('.sl-counter');
    const progressFill = this.modal?.querySelector('#sl-progress');

    if (counter) {
      if (bought === 0) {
        counter.textContent = `${total} article${total > 1 ? 's' : ''}`;
      } else if (bought === total && total > 0) {
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

    const sorted = [...ingredients.values()].sort((a, b) =>
      a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })
    );

    const checkSvg = `<svg viewBox="0 0 12 10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5l3.5 3.5L11 1" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    listContainer.innerHTML = sorted.map(({ label, count }) => {
      const key = label.toLowerCase();
      const safeKey = key.replace(/"/g, '&quot;');
      const badgeHtml = count > 1
        ? `<span class="sl-item-badge">${count}<span class="sl-times">×</span></span>`
        : '';

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

    // Restaurer l'état coché depuis purchasedItems en mémoire
    this.purchasedItems.forEach(key => {
      const item = listContainer.querySelector(`[data-key="${key}"]`);
      if (item) {
        item.classList.add('purchased');
        item.setAttribute('aria-checked', 'true');
      } else {
        // L'ingrédient n'existe plus dans les repas → on le retire
        this.purchasedItems.delete(key);
      }
    });

    this.updateCounter();
  }
}