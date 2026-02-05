// ========================================
// Générateur de clés VAPID
// Ce script génère une paire de clés VAPID (publique et privée) pour les notifications push.
// ========================================

const webPush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('Génération des clés VAPID...\n');

// Générer les clés VAPID
const vapidKeys = webPush.generateVAPIDKeys();

console.log('Clés VAPID générées avec succès !\n');
console.log('Copiez ces clés dans votre fichier .env :\n');
console.log('VAPID_PUBLIC_KEY=' + vapidKeys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + vapidKeys.privateKey);
console.log('\n');

// Créer ou mettre à jour le fichier .env
const envPath = path.join(__dirname, '.env');
let envContent = '';

try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  // Le fichier n'existe pas encore
}

// Vérifier si les clés VAPID existent déjà
if (envContent.includes('VAPID_PUBLIC_KEY')) {
  console.log('ATTENTION: Des clés VAPID existent déjà dans .env');
  console.log('   Les remplacer invalidera toutes les inscriptions aux notifications existantes.');
  console.log('   Pour créer le fichier .env avec les nouvelles clés, supprimez d\'abord l\'ancien.\n');
} else {
  // Ajouter les clés au fichier .env
  const newEnvContent = `
# Clés VAPID pour les notifications push
VAPID_PUBLIC_KEY=${vapidKeys.publicKey}
VAPID_PRIVATE_KEY=${vapidKeys.privateKey}
VAPID_SUBJECT=mailto:admin@atable.com

# Configuration serveur
PORT=3030
`;

  fs.writeFileSync(envPath, envContent + newEnvContent);
  console.log('Fichier .env créé avec les clés VAPID\n');
}

console.log('Prochaines étapes :');
console.log('   1. Vérifiez le fichier .env');
console.log('   2. Redémarrez le serveur (npm start)');
console.log('   3. Les utilisateurs pourront s\'abonner aux notifications\n');