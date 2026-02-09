// ========================================
// Gestion de la page de login/inscription
// ========================================

const login = () => {

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const toggleBtn = document.getElementById('toggleBtn');
  const toggleText = document.getElementById('toggleText');
  const toggleTextBtn = document.getElementById('toggleTextBtn');
  const errorMessage = document.getElementById('errorMessage');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');

  const registerPassword = document.getElementById('registerPassword');
  const registerPasswordConfirm = document.getElementById('registerPasswordConfirm');
  const passwordMatch = document.getElementById('passwordMatch');

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
   */
  function _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Configure les boutons de toggle password
   */
  function setupPasswordToggles() {
    const toggleButtons = document.querySelectorAll('.toggle-password');

    toggleButtons.forEach(button => {
      button.addEventListener('click', function () {
        const targetId = this.getAttribute('data-target');
        const input = document.getElementById(targetId);

        if (input.type === 'password') {
          input.type = 'text';
          this.textContent = '🙈';
          this.setAttribute('aria-label', 'Masquer le mot de passe');
        } else {
          input.type = 'password';
          this.textContent = '👁️';
          this.setAttribute('aria-label', 'Afficher le mot de passe');
        }
      });
    });
  }

  /**
   * Vérifie si les mots de passe correspondent
   */
  function checkPasswordMatch() {
    const password = registerPassword.value;
    const confirm = registerPasswordConfirm.value;

    if (!confirm) {
      passwordMatch.textContent = '';
      passwordMatch.className = 'password-match';
      return true;
    }

    if (password === confirm) {
      passwordMatch.textContent = '✓ Les mots de passe correspondent';
      passwordMatch.className = 'password-match match';
      return true;
    } else {
      passwordMatch.textContent = '✗ Les mots de passe ne correspondent pas';
      passwordMatch.className = 'password-match no-match';
      return false;
    }
  }

  /**
   * Valide le mot de passe
   */
  function validatePassword(password) {
    if (password.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return null;
  }

  /**
   * Valide l'email
   */
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    return null;
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
   * Validation en temps réel des mots de passe
   */
  registerPassword.addEventListener('input', checkPasswordMatch);
  registerPasswordConfirm.addEventListener('input', checkPasswordMatch);

  /**
   * Gère la soumission du formulaire de connexion
   */
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    // Validation
    const emailError = validateEmail(email);
    if (emailError) {
      showError(emailError);
      return;
    }

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
      if (!response.ok || data?.error) {
        throw new Error(data.error || 'Erreur de connexion');
      } else {
        // Redirection vers la page principale
        window.location.reload()
      }
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

    const firstname = document.getElementById('registerFirstname').value.trim();
    const lastname = document.getElementById('registerLastname').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    // Validation firstname
    if (!firstname) {
      showError('Le prénom est requis');
      return;
    }

    // Validation lastname
    if (!lastname) {
      showError('Le nom est requis');
      return;
    }

    // Validation email
    const emailError = validateEmail(email);
    if (emailError) {
      showError(emailError);
      return;
    }

    // Validation mot de passe
    const passwordError = validatePassword(password);
    if (passwordError) {
      showError(passwordError);
      return;
    }

    // Vérification correspondance mots de passe
    if (password !== passwordConfirm) {
      showError('Les mots de passe ne correspondent pas');
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
        body: JSON.stringify({
          email,
          password,
          firstname,
          lastname,
          machineId: getMachineId()
        })
      });

      const data = await response.json();

      if (!response.ok || data?.error) {
        throw new Error(data.error || 'Erreur d\'inscription');
      } else {
        // Redirection vers la page principale
        window.location.reload()
      }
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

  // Initialisation
  setupPasswordToggles();
  checkAuth();
}

// Point d'entrée : lance l'app quand le DOM est chargé
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    login()
  });
} else {
  login()
}