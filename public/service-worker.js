// ========================================
// Service Worker pour Notifications Push
// ========================================

const CACHE_NAME = 'meal-planner-v1';
const CACHE_URLS = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/notifications.js'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installation...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Mise en cache des fichiers');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => self.skipWaiting())
    );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activation...');
    
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Suppression ancien cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interception des requêtes (stratégie Network First)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone la réponse
                const responseClone = response.clone();
                
                // Met en cache la nouvelle réponse
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                
                return response;
            })
            .catch(() => {
                // Si pas de réseau, utilise le cache
                return caches.match(event.request);
            })
    );
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
    console.log('Service Worker: Notification push reçue');
    
    const data = event.data ? event.data.json() : {};
    const title = data.title || '🍽️ Planificateur de Repas';
    const options = {
        body: data.body || 'Vérifiez vos repas du jour',
        icon: data.icon || '/icon-192.png',
        badge: '/icon-badge.png',
        tag: 'meal-reminder',
        requireInteraction: false,
        actions: [
            {
                action: 'open',
                title: 'Voir mes repas'
            },
            {
                action: 'close',
                title: 'Fermer'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Clic sur la notification
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Clic sur notification');
    
    event.notification.close();
    
    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Alarmes périodiques pour vérifier l'heure de notification
// Note: Les alarmes en Service Worker ont des limitations selon les navigateurs
self.addEventListener('message', (event) => {
    if (event.data.type === 'CHECK_NOTIFICATION_TIME') {
        checkAndSendNotification(event.data.config);
    }
});

/**
 * Vérifie et envoie une notification si nécessaire
 */
async function checkAndSendNotification(config) {
    const now = new Date();
    const { hour, minute, enabled, lastSent } = config;
    
    if (!enabled) return;
    
    // Vérifie si c'est l'heure
    if (now.getHours() !== hour || now.getMinutes() !== minute) {
        return;
    }
    
    // Vérifie si déjà envoyée aujourd'hui
    if (lastSent) {
        const lastSentDate = new Date(lastSent);
        if (lastSentDate.toDateString() === now.toDateString()) {
            return;
        }
    }
    
    // Récupère les données depuis l'API
    try {
        const response = await fetch('/api/meals');
        const mealsData = await response.json();
        
        // Détermine le jour actuel
        const daysMap = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
        const currentDay = daysMap[now.getDay()];
        const dayCapitalized = currentDay.charAt(0).toUpperCase() + currentDay.slice(1);
        
        const dayData = mealsData[currentDay] || { midi: '', soir: '' };
        const hasData = dayData.midi.trim() !== '' || dayData.soir.trim() !== '';
        
        let title, body;
        
        if (hasData) {
            title = `🍽️ Vos repas du ${dayCapitalized}`;
            const parts = [];
            
            if (dayData.midi.trim()) {
                const midiShort = dayData.midi.length > 50 ? dayData.midi.substring(0, 50) + '...' : dayData.midi;
                parts.push(`🌞 Midi: ${midiShort}`);
            }
            
            if (dayData.soir.trim()) {
                const soirShort = dayData.soir.length > 50 ? dayData.soir.substring(0, 50) + '...' : dayData.soir;
                parts.push(`🌙 Soir: ${soirShort}`);
            }
            
            body = parts.join('\n');
        } else {
            title = `⚠️ Aucun repas prévu pour ${dayCapitalized}`;
            body = 'Vous n\'avez pas encore défini vos repas pour aujourd\'hui.\nCliquez pour planifier vos repas !';
        }
        
        // Envoie la notification
        await self.registration.showNotification(title, {
            body: body,
            icon: '/icon-192.png',
            badge: '/icon-badge.png',
            tag: 'meal-reminder',
            requireInteraction: false,
            actions: [
                { action: 'open', title: 'Voir mes repas' },
                { action: 'close', title: 'Fermer' }
            ]
        });
        
        // Notifie le client que la notification a été envoyée
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'NOTIFICATION_SENT',
                timestamp: now.toISOString()
            });
        });
        
    } catch (error) {
        console.error('Erreur lors de l\'envoi de la notification:', error);
    }
}
