

const login = () => {

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleText = document.getElementById('toggleText');
  const toggleTextBtn = document.getElementById('toggleTextBtn');
  const errorMessage = document.getElementById('errorMessage');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  let isLoginMode = true;

  /**
   * Affiche un message d'erreur
  */
  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
  }

  /**
 * Masque le message d'erreur
  */
  function hideError() {
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
  }
  /**
 * Génère ou récupère un identifiant unique pour la machine
 * Utilise localStorage pour persister l'identifiant
 * @returns {string} L'identifiant unique de la machine
*/
  function getMachineId() {
    let machineId = localStorage.getItem('atable_machine_id');
    if (!machineId) {
      machineId = _generateUUID();
      localStorage.setItem('atable_machine_id', machineId);
    }
    return machineId;
  }
  /**
   * Génère un UUID v4
   * @private
   * @returns {string} Un UUID aléatoire
  */
  function _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Bascule entre formulaire de login et d'inscription
   */
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    hideError();

    if (isLoginMode) {
      loginForm.classList.remove('form-hidden');
      registerForm.classList.add('form-hidden');
      toggleText.textContent = 'Pas encore de compte?';
      toggleTextBtn.textContent = 'S\'inscrire';
    } else {
      loginForm.classList.add('form-hidden');
      registerForm.classList.remove('form-hidden');
      toggleText.textContent = 'Vous avez déjà un compte?';
      toggleTextBtn.textContent = 'Se connecter';
    }
  });

  /**
   * Gère la soumission du formulaire de connexion
  */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    loginBtn.disabled = true;
    loginBtn.textContent = 'Connexion...';

    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, machineId: getMachineId() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      // Redirection vers la page principale
      window.location.href = '/';
    } catch (error) {
      showError(error.message);
      loginBtn.disabled = false;
      loginBtn.textContent = 'Se connecter';
    }
  });

  /**
   * Gère la soumission du formulaire d'inscription
  */
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    // Validation
    if (password.length < 6) {
      showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'Inscription...';

    try {
      const response = await fetch('/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name, machineId: getMachineId() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur d\'inscription');
      }

      // Redirection vers la page principale
      window.location.href = '/';
    } catch (error) {
      showError(error.message);
      registerBtn.disabled = false;
      registerBtn.textContent = 'S\'inscrire';
    }
  });

  /**
   * Vérifie si l'utilisateur est déjà connecté
  */
  async function checkAuth() {
    try {
      const response = await fetch('/auth/me');
      if (response.ok) {
        // L'utilisateur est connecté, redirection
        window.location.href = '/';
      }
    } catch (error) {
      // L'utilisateur n'est pas connecté, on reste sur la page de login
    }
  }
  checkAuth();
}
// Vérifier l'authentification au chargement
/**
 * Point d'entrée : lance l'app quand le DOM est chargé
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    login()
  });
} else {
  login()
}