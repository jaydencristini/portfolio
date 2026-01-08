/**
 * Portfolio interactions:
 * - Scroll progress bar
 * - About reveal (plays once)
 * - Active nav indicator (Home/About/Projects/Contact)
 *
 * Design:
 * - Determine active section using an "activation line" inside the viewport
 * - Add top/bottom fallbacks so Home + Contact are always reachable
 * - Use requestAnimationFrame to avoid scroll-jank and weird observer edge cases
 */

(() => {
  // ---------- Helpers ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ---------- Elements ----------
  const progressEl = $("#scroll-progress");
  const navLinks = $$("nav a");
  let lockedActiveId = null;
  let lockedUntil = 0;

  // Map nav links to section elements (by href="#id")
  const linkTargets = navLinks
    .map((a) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return null;
      const id = href.slice(1);
      const el = document.getElementById(id);
      return el ? { id, el, link: a } : null;
    })
    .filter(Boolean);

  sortTargetsByPagePosition();

  function sortTargetsByPagePosition() {
    linkTargets.sort((a, b) => {
      const aTop = a.el.getBoundingClientRect().top + window.scrollY;
      const bTop = b.el.getBoundingClientRect().top + window.scrollY;
      return aTop - bTop;
    });
  }

  // If contact is a footer, ensure it's included even if not linked properly
  const contactEl = document.getElementById("contact");
  if (contactEl && !linkTargets.some((t) => t.id === "contact")) {
    linkTargets.push({
      id: "contact",
      el: contactEl,
      link: navLinks.find((a) => a.getAttribute("href") === "#contact") || null,
    });
  }

  // ---------- Active link state ----------
  function setActive(id) {
    navLinks.forEach((a) => {
      const active = a.getAttribute("href") === `#${id}`;
      a.classList.toggle("active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function lockActive(id, ms = 900) {
    lockedActiveId = id;
    lockedUntil = Date.now() + ms;
    setActive(id);
  }

  navLinks.forEach((a) => {
    a.addEventListener("click", () => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;

      const id = href.slice(1);
      // Lock so scrollspy can't immediately override it
      lockActive(id, 900);
    });
  });

  // ---------- Scroll progress ----------
  function updateProgress() {
    if (!progressEl) return;

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progressEl.style.width = `${pct}%`;
  }

  // ---------- About reveal (plays once) ----------
  const aboutSection = $(".about-section");
  let aboutRevealed = false;

  function updateAboutReveal() {
    if (!aboutSection || aboutRevealed) return;

    const rect = aboutSection.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement.clientHeight;

    // reveal when section enters ~75% of viewport height
    if (rect.top < vh * 0.75) {
      aboutSection.classList.add("visible");
      aboutRevealed = true;
    }
  }

  function computeActiveSectionId() {
    if (!linkTargets.length) return null;

    // If user just clicked a tab, keep it active while the scroll settles
    if (lockedActiveId && Date.now() < lockedUntil) {
      return lockedActiveId;
    }

    const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
    const docHeight =
      document.documentElement.scrollHeight -
      document.documentElement.clientHeight;

    // Top fallback: Home is always reachable again
    if (scrollTop < 80) return "home";

    // Bottom fallback: Contact is always reachable even if footer is short
    if (docHeight > 0 && scrollTop > docHeight - 140) return "contact";

    // Activation line in PAGE coordinates (accounts for nav height)
    const navEl = document.querySelector("nav");
    const navH = navEl ? navEl.getBoundingClientRect().height : 64;

    // Put the activation line a bit below the nav + ~30% down the viewport
    const activationLine = scrollTop + navH + window.innerHeight * 0.3;

    // Robust rule: pick the section with the greatest top <= activationLine
    let activeId = linkTargets[0].id;
    let bestTop = -Infinity;

    for (const t of linkTargets) {
      const top = t.el.getBoundingClientRect().top + scrollTop;

      if (top <= activationLine && top > bestTop) {
        bestTop = top;
        activeId = t.id;
      }
    }

    if (lockedActiveId && Date.now() >= lockedUntil) {
      lockedActiveId = null;
    }

    return activeId;
  }

  // ---------- RAF throttle to prevent bugs/jitter ----------
  let ticking = false;

  function onScrollOrResize() {
    if (ticking) return;
    ticking = true;

    requestAnimationFrame(() => {
      updateProgress();
      updateAboutReveal();

      const activeId = computeActiveSectionId();
      if (activeId) setActive(activeId);

      ticking = false;
    });
  }

  // ---------- Init ----------
  window.addEventListener("scroll", onScrollOrResize, { passive: true });
  window.addEventListener("resize", onScrollOrResize);
  window.addEventListener("load", onScrollOrResize);

  // Set initial states
  onScrollOrResize();

  // Set initial states
  onScrollOrResize();
})();


