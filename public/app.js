// ========================================
// Configuration et constantes
// ========================================
const API_URL = '/api/meals';
const SAVE_DELAY = 1000; // Délai en ms avant sauvegarde automatique
const DAYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const DAY_EMOJIS = {
    'lundi': '📅',
    'mardi': '📅',
    'mercredi': '📅',
    'jeudi': '📅',
    'vendredi': '📅',
    'samedi': '🎉',
    'dimanche': '🎉'
};

// État global de l'application
let mealsData = {};
let saveTimeout = null;
let collapsedDays = new Set(); // Stocke les jours repliés

/**
 * Obtient le jour actuel en français
 * @returns {string} Le jour actuel (ex: 'lundi', 'mardi', etc.)
 */
function getCurrentDay() {
    const daysMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const today = new Date().getDay();
    return daysMap[today];
}

// ========================================
// Fonctions utilitaires
// ========================================

/**
 * Affiche un message de statut à l'utilisateur
 * @param {string} message - Le message à afficher
 * @param {string} type - Le type de message ('success' ou 'error')
 */
function showStatus(message, type = 'success') {
    const statusElement = document.getElementById('status-message');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type} show`;
    
    // Cache le message après 3 secondes
    setTimeout(() => {
        statusElement.classList.remove('show');
    }, 3000);
}

/**
 * Gère les erreurs réseau et API
 * @param {Error} error - L'erreur à traiter
 */
function handleError(error) {
    console.error('Erreur:', error);
    showStatus('Une erreur est survenue. Veuillez réessayer.', 'error');
}

// ========================================
// Communication avec l'API
// ========================================

/**
 * Charge les données depuis l'API
 */
async function loadMeals() {
    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        mealsData = await response.json();
        renderDays();
    } catch (error) {
        handleError(error);
    }
}

/**
 * Sauvegarde les données vers l'API
 */
async function saveMeals() {
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(mealsData)
        });
        
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        showStatus('✓ Sauvegardé', 'success');
    } catch (error) {
        handleError(error);
    }
}

/**
 * Planifie une sauvegarde automatique avec délai
 * Annule la sauvegarde précédente si l'utilisateur continue de taper
 */
function scheduleSave() {
    // Annule la sauvegarde précédente si elle existe
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }
    
    // Planifie une nouvelle sauvegarde
    saveTimeout = setTimeout(() => {
        saveMeals();
    }, SAVE_DELAY);
}

// ========================================
// Rendu de l'interface
// ========================================

/**
 * Crée le HTML pour une section de repas (Midi ou Soir)
 * @param {string} day - Le jour de la semaine
 * @param {string} meal - Le type de repas ('midi' ou 'soir')
 * @returns {string} Le HTML de la section
 */
function createMealSection(day, meal) {
    const emoji = meal === 'midi' ? '☀️' : '🌙';
    const label = meal.charAt(0).toUpperCase() + meal.slice(1);
    const value = mealsData[day]?.[meal] || '';
    
    return `
        <div class="meal-section">
            <label class="meal-label" for="${day}-${meal}">
                <span>${emoji}</span>
                <span>${label}</span>
            </label>
            <textarea 
                class="meal-textarea" 
                id="${day}-${meal}"
                data-day="${day}"
                data-meal="${meal}"
                placeholder="Ex: Pâtes carbonara, salade verte..."
                rows="4"
            >${value}</textarea>
        </div>
    `;
}

/**
 * Crée le HTML pour une carte de jour
 * @param {string} day - Le jour de la semaine
 * @returns {string} Le HTML de la carte
 */
function createDayCard(day) {
    const emoji = DAY_EMOJIS[day];
    const isCollapsed = collapsedDays.has(day);
    const collapsedClass = isCollapsed ? 'collapsed' : '';
    const currentDay = getCurrentDay();
    const isTodayClass = day === currentDay ? 'today' : '';
    const todayBadge = day === currentDay ? '<span class="today-badge">Aujourd\'hui</span>' : '';
    
    return `
        <div class="day-card ${collapsedClass} ${isTodayClass}" data-day="${day}">
            <div class="day-header" onclick="toggleDay('${day}')">
                <div class="day-title">
                    <h2>${emoji} ${day}</h2>
                    ${todayBadge}
                </div>
                <span class="toggle-icon">▼</span>
            </div>
            <div class="day-content">
                ${createMealSection(day, 'midi')}
                ${createMealSection(day, 'soir')}
            </div>
        </div>
    `;
}

/**
 * Rend tous les jours de la semaine
 */
function renderDays() {
    const container = document.getElementById('days-container');
    const currentDay = getCurrentDay();
    
    // Replier tous les jours sauf le jour actuel
    DAYS.forEach(day => {
        if (day !== currentDay) {
            collapsedDays.add(day);
        }
    });
    
    container.innerHTML = DAYS.map(day => createDayCard(day)).join('');
    
    // Attache les événements aux textareas
    attachEventListeners();
    
    // Scroll vers le jour actuel après un court délai
    setTimeout(() => {
        const currentDayCard = document.querySelector(`.day-card[data-day="${currentDay}"]`);
        if (currentDayCard) {
            currentDayCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 100);
}

/**
 * Toggle l'état replié/déplié d'un jour
 * @param {string} day - Le jour à toggle
 */
function toggleDay(day) {
    const dayCard = document.querySelector(`.day-card[data-day="${day}"]`);
    
    if (collapsedDays.has(day)) {
        collapsedDays.delete(day);
        dayCard.classList.remove('collapsed');
    } else {
        collapsedDays.add(day);
        dayCard.classList.add('collapsed');
    }
}

// Rend la fonction accessible globalement pour l'attribut onclick
window.toggleDay = toggleDay;

// ========================================
// Gestion des événements
// ========================================

/**
 * Gère les changements dans les textareas
 * @param {Event} event - L'événement de changement
 */
function handleTextareaChange(event) {
    const textarea = event.target;
    const day = textarea.dataset.day;
    const meal = textarea.dataset.meal;
    const value = textarea.value;
    
    // Met à jour les données en mémoire
    if (!mealsData[day]) {
        mealsData[day] = { midi: '', soir: '' };
    }
    mealsData[day][meal] = value;
    
    // Planifie la sauvegarde automatique
    scheduleSave();
}

/**
 * Attache les événements aux textareas
 */
function attachEventListeners() {
    const textareas = document.querySelectorAll('.meal-textarea');
    
    textareas.forEach(textarea => {
        // Événement input pour la sauvegarde en temps réel
        textarea.addEventListener('input', handleTextareaChange);
        
        // Événement focus pour l'effet visuel
        textarea.addEventListener('focus', (e) => {
            e.target.parentElement.style.transform = 'scale(1.005)';
        });
        
        textarea.addEventListener('blur', (e) => {
            e.target.parentElement.style.transform = 'scale(1)';
        });
    });
}

// ========================================
// Initialisation de l'application
// ========================================

/**
 * Initialise l'application au chargement de la page
 */
async function init() {
    console.log('🚀 Initialisation de l\'application...');
    
    // Charge les données initiales
    await loadMeals();
    
    // Initialise les notifications
    initializeNotifications();
    
    console.log('✅ Application prête');
}

// ========================================
// Gestion de la modal de paramètres
// ========================================

/**
 * Ouvre la modal de paramètres
 */
function openSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.add('show');
    updateSettingsUI();
}

/**
 * Ferme la modal de paramètres
 */
function closeSettings() {
    const modal = document.getElementById('settings-modal');
    modal.classList.remove('show');
}

/**
 * Met à jour l'interface des paramètres
 */
function updateSettingsUI() {
    // État du toggle
    const enableCheckbox = document.getElementById('enable-notifications');
    enableCheckbox.checked = window.notificationSystem.isEnabled();
    
    // Heure de notification
    const { hour, minute } = window.notificationSystem.getTime();
    const timeInput = document.getElementById('notification-time');
    timeInput.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    
    // Activer/désactiver l'input de temps
    const timeSetting = document.getElementById('time-setting');
    if (enableCheckbox.checked) {
        timeSetting.style.opacity = '1';
        timeInput.disabled = false;
    } else {
        timeSetting.style.opacity = '0.5';
        timeInput.disabled = true;
    }
    
    // Statut de la permission
    updatePermissionStatus();
}

/**
 * Met à jour l'affichage du statut de permission
 */
function updatePermissionStatus() {
    const statusDiv = document.getElementById('permission-status');
    const statusText = document.getElementById('permission-text');
    
    if (!('Notification' in window)) {
        statusDiv.className = 'permission-status denied';
        statusText.textContent = '❌ Votre navigateur ne supporte pas les notifications';
        return;
    }
    
    switch (Notification.permission) {
        case 'granted':
            statusDiv.className = 'permission-status granted';
            statusText.textContent = '✅ Notifications autorisées';
            break;
        case 'denied':
            statusDiv.className = 'permission-status denied';
            statusText.textContent = '❌ Notifications refusées. Autorisez-les dans les paramètres de votre navigateur.';
            break;
        default:
            statusDiv.className = 'permission-status default';
            statusText.textContent = '⚠️ Permission non accordée. Activez les notifications pour demander l\'autorisation.';
            break;
    }
}

/**
 * Active/désactive les notifications
 */
async function toggleNotifications() {
    const checkbox = document.getElementById('enable-notifications');
    const enabled = checkbox.checked;
    
    if (enabled) {
        // Demander la permission
        const granted = await window.notificationSystem.requestPermission();
        if (!granted) {
            checkbox.checked = false;
            alert('Vous devez autoriser les notifications pour activer cette fonctionnalité.');
            return;
        }
        window.notificationSystem.setEnabled(true);
    } else {
        window.notificationSystem.setEnabled(false);
    }
    
    updateSettingsUI();
}

/**
 * Met à jour l'heure de notification
 */
function updateNotificationTime() {
    const timeInput = document.getElementById('notification-time');
    const [hour, minute] = timeInput.value.split(':').map(Number);
    window.notificationSystem.saveTime(hour, minute);
    showStatus('⏰ Heure de notification mise à jour', 'success');
}

/**
 * Envoie une notification de test
 */
function testNotification() {
    window.notificationSystem.sendTest();
}

/**
 * Initialise le système de notifications
 */
function initializeNotifications() {
    // Démarre le vérificateur de notifications
    window.notificationSystem.start();
    
    // Met à jour l'UI si la modal est ouverte
    const modal = document.getElementById('settings-modal');
    if (modal.classList.contains('show')) {
        updateSettingsUI();
    }
}

// Rend les fonctions accessibles globalement pour les onclick
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.toggleNotifications = toggleNotifications;
window.updateNotificationTime = updateNotificationTime;
window.testNotification = testNotification;

// Fermer la modal en cliquant en dehors
window.addEventListener('click', (event) => {
    const modal = document.getElementById('settings-modal');
    if (event.target === modal) {
        closeSettings();
    }
});

// Lance l'initialisation quand le DOM est chargé
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// ========================================
// Gestion du déchargement de la page
// ========================================

/**
 * Sauvegarde les données avant de quitter la page
 */
window.addEventListener('beforeunload', (event) => {
    if (saveTimeout) {
        // Sauvegarde synchrone si des modifications sont en attente
        clearTimeout(saveTimeout);
        
        // Note: navigator.sendBeacon serait idéal ici, mais nécessite une API POST
        // Pour l'instant, on laisse la sauvegarde automatique gérer cela
    }
});
