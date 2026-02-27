import { ResponseHandler } from './response-handler.js';
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

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
  }

  function hideError() {
    errorMessage.classList.remove('show');
    errorMessage.textContent = '';
  }

  function getMachineId() {
    let machineId = localStorage.getItem('atable_machine_id');
    if (!machineId) {
      machineId = _generateUUID();
      localStorage.setItem('atable_machine_id', machineId);
    }
    return machineId;
  }

  function _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

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

  function validatePassword(password) {
    if (password.length < 6) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return null;
  }

  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Format d\'email invalide';
    }
    return null;
  }

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

  registerPassword.addEventListener('input', checkPasswordMatch);
  registerPasswordConfirm.addEventListener('input', checkPasswordMatch);

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

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

      await ResponseHandler.handle(response, {
        showMessage: true,

        onSuccess: (data) => {
          console.log('✅ Connexion réussie');
          window.location.href = '/';
        },

        onError: (error) => {
          if (error.status === 401) {
            showError('❌ Email ou mot de passe incorrect');
          } else if (error.error === 'VALIDATION_ERROR') {
            showError(`❌ ${error.message}`);
          } else {
            showError(error.message || '❌ Erreur de connexion');
          }
          loginBtn.disabled = false;
          loginBtn.textContent = 'Se connecter';
        }
      });

    } catch (error) {
      ResponseHandler.handleNetworkError(error, 'login');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Se connecter';
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideError();

    const firstname = document.getElementById('registerFirstname').value.trim();
    const lastname = document.getElementById('registerLastname').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value;

    if (!firstname) {
      showError('Le prénom est requis');
      return;
    }

    if (!lastname) {
      showError('Le nom est requis');
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      showError(emailError);
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      showError(passwordError);
      return;
    }

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

      await ResponseHandler.handle(response, {
        showMessage: true,

        onSuccess: (data) => {
          console.log('✅ Inscription réussie');
          window.location.href = '/';
        },

        onError: (error) => {
          if (error.error === 'CONFLICT') {
            showError(`❌ Cet email est déjà utilisé`);
          } else if (error.error === 'VALIDATION_ERROR') {
            showError(`❌ ${error.message}`);
          } else {
            showError(error.message || '❌ Erreur d\'inscription');
          }
          registerBtn.disabled = false;
          registerBtn.textContent = 'S\'inscrire';
        }
      });

    } catch (error) {
      ResponseHandler.handleNetworkError(error, 'register');
      registerBtn.disabled = false;
      registerBtn.textContent = 'S\'inscrire';
    }
  });

  async function checkAuth() {
    try {
      const response = await fetch('/auth/me');

      await ResponseHandler.handle(response, {
        showMessage: false,

        onSuccess: () => {
          window.location.href = '/';
        },

        onError: (error) => {
          if (error.status === 401) {
            console.log('Redirection vers login');
          }
        }
      });
    } catch (error) {
      console.log('Utilisateur non connecté');
    }
  }

  setupPasswordToggles();
  checkAuth();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    login();
  });
} else {
  login();
}