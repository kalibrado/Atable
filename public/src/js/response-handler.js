/**
 * @fileoverview Gestionnaire unifié des réponses serveur côté client
 * @module response-handler
 * 
 * Ce module traite les réponses du serveur de manière cohérente
 * et affiche les messages de manière structurée à l'utilisateur.
 * 
 */

/**
 * Classe de traitement des réponses côté client
 * Traite les réponses serveur et affiche les messages de manière cohérente
 */
export class ResponseHandler {
  /**
   * Traite une réponse fetch et retourne les données + le message
   * 
   * @param {Response} response - Réponse fetch
   * @param {Object} options - Options de traitement
   * @param {boolean} [options.showMessage=true] - Afficher le message utilisateur
   * @param {Function} [options.onSuccess] - Callback de succès
   * @param {Function} [options.onError] - Callback d'erreur
   * @returns {Promise<Object>} { success, data, message, error, status }
   * 
   * @example
   * const response = await fetch('/api/users');
   * const result = await ResponseHandler.handle(response, {
   *   showMessage: true,
   *   onSuccess: (data) => console.log('Succès:', data),
   *   onError: (error) => console.error('Erreur:', error)
   * });
   */
  static async handle(response, options = {}) {
    const {
      showMessage = true,
      onSuccess = null,
      onError = null
    } = options;

    try {
      const data = await response.json();

      if (response.ok && data.success) {
        // Succès
        if (showMessage && data.message) {
          this.showMessage(data.message, 'success');
        }
        
        if (onSuccess) {
          onSuccess(data.data || data);
        }

        return {
          success: true,
          data: data.data || data,
          message: data.message
        };
      } else {
        // Erreur
        const message = data.message || this.getDefaultErrorMessage(response.status);
        
        if (showMessage) {
          this.showMessage(message, 'error');
        }

        if (onError) {
          onError({ 
            error: data.error, 
            message, 
            status: response.status,
            field: data.field // Pour les erreurs de validation
          });
        }

        return {
          success: false,
          error: data.error,
          message,
          status: response.status,
          field: data.field
        };
      }
    } catch (error) {
      // Erreur de parsing JSON
      const message = '❌ Erreur de communication avec le serveur';
      
      if (showMessage) {
        this.showMessage(message, 'error');
      }

      return {
        success: false,
        error: 'NETWORK_ERROR',
        message,
        originalError: error
      };
    }
  }

  /**
   * Affiche un message à l'utilisateur via UIManager ou élément custom
   * 
   * @param {string} message - Le message à afficher
   * @param {string} [type='info'] - Type : 'success', 'error', 'warning', 'info'
   * @param {number} [duration=3000] - Durée d'affichage en ms (0 = permanent)
   * 
   * @example
   * ResponseHandler.showMessage('✅ Sauvegarde réussie', 'success', 2000);
   * ResponseHandler.showMessage('⚠️ Attention', 'warning', 3000);
   * ResponseHandler.showMessage('Permanent', 'info', 0);
   */
  static showMessage(message, type = 'info', duration = 3000) {
    // Priorité 1 : Utiliser UIManager s'il existe
    if (window.UIManager && window.UIManager.showStatus) {
      const typeMap = {
        'success': 'success',
        'error': 'error',
        'warning': 'warning',
        'info': 'success'
      };
      window.UIManager.showStatus(message, typeMap[type] || 'success');
      return;
    }

    // Priorité 2 : Chercher l'élément status-message HTML
    const statusElement = document.getElementById('status-message');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type} show`;
      
      if (duration > 0) {
        setTimeout(() => {
          statusElement.classList.remove('show');
        }, duration);
      }
      return;
    }

    // Fallback : Log dans la console
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  /**
   * Retourne le message d'erreur par défaut selon le code HTTP
   * 
   * @param {number} statusCode - Code HTTP
   * @returns {string} Message d'erreur approprié
   * 
   * @private
   */
  static getDefaultErrorMessage(statusCode) {
    const messages = {
      400: '❌ Requête invalide. Veuillez vérifier vos données.',
      401: '🔐 Vous devez être connecté pour accéder à cette ressource.',
      403: '⛔ Vous n\'avez pas les permissions nécessaires.',
      404: '🔍 La ressource demandée n\'a pas été trouvée.',
      409: '⚠️ Un conflit s\'est produit (ressource existe déjà).',
      429: '⏱️ Trop de requêtes. Veuillez réessayer dans quelques instants.',
      500: '❌ Erreur serveur. Veuillez réessayer plus tard.',
      503: '⚠️ Le serveur est actuellement indisponible. Veuillez réessayer plus tard.'
    };
    
    return messages[statusCode] || '❌ Une erreur est survenue. Veuillez réessayer.';
  }

  /**
   * Traite une erreur réseau
   * 
   * @param {Error} error - L'erreur
   * @param {string} [context='Network Request'] - Contexte (pour le logging)
   * @returns {Object} Objet d'erreur structuré
   * 
   * @example
   * try {
   *   const response = await fetch('/api/data');
   * } catch (error) {
   *   const result = ResponseHandler.handleNetworkError(error, 'loadData');
   *   if (result.offline) {
   *     // Gérer mode hors ligne
   *   }
   * }
   */
  static handleNetworkError(error, context = 'Network Request') {
    const isOffline = !navigator.onLine;
    const message = isOffline 
      ? '📡 Vous êtes hors ligne. Vérifiez votre connexion internet.'
      : '❌ Erreur de communication avec le serveur. Vérifiez votre connexion.';

    this.showMessage(message, 'error', 4000);
    
    console.error(`[${context}] Network error:`, error);

    return {
      success: false,
      error: 'NETWORK_ERROR',
      message,
      offline: isOffline,
      originalError: error
    };
  }

  /**
   * Traite spécifiquement une erreur de validation de formulaire
   * 
   * @param {Object} errorData - Données d'erreur { field, message }
   * @param {string} formSelector - Sélecteur CSS du formulaire
   * 
   * @example
   * const result = await ResponseHandler.handle(response);
   * if (result.error === 'VALIDATION_ERROR') {
   *   ResponseHandler.handleValidationError(result, '#myForm');
   * }
   */
  static handleValidationError(errorData, formSelector = null) {
    const { field, message } = errorData;

    // Afficher le message
    this.showMessage(message, 'warning', 3000);

    // Mettre en évidence le champ si le formulaire est fourni
    if (formSelector && field) {
      const form = document.querySelector(formSelector);
      if (form) {
        const input = form.querySelector(`[name="${field}"], #${field}`);
        if (input) {
          input.classList.add('error');
          input.focus();
          
          // Retirer la classe après correction
          input.addEventListener('input', () => {
            input.classList.remove('error');
          }, { once: true });
        }
      }
    }
  }

  /**
   * Gère les erreurs d'authentification (401)
   * Redirige généralement vers la page de login
   * 
   * @param {Object} options - Options
   * @param {boolean} [options.redirect=true] - Rediriger vers /login
   * @param {Function} [options.onUnauth] - Callback personnalisé
   */
  static handleUnauthorized(options = {}) {
    const {
      redirect = true,
      onUnauth = null
    } = options;

    const message = '🔐 Votre session a expiré. Veuillez vous reconnecter.';
    this.showMessage(message, 'error', 3000);

    if (onUnauth) {
      onUnauth();
    }

    if (redirect) {
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    }
  }

  /**
   * Gère les erreurs de permission (403)
   * 
   * @param {Function} [callback] - Callback personnalisé
   */
  static handleForbidden(callback = null) {
    this.showMessage('⛔ Vous n\'avez pas les permissions nécessaires.', 'error', 3000);
    
    if (callback) {
      callback();
    }
  }

  /**
   * Gère les rate limits (429)
   * 
   * @param {number} [retryAfter=60] - Secondes avant nouvelle tentative
   */
  static handleRateLimit(retryAfter = 60) {
    const message = `⏱️ Trop de requêtes. Réessayez dans ${retryAfter} secondes.`;
    this.showMessage(message, 'warning', retryAfter * 1000);
  }

  /**
   * Utilitaire pour créer une requête fetch structurée avec gestion d'erreur
   * 
   * @param {string} url - URL
   * @param {Object} options - Options fetch
   * @param {Object} [handlerOptions] - Options ResponseHandler
   * @returns {Promise<Object>} Résultat du traitement
   * 
   * @example
   * const result = await ResponseHandler.fetchWithHandler(
   *   '/api/user/profile',
   *   { method: 'GET' },
   *   { showMessage: true }
   * );
   */
  static async fetchWithHandler(url, options = {}, handlerOptions = {}) {
    try {
      const response = await fetch(url, options);
      return await this.handle(response, handlerOptions);
    } catch (error) {
      return this.handleNetworkError(error, `fetch: ${url}`);
    }
  }

  /**
   * Récupère le message d'erreur spécifique ou par défaut
   * 
   * @param {Object} result - Résultat de ResponseHandler.handle()
   * @returns {string} Message approprié
   */
  static getErrorMessage(result) {
    if (result.message) {
      return result.message;
    }

    if (result.error === 'VALIDATION_ERROR') {
      return `Erreur de validation: ${result.field}`;
    }

    return this.getDefaultErrorMessage(result.status || 500);
  }
}

