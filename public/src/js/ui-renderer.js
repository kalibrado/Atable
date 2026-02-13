// ========================================
// Rendu de l'interface utilisateur - Jours du mois
// ========================================

import { MEAL_TYPES, MEAL_EMOJIS } from './config.js';
import { MonthDaysUtils, StringUtils } from './utils.js';
import { WeeksManager } from './weeks-manager.js';

/**
 * Classe de gestion du rendu de l'interface basée sur les jours du mois
 */
export class UIRenderer {
    /**
     * Crée le HTML pour une section de repas (Midi ou Soir)
     * @param {number} day - Le jour du mois (1-31)
     * @param {string} mealType - Le type de repas ('midi' ou 'soir')
     * @param {Object} mealsData - Les données des repas
     * @returns {string} Le HTML de la section
     */
    static createMealSection(day, mealType, mealsData) {

        const emoji = MEAL_EMOJIS[mealType];
        const label = StringUtils.capitalize(mealType);
        const value = mealsData[mealType] || '';

        return `
            <div class="atable-section">
                <div class="atable-header">
                    <label class="atable-label" for="${day}-${mealType}">
                        <span>${emoji}</span>
                        <span>${label}</span>
                    </label>
                    <button 
                        class="generate-meal-btn" 
                        onclick="window.generatorHandlers.generateSingleMeal(${day}, '${mealType}')"
                        title="Générer un repas"
                        aria-label="Générer un repas pour ${label}"
                    >
                        🎲 Générer
                    </button>
                </div>
                <textarea 
                    class="atable-textarea" 
                    id="${day}-${mealType}"
                    data-day="${day}"
                    data-atable="${mealType}"
                    placeholder="Ex: Pâtes carbonara, salade verte..."
                    rows="4"
                >${value}</textarea>
            </div>
        `;
    }

    /**
     * Crée l'emoji de calendrier pour un jour du mois
     * @param {number} dayOfMonth - Le numéro du jour (1-31)
     * @returns {Object} Objet contenant le HTML et les infos du jour
     */
    static createCalendarEmoji(dayOfMonth) {
        const now = new Date();
        const month = now.toLocaleString('fr-FR', { month: 'short' });

        return {
            month,
            dayNumber: dayOfMonth,
            html: `
            <span class="calendar-emoji" aria-hidden="true">
                <span class="cal-month">${month}</span>
                <span class="cal-day">${dayOfMonth}</span>
            </span>
        `};
    }

    /**
     * Crée le HTML pour une carte de jour complète
     * @param {number} dayOfMonth - Le jour du mois (1-31)
     * @param {Object} mealsData - Les données des repas
     * @param {boolean} isLargeScreen - Si l'écran est large
     * @returns {string} Le HTML de la carte
     */
    static createDayCard(dayOfMonth, mealsData, isLargeScreen) {
        const { html } = this.createCalendarEmoji(dayOfMonth);
        const currentDay = MonthDaysUtils.getCurrentDayOfMonth();
        const isToday = dayOfMonth === String(currentDay);
        const dayName = MonthDaysUtils.getDayName(dayOfMonth);
        const dayNameCapitalized = StringUtils.capitalize(dayName);

        const collapsedClass = isLargeScreen ? '' : !isToday ? 'collapsed' : 'today';

        const todayBadge = isToday
            ? '<span class="today-badge">Aujourd\'hui</span>'
            : '';


        return `
            <div class="day-card ${collapsedClass}" data-day="${dayOfMonth}">
                <div class="day-header">
                    <div class="day-title">
                        <h2>${html} ${dayNameCapitalized} ${dayOfMonth}</h2>
                        ${todayBadge}
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="day-content">
                    ${this.createMealSection(dayOfMonth, MEAL_TYPES.MIDI, mealsData)}
                    ${this.createMealSection(dayOfMonth, MEAL_TYPES.SOIR, mealsData)}
                </div>
            </div>
        `;
    }

    /**
     * Rend les jours d'une semaine spécifique
     * @param {Object} mealsData - Les données des repas
     * @param {Array<number>} daysInWeek - Liste des jours à afficher
     */
    static renderDaysForWeek(mealsData, daysInWeek) {
        const container = document.getElementById('days-container');
        const currentDay = MonthDaysUtils.getCurrentDayOfMonth();

        // Vérifier si on est sur grand écran
        const isLargeScreen = window.innerWidth >= 768;

        const days = Object.keys(mealsData)
        const val = Object.values(mealsData)

        // Générer le HTML de toutes les cartes
        const cardsHTML = days
            .map(day => this.createDayCard(day, val[days.indexOf(day)], isLargeScreen))
            .join('');

        container.innerHTML = cardsHTML;

        // Scroll vers le jour actuel si dans cette semaine
        if (!isLargeScreen && daysInWeek.includes(currentDay)) {
            this.scrollToDay(currentDay);
        }

        // Ajouter l'événement de clic sur chaque carte
        this.attachCardClickEvents();
    }

    /**
     * Rend tous les jours du mois actuel
     * @param {Object} mealsData - Les données des repas
     */
    static renderAllDays(mealsData) {
        // Obtenir les jours de la semaine actuelle
        const daysInWeek = WeeksManager.getCurrentWeekDays();

        this.renderDaysForWeek(mealsData, daysInWeek);
    }

    /**
     * Scroll automatique vers un jour spécifique
     * @param {number} dayOfMonth - Le jour à afficher
     */
    static scrollToDay(dayOfMonth) {
        setTimeout(() => {
            const dayCard = document.querySelector(`.day-card[data-day="${dayOfMonth}"]`);
            if (dayCard) {
                dayCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
    }

    /**
     * Attache les événements de clic sur les cartes
     */
    static attachCardClickEvents() {
        const allDayCards = document.querySelectorAll('.day-card');
        allDayCards.forEach(card => {
            const header = card.querySelector('.day-header');
            header.addEventListener('click', () => {
                const wasOpen = !card.classList.contains('collapsed');
                // Fermer toutes les cartes
                if (window.innerWidth < 768) {
                    allDayCards.forEach(c => c.classList.add('collapsed'));
                }
                // Ouvrir la carte cliquée si elle était fermée
                if (!wasOpen) {
                    card.classList.remove('collapsed');
                }
            });
        });
    }

    /**
     * Affiche le nom de l'utilisateur dans le header
     * @param {string} userName - Le nom de l'utilisateur
     */
    static displayUserName(userName) {
        const nameUserSpan = document.getElementById('name-user');
        if (nameUserSpan && userName) {
            nameUserSpan.textContent = ` - ${userName}`;
        }
        const header = document.querySelector('#name-user');
        if (!header) return;
        const isMobile = window.innerWidth <= 600;
        if (!header.dataset.fullTitle) {
            header.dataset.fullTitle = header.textContent.trim();
        }
        header.textContent = isMobile
            ? header.dataset.fullTitle.split(' ').map(word => word.charAt(0)).join('.')
            : header.dataset.fullTitle;
    }

    /**
     * Affiche le mois actuel dans le header
     */
    static displayCurrentMonth() {
        const subtitleElement = document.querySelector('.subtitle');
        if (subtitleElement) {
            const monthName = MonthDaysUtils.getCurrentMonthName();
            subtitleElement.textContent = `Planifiez vos repas de ${monthName}`;
        }
    }
}