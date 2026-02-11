export class UserManager {
  static createModal() {
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content" style="width:600px;">
        <div class="modal-header">
          <h2 id="modal-title"></h2>
        </div>
        <form id="modal-form">
            <div class="modal-body " style="height: 80%; display:flex;">
                <input type="text" class="add-item-input" id="modal-input" placeholder="" />
            </div>
            <div class="modal-footer">
              <div class="settings-group">
                <div class="setting-group">
                  <button type="submit" class="btn-danger">Confirmer</button>
                </div>
                <div class="setting-group">
                  <button type="button" id="modal-btn-cancel" class="btn-primary">Annuler</button>
                </div>
              </div>
          </form>
        </div>
      </div>
    `;
    modal.style.zIndex = "110"

    document.body.appendChild(modal);
    return modal;
  }

  static showModal(title, inputPlaceholder, onConfirm) {
    const modal = UserManager.createModal()
    const modalTitle = document.getElementById('modal-title')
    const input = document.getElementById('modal-input')
    const form = document.getElementById('modal-form');

    modalTitle.textContent = title;
    input.placeholder = inputPlaceholder;


    form.onsubmit = (e) => {
      e.preventDefault();
      const value = document.getElementById('modal-input').value;
      onConfirm(value);
    };

    document.querySelector('#modal-btn-cancel').onclick = () => {
      modal.remove();
    };
  }

  static changePassword(userId) {
    UserManager.showModal('Changer le mot de passe', 'Nouveau mot de passe', (newPassword) => {
      if (!newPassword || newPassword.length < 8) {
        alert('Le mot de passe doit contenir au moins 8 caractères');
        return;
      }
      fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword })
      }).then(() => alert('Mot de passe modifié avec succès'));
    });
  }

  static changeEmail(userId) {
    UserManager.showModal('Changer l\'email', 'Nouvel email', (newEmail) => {
      if (!newEmail || !newEmail.includes('@')) {
        alert('Format email invalide');
        return;
      }
      fetch(`/api/users/${userId}/email`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
      }).then(() => alert('Email modifié avec succès'));
    });
  }

  static deleteAccount(userId) {
    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ?')) {
      fetch(`/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      }).then(() => alert('Compte supprimé'));
    }
  }
}
