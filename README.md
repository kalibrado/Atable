# 🍽️ Planificateur de Repas Hebdomadaires

Application web moderne et responsive pour planifier vos repas de la semaine.

## 📋 Fonctionnalités

- ✅ Planification des repas pour chaque jour (Lundi à Dimanche)
- ✅ Deux sections par jour : Midi et Soir
- ✅ Sauvegarde automatique des modifications
- ✅ Interface mobile-first, responsive
- ✅ Possibilité de replier/déplier chaque jour
- ✅ Design moderne et épuré
- ✅ Animations légères au focus
- ✅ Gestion des erreurs API

## 🏗️ Architecture du Projet

```
atable-planner/
│
├── server.js                 # Serveur Node.js avec Express
├── package.json              # Configuration npm
│
├── data/
│   └── data.json            # Fichier de stockage des données
│
└── public/                   # Frontend
    ├── index.html           # Structure HTML
    ├── style.css            # Styles CSS responsive
    └── app.js               # Logique JavaScript
```

## 🛠️ Technologies Utilisées

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web minimaliste
- **fs/promises** - Gestion asynchrone des fichiers

### Frontend
- **HTML5** - Structure sémantique
- **CSS3** - Styles modernes (Flexbox, Grid, Variables CSS)
- **JavaScript Vanilla** - Aucune dépendance externe

## 🚀 Installation et Lancement

### Prérequis
- Node.js (version 14 ou supérieure)
- npm (inclus avec Node.js)

### Étapes

1. **Naviguer dans le dossier du projet**
   ```bash
   cd atable-planner
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Démarrer le serveur**
   ```bash
   npm start
   ```
   ou
   ```bash
   node server.js
   ```

4. **Accéder à l'application**
   
   Ouvrir votre navigateur et aller à : `http://localhost:3000`

## 📡 API REST

### GET /api/atable
Récupère toutes les données des repas

**Réponse:**
```json
{
  "lundi": { "midi": "...", "soir": "..." },
  "mardi": { "midi": "...", "soir": "..." },
  ...
}
```

### PUT /api/atable
Met à jour les données des repas

**Body:**
```json
{
  "lundi": { "midi": "Pâtes", "soir": "Poulet rôti" },
  ...
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Données sauvegardées avec succès"
}
```

## 🎨 Caractéristiques UI/UX

### Mobile-First
- Optimisé pour les écrans de smartphones
- Zones tactiles larges et confortables
- Navigation intuitive

### Responsive
- **Mobile** (< 768px) : Vue en colonne unique
- **Tablette** (≥ 768px) : Midi et Soir côte à côte
- **Desktop** (≥ 1024px) : Espacement optimisé

### Design
- Palette de couleurs moderne
- Animations fluides et subtiles
- Ombres et dégradés élégants
- Feedback visuel immédiat

## ⚙️ Fonctionnement

1. **Chargement initial** : L'application charge les données depuis `data.json`
2. **Modification** : Chaque frappe dans un textarea met à jour l'état en mémoire
3. **Sauvegarde automatique** : Après 1 seconde d'inactivité, les données sont envoyées à l'API
4. **Persistance** : L'API enregistre les modifications dans `data.json`

## 🔧 Configuration

### Modifier le port du serveur
Dans `server.js`, ligne 7 :
```javascript
const PORT = 3000; // Changer ici
```

### Modifier le délai de sauvegarde
Dans `public/app.js`, ligne 5 :
```javascript
const SAVE_DELAY = 1000; // En millisecondes
```

## 📱 Compatibilité

- ✅ Chrome/Edge (dernières versions)
- ✅ Firefox (dernières versions)
- ✅ Safari (iOS et macOS)
- ✅ Navigateurs mobiles modernes

## 🐛 Gestion des Erreurs

- Validation des données côté serveur
- Messages d'erreur clairs pour l'utilisateur
- Logs serveur pour le débogage
- Gestion des fichiers manquants (création automatique)

## 💡 Améliorations Possibles

- [ ] Authentification utilisateur
- [ ] Plusieurs plannings (familles, régimes)
- [ ] Export PDF ou impression
- [ ] Suggestions de recettes
- [ ] Liste de courses automatique
- [ ] Mode sombre
- [ ] PWA (Progressive Web App)
- [ ] Synchronisation multi-appareils

## 📄 Licence

Ce projet est libre d'utilisation à des fins éducatives et personnelles.

## 👤 Auteur

Développé avec ❤️ pour une meilleure organisation des repas.

---

**Bon appétit et bonne planification ! 🍴**
