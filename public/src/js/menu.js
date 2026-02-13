export class Menu {
    static modal = null;
    static isOpen = false;

    static init() {
        this.modal = document.getElementById('mobile-menu-modal');
        const hamburgerBtn = document.getElementById('hamburger-btn');
        const closeBtn = this.modal?.querySelector('.close-menu-btn');

        if (!this.modal || !hamburgerBtn) return;

        hamburgerBtn.addEventListener('click', () => this.toggle());
        closeBtn?.addEventListener('click', () => this.close());
        
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.close();
        });
    }

    static toggle() {
        this.isOpen ? this.close() : this.open();
    }

    static open() {
        if (!this.modal) return;
        this.modal.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
    }

    static close() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
    }
}