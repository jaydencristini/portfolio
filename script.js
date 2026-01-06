// Minimal JS for future enhancements
// Keeping this lightweight and intentional

// Example: fade-in on scroll (can be extended)
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
      }
    });
  },
  { threshold: 0.15 }
);

// Observe cards
const animatedElements = document.querySelectorAll(
  '.card, .about-section'
);
animatedElements.forEach(el => observer.observe(el));

// for scroll progress bar 
window.addEventListener('scroll', () => {
  const scrollTop = window.scrollY;
  const docHeight = document.body.scrollHeight - window.innerHeight;
  const progress = (scrollTop / docHeight) * 100;
  document.getElementById('scroll-progress').style.width = `${progress}%`;
});