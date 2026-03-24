/**
 * Theme Manager for École Saint Vincent
 * Handles light/dark mode toggling, OS preference detection, and localStorage savings.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');

    // 1. Check local storage first
    let currentTheme = localStorage.getItem('theme');

    // 2. If no local storage, check OS preference
    if (!currentTheme) {
        // [DESACTIVE] Détection automatique du thème de l'OS (remis en commentaire à la demande)
        /*
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            currentTheme = 'dark';
        } else {
            currentTheme = 'light';
        }
        */
        
        currentTheme = 'light'; // Forcer le thème clair par défaut
    }

    // Apply initial theme
    applyTheme(currentTheme);

    // Listen for toggle button clicks
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(currentTheme);
            localStorage.setItem('theme', currentTheme);
        });
    }

    // [DESACTIVE] Listen to OS changes (only if user hasn't explicitly set a preference)
    /*
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        if (!localStorage.getItem('theme')) {
            const newTheme = e.matches ? 'dark' : 'light';
            applyTheme(newTheme);
            currentTheme = newTheme;
        }
    });
    */

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update icon if available
        if (themeIcon) {
            if (theme === 'dark') {
                themeIcon.classList.remove('bi-moon-fill');
                themeIcon.classList.add('bi-sun-fill');
            } else {
                themeIcon.classList.remove('bi-sun-fill');
                themeIcon.classList.add('bi-moon-fill');
            }
        }
    }
});
