import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('taskflow_theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    // Default to dark mode for SaaS look
    return 'dark';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      // Set CSS variables for dark mode
      root.style.setProperty('--app-bg', '#0a0614');
      root.style.setProperty('--main-bg', '#0d0820');
      root.style.setProperty('--surface', '#150b2e');
      root.style.setProperty('--surface-2', '#1a0e3a');
      root.style.setProperty('--text-primary', '#e2e0ff');
      root.style.setProperty('--text-secondary', 'rgba(167, 139, 250, 0.7)');
      root.style.setProperty('--border', 'rgba(139, 92, 246, 0.12)');
      document.body.style.backgroundColor = '#0a0614';
      document.body.style.color = '#e2e0ff';
    } else {
      root.classList.remove('dark');
      // Set CSS variables for light mode
      root.style.setProperty('--app-bg', '#f4f2ff');
      root.style.setProperty('--main-bg', '#f0ecff');
      root.style.setProperty('--surface', '#ffffff');
      root.style.setProperty('--surface-2', '#faf8ff');
      root.style.setProperty('--text-primary', '#1e1b4b');
      root.style.setProperty('--text-secondary', 'rgba(109, 40, 217, 0.6)');
      root.style.setProperty('--border', 'rgba(139, 92, 246, 0.1)');
      document.body.style.backgroundColor = '#f4f2ff';
      document.body.style.color = '#1e1b4b';
    }
    localStorage.setItem('taskflow_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
