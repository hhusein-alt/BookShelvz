class KeyboardShortcuts {
    constructor() {
        this.shortcuts = new Map();
        this.isEnabled = true;
        this.init();
    }

    init() {
        // Add event listener for keyboard shortcuts
        document.addEventListener('keydown', this.handleKeyPress.bind(this));
        
        // Register default shortcuts
        this.registerDefaultShortcuts();
    }

    registerDefaultShortcuts() {
        // Navigation shortcuts
        this.register('h', 'Go to Home', () => window.location.href = '/');
        this.register('l', 'Go to Library', () => window.location.href = '/library');
        this.register('s', 'Go to Settings', () => window.location.href = '/settings');
        
        // Reading shortcuts
        this.register('ArrowRight', 'Next Page', () => this.triggerEvent('nextPage'));
        this.register('ArrowLeft', 'Previous Page', () => this.triggerEvent('previousPage'));
        this.register('Space', 'Toggle Play/Pause', () => this.triggerEvent('togglePlayPause'));
        
        // Search shortcuts
        this.register('Ctrl+f', 'Focus Search', () => {
            const searchInput = document.querySelector('.search-input');
            if (searchInput) {
                searchInput.focus();
            }
        });
        
        // Theme shortcuts
        this.register('Ctrl+t', 'Toggle Theme', () => this.triggerEvent('toggleTheme'));
        
        // Bookmark shortcuts
        this.register('Ctrl+b', 'Toggle Bookmark', () => this.triggerEvent('toggleBookmark'));
        
        // Help shortcut
        this.register('?', 'Show Shortcuts', () => this.showShortcutsHelp());
    }

    register(key, description, callback) {
        this.shortcuts.set(key, { description, callback });
    }

    handleKeyPress(event) {
        if (!this.isEnabled) return;

        // Check for modifier keys
        const hasCtrl = event.ctrlKey;
        const hasAlt = event.altKey;
        const hasShift = event.shiftKey;
        const key = event.key.toLowerCase();

        // Build shortcut key
        let shortcutKey = '';
        if (hasCtrl) shortcutKey += 'Ctrl+';
        if (hasAlt) shortcutKey += 'Alt+';
        if (hasShift) shortcutKey += 'Shift+';
        shortcutKey += key;

        // Check if shortcut exists
        const shortcut = this.shortcuts.get(shortcutKey);
        if (shortcut) {
            event.preventDefault();
            shortcut.callback();
        }
    }

    triggerEvent(eventName, detail = {}) {
        const event = new CustomEvent(eventName, { detail });
        document.dispatchEvent(event);
    }

    showShortcutsHelp() {
        const shortcutsList = Array.from(this.shortcuts.entries())
            .map(([key, { description }]) => `${key}: ${description}`)
            .join('\n');

        // Create and show modal with shortcuts
        const modal = document.createElement('div');
        modal.className = 'shortcuts-modal';
        modal.innerHTML = `
            <div class="shortcuts-content">
                <h2>Keyboard Shortcuts</h2>
                <pre>${shortcutsList}</pre>
                <button class="close-button">Close</button>
            </div>
        `;

        // Add styles
        const style = document.createElement('style');
        style.textContent = `
            .shortcuts-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }
            .shortcuts-content {
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 500px;
                width: 90%;
            }
            .shortcuts-content pre {
                white-space: pre-wrap;
                font-family: monospace;
                background: #f5f5f5;
                padding: 15px;
                border-radius: 4px;
            }
            .close-button {
                margin-top: 15px;
                padding: 8px 16px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 4px;
                cursor: pointer;
            }
            .close-button:hover {
                background: #2980b9;
            }
        `;
        document.head.appendChild(style);

        // Add close functionality
        modal.querySelector('.close-button').addEventListener('click', () => {
            document.body.removeChild(modal);
        });

        // Close on escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(modal);
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);

        document.body.appendChild(modal);
    }

    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }
}

// Initialize keyboard shortcuts
const keyboardShortcuts = new KeyboardShortcuts();

// Export for use in other scripts
window.keyboardShortcuts = keyboardShortcuts; 