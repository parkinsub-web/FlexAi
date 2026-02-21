const navLinks = document.querySelectorAll('header.nav a[href^="#"]');

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

const smoothScrollTo = (targetY, duration = 700) => {
  const startY = window.scrollY;
  const diff = targetY - startY;
  let start;

  const step = (ts) => {
    if (!start) start = ts;
    const time = ts - start;
    const progress = Math.min(time / duration, 1);
    const eased = easeInOut(progress);
    window.scrollTo(0, startY + diff * eased);
    if (progress < 1) requestAnimationFrame(step);
  };

  requestAnimationFrame(step);
};

navLinks.forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    const navHeight = document.querySelector('header.nav')?.offsetHeight || 0;
    const top = target.getBoundingClientRect().top + window.scrollY - (navHeight + 8);
    smoothScrollTo(top, 800);
  });
});

// subtle parallax for hero blob
const blob = document.querySelector('.hero-blob');
window.addEventListener('scroll', () => {
  if (!blob) return;
  const y = window.scrollY * 0.2;
  blob.style.transform = `translateY(${y}px)`;
});
