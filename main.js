document.addEventListener('DOMContentLoaded', () => {
    // Simple fade-in on page load for main content
    const main = document.querySelector('main');
    if (main) {
        main.style.opacity = '0';
        main.style.transition = 'opacity 0.4s ease';
        requestAnimationFrame(() => {
            main.style.opacity = '1';
        });
    }
});
