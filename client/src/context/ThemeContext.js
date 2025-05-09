import React, { createContext, useState, useContext, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [genreTheme, setGenreTheme] = useState(null);

  // Theme colors based on genres
  const genreThemes = {
    'self-development': {
      primary: 'bg-white',
      secondary: 'bg-gray-50',
      text: 'text-gray-900',
      accent: 'text-blue-600'
    },
    'fiction': {
      primary: 'bg-purple-50',
      secondary: 'bg-purple-100',
      text: 'text-purple-900',
      accent: 'text-purple-600'
    },
    'science': {
      primary: 'bg-blue-50',
      secondary: 'bg-blue-100',
      text: 'text-blue-900',
      accent: 'text-blue-600'
    },
    'history': {
      primary: 'bg-amber-50',
      secondary: 'bg-amber-100',
      text: 'text-amber-900',
      accent: 'text-amber-600'
    }
  };

  const updateTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const updateGenreTheme = (genre) => {
    setGenreTheme(genre);
    localStorage.setItem('genreTheme', genre);
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedGenreTheme = localStorage.getItem('genreTheme');
    
    if (savedTheme) setTheme(savedTheme);
    if (savedGenreTheme) setGenreTheme(savedGenreTheme);
  }, []);

  const value = {
    theme,
    genreTheme,
    genreThemes,
    updateTheme,
    updateGenreTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 