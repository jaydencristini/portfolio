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

(() => {
  const cards = Array.from(document.querySelectorAll("[data-project]"));
  const drawer = document.getElementById("project-drawer");
  const drawerTitle = document.getElementById("project-drawer-title");
  const drawerBody = document.getElementById("project-drawer-body");
  const closeBtn = drawer?.querySelector(".project-drawer-close");

  if (!cards.length || !drawer || !drawerTitle || !drawerBody || !closeBtn)
    return;

  const projectsGrid = drawer.parentElement; // .projects
  const mobileMQ = window.matchMedia("(max-width: 700px)");

  let activeCard = null;

  const dockDrawer = () => {
    if (!projectsGrid) return;

    // On mobile: put the drawer right after the active card
    if (mobileMQ.matches && activeCard) {
      activeCard.after(drawer);
      return;
    }

    // On desktop: keep it as the last child so it's full-width below the grid
    projectsGrid.appendChild(drawer);
  };

  const clearActiveStates = () => {
    cards.forEach((c) => {
      c.dataset.active = "false";
      const btn = c.querySelector(".project-header");
      if (btn) btn.setAttribute("aria-expanded", "false");
    });
  };

  const closeDrawer = () => {
    clearActiveStates();
    activeCard = null;

    drawerBody.innerHTML = "";
    drawerTitle.textContent = "";

    dockDrawer();
    drawer.hidden = true;

    drawer.classList.remove("drawer-visible");
  };

  const openDrawerFor = (card) => {
    const btn = card.querySelector(".project-header");
    const template = card.querySelector(".project-template");

    if (!btn || !template) return;

    // If clicking the same active card: toggle close
    if (activeCard === card && drawer.hidden === false) {
      closeDrawer();
      return;
    }

    clearActiveStates();
    activeCard = card;

    // Mark active
    card.dataset.active = "true";
    btn.setAttribute("aria-expanded", "true");

    // Populate drawer
    const titleEl = card.querySelector("h3");
    drawerTitle.textContent = titleEl ? titleEl.textContent.trim() : "Project";

    drawerBody.innerHTML = "";
    drawerBody.appendChild(template.content.cloneNode(true));

    // Put drawer where it should live for this viewport
    dockDrawer();

    // Show drawer
    drawer.hidden = false;

    // Allow CSS to apply before animating (prevents snap-in)
    requestAnimationFrame(() => {
      drawer.classList.add("drawer-visible");
    });

    // Smoothly bring drawer into view (not too jumpy)
    const y = drawer.getBoundingClientRect().top + window.scrollY - 90;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  // Bind card clicks
  // Bind card clicks (single, reliable handler)
  cards.forEach((card) => {
    const btn = card.querySelector(".project-header");
    if (!btn) return;

    card.dataset.active = "false";
    btn.setAttribute("aria-expanded", "false");

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openDrawerFor(card);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDrawerFor(card);
      }
    });
  });

  // Close controls
  closeBtn.addEventListener("click", closeDrawer);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !drawer.hidden) closeDrawer();
  });

  // Optional: click outside drawer to close (very clean UX)
  document.addEventListener("click", (e) => {
    if (drawer.hidden) return;
    const isClickInsideDrawer = drawer.contains(e.target);
    const isClickOnCard = cards.some((c) => c.contains(e.target));
    if (!isClickInsideDrawer && !isClickOnCard) closeDrawer();
  });

  mobileMQ.addEventListener("change", () => {
    if (!drawer.hidden) dockDrawer();
  });
})();
