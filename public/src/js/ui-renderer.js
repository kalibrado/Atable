// ========================================
// Rendu de l'interface utilisateur
// ========================================

import { DAYS, MEAL_TYPES, MEAL_EMOJIS } from './config.js';
import { DateUtils } from './utils.js';
import { WeeksManager } from './weeks-manager.js';

/**
 * Classe de gestion du rendu de l'interface
 * Responsable de la génération du HTML et de l'affichage
 */
export class UIRenderer {
    /**
     * Crée le HTML pour une section de repas (Midi ou Soir)
     * @param {string} day - Le jour de la semaine (ex: 'lundi')
     * @param {string} mealType - Le type de repas ('midi' ou 'soir')
     * @param {Object} mealsData - Les données des repas
     * @returns {string} Le HTML de la section
     */
    static createMealSection(day, mealType, mealsData) {
        const emoji = MEAL_EMOJIS[mealType];
        const label = mealType.charAt(0).toUpperCase() + mealType.slice(1);
        const value = mealsData[day]?.[mealType] || '';

        return `
            <div class="atable-section">
                <div class="atable-header">
                    <label class="atable-label" for="${day}-${mealType}">
                        <span>${emoji}</span>
                        <span>${label}</span>
                    </label>
                    <button 
                        class="generate-meal-btn" 
                        onclick="window.generatorHandlers.generateSingleMeal('${day}', '${mealType}')"
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
     * Crée l'emoji de calendrier pour un jour
     * Affiche le numéro du jour et le mois abrégé
     * @param {string} dayName - Le nom du jour (ex: 'lundi')
     * @returns {string} Le HTML de l'emoji calendrier
     */
    static createCalendarEmoji(dayName) {
        // Calculer l'offset de semaine
        const currentWeek = WeeksManager.getCurrentWeek();
        const weekOffset = currentWeek - 1;

        // Utiliser getDateForDayInWeek au lieu de getDateForDay
        const date = DateUtils.getDateForDayInWeek(dayName, weekOffset);

        const dayNumber = date.getDate();
        const month = date.toLocaleString('fr-FR', { month: 'short' });

        return {
            month,
            dayNumber,
            html: `
            <span class="calendar-emoji" aria-hidden="true">
                <span class="cal-month">${month}</span>
                <span class="cal-day">${dayNumber}</span>
            </span>
        `};
    }

    /**
     * Crée le HTML pour une carte de jour complète
     * @param {string} day - Le jour de la semaine
     * @param {Object} mealsData - Les données des repas
     * @param {string} currentDay - Le jour actuel
     * @returns {string} Le HTML de la carte
    */
    static createDayCard(day, mealsData, isLargeScreen) {
        const { html, dayNumber, month } = this.createCalendarEmoji(day);
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = today.toLocaleString('fr-FR', { month: 'short' });
        const isToday = String(dayNumber) === dd && String(month) === mm
        const collapsedClass = isLargeScreen ? '' : !isToday ? 'collapsed' : 'today';

        const todayBadge = isToday
            ? '<span class="today-badge">Aujourd\'hui</span>'
            : '';

        return `
            <div class="day-card ${collapsedClass}" data-day="${day}">
                <div class="day-header">
                    <div class="day-title">
                        <h2>${html} ${day}</h2>
                        ${todayBadge}
                    </div>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="day-content">
                    ${this.createMealSection(day, MEAL_TYPES.MIDI, mealsData)}
                    ${this.createMealSection(day, MEAL_TYPES.SOIR, mealsData)}
                </div>
            </div>
        `;
    }

    /**
     * Rend tous les jours de la semaine dans le conteneur
     * @param {Object} mealsData - Les données des repas
     */
    static renderAllDays(mealsData) {
        const container = document.getElementById('days-container');
        const currentDay = DateUtils.getCurrentDay();
        // Vérifier si on est sur grand écran
        const isLargeScreen = window.innerWidth >= 768;
        // Générer le HTML de toutes les cartes
        const cardsHTML = DAYS
            .map(day => this.createDayCard(day, mealsData, isLargeScreen))
            .join('');

        container.innerHTML = cardsHTML;

        // Scroll vers le jour actuel après un court délai (seulement sur mobile et si semaine actuelle)
        if (!isLargeScreen) {
            this.scrollToCurrentDay(currentDay);
        }

        // Écouter le redimensionnement de la fenêtre
        window.addEventListener('resize', () => {
            const wasLargeScreen = isLargeScreen;
            const nowLargeScreen = window.innerWidth >= 768;
            // Si on change de mode, re-render
            if (wasLargeScreen !== nowLargeScreen) {
                this.renderAllDays(mealsData);
            }
        });
        // Ajouter l'événement de clic sur chaque carte
        const allDayCards = document.querySelectorAll('.day-card');
        allDayCards.forEach(card => {
            card.addEventListener('click', () => {
            // Retirer 'collapsed' de toutes les cartes
            allDayCards.forEach(c => c.classList.add('collapsed'));
            // Ajouter 'today' ou retirer 'collapsed' de la carte cliquée
            card.classList.remove('collapsed');
            });
        });
        
    }

    /**
     * Scroll automatique vers le jour actuel
     * @param {string} currentDay - Le jour actuel
     */
    static scrollToCurrentDay(currentDay) {
        setTimeout(() => {
            const currentDayCard = document.querySelector(`.day-card[data-day="${currentDay}"]`);
            if (currentDayCard) {
                currentDayCard.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }
        }, 100);
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
    }
}