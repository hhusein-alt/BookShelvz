class ThemeManager {
    constructor() {
        this.themes = {
            default: {
                primary: '#3498db',
                secondary: '#2ecc71',
                background: '#ffffff',
                text: '#2c3e50',
                accent: '#e74c3c'
            },
            fantasy: {
                primary: '#9b59b6',
                secondary: '#8e44ad',
                background: '#f5f5f5',
                text: '#2c3e50',
                accent: '#e67e22'
            },
            mystery: {
                primary: '#34495e',
                secondary: '#2c3e50',
                background: '#ecf0f1',
                text: '#2c3e50',
                accent: '#e74c3c'
            },
            romance: {
                primary: '#e84393',
                secondary: '#fd79a8',
                background: '#fff5f7',
                text: '#2c3e50',
                accent: '#e84393'
            },
            scifi: {
                primary: '#00b894',
                secondary: '#00cec9',
                background: '#f0f8ff',
                text: '#2c3e50',
                accent: '#0984e3'
            }
        };

        this.currentTheme = 'default';
        this.init();
    }

    init() {
        // Load saved theme preference
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && this.themes[savedTheme]) {
            this.setTheme(savedTheme);
        }

        // Listen for theme changes
        document.addEventListener('themeChange', (event) => {
            if (event.detail && this.themes[event.detail]) {
                this.setTheme(event.detail);
            }
        });

        // Listen for genre changes
        document.addEventListener('genreChange', (event) => {
            if (event.detail && this.themes[event.detail]) {
                this.setTheme(event.detail);
            }
        });
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Theme "${themeName}" not found, using default theme`);
            themeName = 'default';
        }

        this.currentTheme = themeName;
        const theme = this.themes[themeName];

        // Update CSS variables
        document.documentElement.style.setProperty('--primary-color', theme.primary);
        document.documentElement.style.setProperty('--secondary-color', theme.secondary);
        document.documentElement.style.setProperty('--background-color', theme.background);
        document.documentElement.style.setProperty('--text-color', theme.text);
        document.documentElement.style.setProperty('--accent-color', theme.accent);

        // Save theme preference
        localStorage.setItem('theme', themeName);

        // Dispatch theme changed event
        document.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: themeName }
        }));
    }

    getTheme() {
        return this.currentTheme;
    }

    getThemeColors() {
        return this.themes[this.currentTheme];
    }

    addTheme(name, colors) {
        if (this.themes[name]) {
            console.warn(`Theme "${name}" already exists, overwriting`);
        }
        this.themes[name] = colors;
    }

    removeTheme(name) {
        if (name === 'default') {
            console.warn('Cannot remove default theme');
            return;
        }
        delete this.themes[name];
    }

    // Helper method to generate a contrasting text color
    getContrastingTextColor(hexColor) {
        // Remove the hash if it exists
        const hex = hexColor.replace('#', '');

        // Convert to RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

        // Return black or white based on luminance
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // Helper method to generate a darker shade of a color
    darkenColor(hexColor, percent) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const darken = (color) => Math.max(0, Math.floor(color * (1 - percent / 100)));

        const newR = darken(r);
        const newG = darken(g);
        const newB = darken(b);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    // Helper method to generate a lighter shade of a color
    lightenColor(hexColor, percent) {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        const lighten = (color) => Math.min(255, Math.floor(color * (1 + percent / 100)));

        const newR = lighten(r);
        const newG = lighten(g);
        const newB = lighten(b);

        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }
}

// Initialize theme manager
const themeManager = new ThemeManager();

// Export for use in other scripts
window.themeManager = themeManager; 