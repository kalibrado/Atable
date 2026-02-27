import { WeeksManager } from './weeks-manager.js';
import { UIManager } from './ui-handlers.js';
import { ResponseHandler } from './response-handler.js';

const API_URL = '/api/shopping-list';

export class ShoppingList {
  static purchasedItems = new Set();
  static modal = null;
  static _saving = false;

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

  static getCurrentDateTimestamp() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return today.getTime();
  }

  static getDayTimestamp(dayKey) {
    const match = dayKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;

    const [, year, month, day] = match;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.getTime();
  }

  static async loadFromServer() {
    try {
      const response = await fetch(API_URL);

      const result = await ResponseHandler.handle(response, {
        showMessage: false,

        onSuccess: (data) => {
          this.purchasedItems = new Set(data.purchasedItems || []);
          // console.log('✅ Liste de courses chargée');
        },

        onError: (error) => {
          // console.warn('❌ Impossible de charger la liste:', error.message);
        }
      });

      if (!result.success) {
        this.purchasedItems = new Set();
      }

    } catch (err) {
      // console.warn('Impossible de charger la liste de courses:', err);
      ResponseHandler.handleNetworkError(err, 'loadShoppingList');
    }
  }

  static async saveToServer() {
    if (this._saving) return;
    this._saving = true;

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchasedItems: [...this.purchasedItems] }),
      });

      await ResponseHandler.handle(response, {
        showMessage: false,

        onSuccess: () => {
          // console.log('✅ Liste de courses sauvegardée');
        },

        onError: (error) => {
          // console.warn('❌ Erreur sauvegarde:', error.message);
        }
      });

    } catch (err) {
      // console.warn('Impossible de sauvegarder la liste de courses:', err);
      ResponseHandler.handleNetworkError(err, 'saveShoppingList');
    } finally {
      this._saving = false;
    }
  }

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
    const currentTimestamp = this.getCurrentDateTimestamp();
    try {
      const allWeeksData = WeeksManager.getAllWeeksData();
      const currentWeekKey = `week${WeeksManager.getCurrentWeek()}`;

      for (const [weekKey, weekData] of Object.entries(allWeeksData)) {
        let weekNumber = parseInt(weekKey.replace('week', ''));
        if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > WeeksManager.getNumberOfWeeks()) {
          continue;
        }
        if (weekKey >= currentWeekKey) {

          for (const [dayKey, dayData] of Object.entries(weekData)) {
            if (!dayData || typeof dayData !== 'object') {
              continue;
            }

            if (!dayData.midi && !dayData.soir) {
              continue;
            }

            const date = new Date();
            const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${dayKey}`;
            const dayTimestamp = this.getDayTimestamp(dateString);
            if (dayTimestamp === null || dayTimestamp < currentTimestamp) {
              continue;
            }

            for (const meal of [dayData.midi, dayData.soir]) {
              const ingredients = this.parseMeal(meal);
              for (const ingredient of ingredients) {
                if (ingredient.length === 0) continue;

                const key = ingredient.toLowerCase();
                if (!counts.has(key)) {
                  counts.set(key, { label: ingredient, count: 0 });
                }
                counts.get(key).count += 1;
              }
            }
          }
        }
      }

      // console.log(`✅ ${counts.size} ingrédients trouvés`);
      return counts;

    } catch (error) {
      // console.error('❌ Erreur agrégation ingrédients:', error);
      return counts;
    }
  }

  static async open() {
    if (!this.modal) this.init();
    if (!this.modal) return;

    this.render();
    this.modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    this.modal.querySelector('.sl-close-btn')?.focus();

    await this.loadFromServer();
    this.render();
  }

  static close() {
    if (!this.modal) return;
    this.modal.classList.remove('show');
    document.body.style.overflow = '';
  }

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
    this.saveToServer();
  }

  static async resetAll() {
    this.purchasedItems.clear();
    this.modal?.querySelectorAll('.sl-item').forEach(el => {
      el.classList.remove('purchased');
      el.setAttribute('aria-checked', 'false');
    });
    this.updateCounter();

    try {
      const response = await fetch(API_URL, { method: 'DELETE' });

      await ResponseHandler.handle(response, {
        showMessage: true,

        onSuccess: () => {
          // console.log('✅ Liste réinitialisée');
        },

        onError: (error) => {
          // console.warn('❌ Erreur réinitialisation:', error.message);
        }
      });

    } catch (err) {
      // console.warn('Impossible de réinitialiser la liste sur le serveur:', err);
      ResponseHandler.handleNetworkError(err, 'resetShoppingList');
    }
  }

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

    this.purchasedItems.forEach(key => {
      const item = listContainer.querySelector(`[data-key="${key}"]`);
      if (item) {
        item.classList.add('purchased');
        item.setAttribute('aria-checked', 'true');
      } else {
        this.purchasedItems.delete(key);
      }
    });

    this.updateCounter();
  }
}