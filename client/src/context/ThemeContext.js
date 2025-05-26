import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from 'react';

// Theme type definitions
const THEME_MODES = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
};

const GENRE_THEMES = {
  'self-development': {
    primary: 'bg-white',
    secondary: 'bg-gray-50',
    text: 'text-gray-900',
    accent: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-50',
    gradient: 'from-blue-50 to-blue-100',
    shadow: 'shadow-blue-100'
  },
  'fiction': {
    primary: 'bg-purple-50',
    secondary: 'bg-purple-100',
    text: 'text-purple-900',
    accent: 'text-purple-600',
    button: 'bg-purple-600 hover:bg-purple-700',
    border: 'border-purple-200',
    hover: 'hover:bg-purple-50',
    gradient: 'from-purple-50 to-purple-100',
    shadow: 'shadow-purple-100'
  },
  'science': {
    primary: 'bg-blue-50',
    secondary: 'bg-blue-100',
    text: 'text-blue-900',
    accent: 'text-blue-600',
    button: 'bg-blue-600 hover:bg-blue-700',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-50',
    gradient: 'from-blue-50 to-blue-100',
    shadow: 'shadow-blue-100'
  },
  'history': {
    primary: 'bg-amber-50',
    secondary: 'bg-amber-100',
    text: 'text-amber-900',
    accent: 'text-amber-600',
    button: 'bg-amber-600 hover:bg-amber-700',
    border: 'border-amber-200',
    hover: 'hover:bg-amber-50',
    gradient: 'from-amber-50 to-amber-100',
    shadow: 'shadow-amber-100'
  },
  'biography': {
    primary: 'bg-green-50',
    secondary: 'bg-green-100',
    text: 'text-green-900',
    accent: 'text-green-600',
    button: 'bg-green-600 hover:bg-green-700',
    border: 'border-green-200',
    hover: 'hover:bg-green-50',
    gradient: 'from-green-50 to-green-100',
    shadow: 'shadow-green-100'
  },
  'technology': {
    primary: 'bg-indigo-50',
    secondary: 'bg-indigo-100',
    text: 'text-indigo-900',
    accent: 'text-indigo-600',
    button: 'bg-indigo-600 hover:bg-indigo-700',
    border: 'border-indigo-200',
    hover: 'hover:bg-indigo-50',
    gradient: 'from-indigo-50 to-indigo-100',
    shadow: 'shadow-indigo-100'
  },
  'philosophy': {
    primary: 'bg-gray-50',
    secondary: 'bg-gray-100',
    text: 'text-gray-900',
    accent: 'text-gray-600',
    button: 'bg-gray-600 hover:bg-gray-700',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50',
    gradient: 'from-gray-50 to-gray-100',
    shadow: 'shadow-gray-100'
  }
};

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme || THEME_MODES.LIGHT;
  });

  const [genreTheme, setGenreTheme] = useState(() => {
    const savedGenreTheme = localStorage.getItem('genreTheme');
    return savedGenreTheme || 'self-development';
  });

  const [systemTheme, setSystemTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? THEME_MODES.DARK : THEME_MODES.LIGHT;
    }
    return THEME_MODES.LIGHT;
  });

  // Update theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      setSystemTheme(e.matches ? THEME_MODES.DARK : THEME_MODES.LIGHT);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Apply theme changes
  useEffect(() => {
    const currentTheme = theme === THEME_MODES.SYSTEM ? systemTheme : theme;
    document.documentElement.classList.remove(THEME_MODES.LIGHT, THEME_MODES.DARK);
    document.documentElement.classList.add(currentTheme);
    localStorage.setItem('theme', theme);
  }, [theme, systemTheme]);

  const updateTheme = useCallback((newTheme) => {
    if (Object.values(THEME_MODES).includes(newTheme)) {
      setTheme(newTheme);
    }
  }, []);

  const updateGenreTheme = useCallback((genre) => {
    if (genre && GENRE_THEMES[genre]) {
      setGenreTheme(genre);
      localStorage.setItem('genreTheme', genre);
      
      // Update CSS variables for dynamic theming
      const theme = GENRE_THEMES[genre];
      Object.entries(theme).forEach(([key, value]) => {
        document.documentElement.style.setProperty(`--${key}`, value);
      });
    }
  }, []);

  // Memoize current theme to prevent unnecessary re-renders
  const currentTheme = useMemo(() => {
    return GENRE_THEMES[genreTheme] || GENRE_THEMES['self-development'];
  }, [genreTheme]);

  // Memoize context value
  const value = useMemo(() => ({
    theme,
    genreTheme,
    genreThemes: GENRE_THEMES,
    updateTheme,
    updateGenreTheme,
    currentTheme,
    isDark: theme === THEME_MODES.DARK || (theme === THEME_MODES.SYSTEM && systemTheme === THEME_MODES.DARK)
  }), [theme, genreTheme, updateTheme, updateGenreTheme, currentTheme, systemTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 