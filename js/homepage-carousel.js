/* Native controls preserve keyboard support without intercepting touch or scroll. */
(() => {
    const hero = document.getElementById('homepage-hero');
    if (!hero) return;
    const slides = [...hero.querySelectorAll('.home-slide')];
    const frames = [...hero.querySelectorAll('.home-frame')];
    const controls = hero.querySelector('.home-controls');
    const rotation = hero.querySelector('.home-rotation');
    const status = hero.querySelector('.home-status');
    const liveRegion = hero.querySelector('.home-slides');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fineHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    const intervalMs = 5000;
    let current = 0;
    let paused = motion.matches;
    let hovered = false;
    let inView = true;
    let timer = null;
    function stopTimer() { window.clearInterval(timer); timer = null; }
    function sync() {
        rotation.textContent = paused ? 'Play slideshow' : 'Pause slideshow';
        liveRegion.setAttribute('aria-live', paused ? 'polite' : 'off');
        status.setAttribute('aria-live', paused ? 'polite' : 'off');
        if (!paused && !hovered && inView && !document.hidden) {
            // Visibility notifications must not repeatedly restart the five-second dwell.
            if (timer === null) timer = window.setInterval(() => show(current + 1), intervalMs);
        } else stopTimer();
    }
    function show(index) {
        current = (index + slides.length) % slides.length;
        [slides, frames].forEach(items => items.forEach((item, i) => {
            item.classList.toggle('active', i === current);
            item.setAttribute('aria-hidden', String(i !== current));
        }));
        status.textContent = `${current + 1} / ${slides.length}`;
    }
    function pause() { paused = true; sync(); }
    controls.hidden = false;
    rotation.addEventListener('click', () => { paused = !paused; sync(); });
    hero.querySelector('.home-prev').addEventListener('click', () => { pause(); show(current - 1); });
    hero.querySelector('.home-next').addEventListener('click', () => { pause(); show(current + 1); });
    // Keyboard entry stops rotation until explicitly restarted (ARIA carousel pattern).
    hero.addEventListener('focusin', pause);
    // Touch-generated compatibility mouse events must not leave mobile autoplay suspended.
    hero.addEventListener('pointerenter', event => {
        if (fineHover.matches && event.pointerType === 'mouse') { hovered = true; sync(); }
    });
    hero.addEventListener('pointerleave', () => { hovered = false; sync(); });
    fineHover.addEventListener('change', () => { hovered = false; sync(); });
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', () => { if (motion.matches) pause(); });
    if ('IntersectionObserver' in window) {
        new IntersectionObserver(entries => {
            const visible = entries[0].isIntersecting;
            if (visible !== inView) { inView = visible; sync(); }
        }, { threshold: 0 }).observe(hero);
    }
    show(0);
    sync();
})();
