// Quản lý theme Light / Dark Mode cho Fella
export const getTheme = () => {
  try {
    return localStorage.getItem('fella_theme') || 'light';
  } catch {
    return 'light';
  }
};

export const setTheme = (theme) => {
  try {
    localStorage.setItem('fella_theme', theme);
  } catch (e) {
    console.error('Cannot save theme to localStorage', e);
  }
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('fella-theme-change', { detail: { theme } }));
};

export const toggleTheme = () => {
  const current = getTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
};

export const initTheme = () => {
  const theme = getTheme();
  document.documentElement.setAttribute('data-theme', theme);
};
