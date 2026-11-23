const menuButton = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('.site-nav');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const counterItems = document.querySelectorAll('.counter');

function animateCounter(counter) {
  if (counter.dataset.animated) return;
  counter.dataset.animated = 'true';
  const end = Number(counter.dataset.count);
  const value = counter.querySelector('.counter-value');
  if (!value || !Number.isFinite(end)) return;

  if (reduceMotion) {
    value.textContent = String(end);
    return;
  }

  const start = performance.now();
  const duration = 1800;
  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - (1 - progress) ** 3;
    value.textContent = String(progress === 1 ? end : Math.floor(end * eased));
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Start on every full page load; defer on script.js guarantees the Hero markup exists.
counterItems.forEach(animateCounter);

const heroSection = document.querySelector('.hero');
const scrollTasks = [];
let scrollFrame = 0;
const scheduleScrollWork = () => {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    scrollTasks.forEach((task) => task());
  });
};

window.addEventListener('scroll', scheduleScrollWork, { passive: true });

// Use live section geometry so keyboard stops follow responsive and resized content.
const templateSections = Array.from(document.querySelectorAll('main > section'));
let sectionNavigationActive = false;
let sectionNavigationTimer = 0;

const isInteractiveTarget = (target) => target instanceof Element && Boolean(target.closest(
  'input, textarea, select, button, a, [role="button"], [role="link"], [role="menuitem"], [contenteditable]:not([contenteditable="false"]), [tabindex]:not([tabindex="-1"]), audio[controls], video[controls], summary'
));

const navigateSection = (direction) => {
  if (sectionNavigationActive || templateSections.length < 2) return;

  const scrollPadding = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const sectionTops = templateSections.map((section) => section.getBoundingClientRect().top);
  const currentIndex = sectionTops.reduce((closestIndex, sectionTop, index) => {
    const distance = Math.abs(sectionTop - scrollPadding);
    const closestDistance = Math.abs(sectionTops[closestIndex] - scrollPadding);
    return distance < closestDistance ? index : closestIndex;
  }, 0);
  const targetSection = templateSections[currentIndex + direction];
  if (!targetSection) return;

  const targetTop = Math.max(0, window.scrollY + sectionTops[currentIndex + direction] - scrollPadding);
  sectionNavigationActive = true;
  window.scrollTo({ top: targetTop, behavior: reduceMotion ? 'auto' : 'smooth' });
  window.clearTimeout(sectionNavigationTimer);
  sectionNavigationTimer = window.setTimeout(() => {
    sectionNavigationActive = false;
  }, reduceMotion ? 80 : 1000);
};

window.addEventListener('scrollend', () => {
  sectionNavigationActive = false;
  window.clearTimeout(sectionNavigationTimer);
}, { passive: true });

window.addEventListener('keydown', (event) => {
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.repeat || isInteractiveTarget(event.target)) return;

  const isEnter = event.key === 'Enter';
  const isSpace = event.code === 'Space';
  if (!isEnter && !isSpace) return;

  if (isSpace) event.preventDefault();
  navigateSection(event.shiftKey ? -1 : 1);
});

if (siteNav && heroSection) {
  let navShift = 0;
  const visibleNavLinks = siteNav.querySelectorAll('a');
  const heroCta = document.querySelector('.hero-cta');
  const scrollBrand = document.querySelector('.scroll-brand');
  const siteHeader = document.querySelector('.site-header');

  const updateHeroCtaVisibility = () => {
    if (!heroCta) return;

    const heroBottom = heroSection.getBoundingClientRect().bottom;
    const headerBottom = siteHeader?.getBoundingClientRect().bottom ?? 0;
    const isPastHero = heroBottom <= headerBottom;
    heroCta.classList.toggle('is-hidden', isPastHero);
    scrollBrand?.classList.toggle('is-visible', isPastHero);
  };

  const updateNavPosition = () => {
    if (window.matchMedia('(max-width: 700px)').matches || !visibleNavLinks.length) {
      navShift = 0;
      siteNav.style.setProperty('--nav-center-shift', '0px');
      return;
    }

    const heroBounds = heroSection.getBoundingClientRect();
    const progress = Math.max(0, Math.min(1, (heroBounds.height - heroBounds.bottom) / Math.max(1, heroBounds.height)));
    const eased = progress * progress * (3 - 2 * progress);
    const firstLink = visibleNavLinks[0].getBoundingClientRect();
    const lastLink = visibleNavLinks[visibleNavLinks.length - 1].getBoundingClientRect();
    const currentCenter = (firstLink.left + lastLink.right) / 2 - navShift;
    const fullShift = window.innerWidth / 2 - currentCenter;
    navShift = fullShift * eased;
    siteNav.style.setProperty('--nav-center-shift', `${navShift}px`);
  };

  scrollTasks.push(updateNavPosition);
  scrollTasks.push(updateHeroCtaVisibility);
  window.addEventListener('resize', scheduleScrollWork);
  updateNavPosition();
  updateHeroCtaVisibility();
}

if (siteNav && templateSections.length) {
  const activeNavLinks = Array.from(siteNav.querySelectorAll('a[href^="#"]'));
  let activeSectionObserver;
  let geometryFallbackRegistered = false;

  const sectionLinks = templateSections.map((section) => ({
    section,
    link: activeNavLinks.find((navLink) => navLink.getAttribute('href') === `#${section.id}`),
  })).filter(({ link }) => link);

  const updateActiveUnderline = () => {
    const activeLink = activeNavLinks.find((link) => link.classList.contains('active'));
    if (!activeLink || window.matchMedia('(max-width: 850px)').matches) return;

    const navBounds = siteNav.getBoundingClientRect();
    const linkBounds = activeLink.getBoundingClientRect();
    siteNav.style.setProperty('--active-link-left', `${linkBounds.left - navBounds.left}px`);
    siteNav.style.setProperty('--active-link-width', `${linkBounds.width}px`);
  };

  const setActiveSection = (activeSection) => {
    const activeLink = sectionLinks.find(({ section }) => section === activeSection)?.link;
    if (!activeLink) return;

    activeNavLinks.forEach((link) => {
      const isActive = link === activeLink;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    updateActiveUnderline();
  };

  const updateActiveFromGeometry = () => {
    const activeLine = window.innerHeight * 0.48;
    const nearestSection = sectionLinks.reduce((nearest, candidate) => {
      const bounds = candidate.section.getBoundingClientRect();
      const distance = activeLine < bounds.top
        ? bounds.top - activeLine
        : activeLine > bounds.bottom
          ? activeLine - bounds.bottom
          : 0;
      return distance < nearest.distance ? { section: candidate.section, distance } : nearest;
    }, { section: sectionLinks[0].section, distance: Infinity });

    setActiveSection(nearestSection.section);
  };

  const observeActiveSection = () => {
    if (activeSectionObserver) activeSectionObserver.disconnect();

    if (!('IntersectionObserver' in window)) {
      updateActiveFromGeometry();
      if (!geometryFallbackRegistered) {
        geometryFallbackRegistered = true;
        scrollTasks.push(updateActiveFromGeometry);
        window.addEventListener('resize', scheduleScrollWork);
      }
      return;
    }

    const viewportHeight = window.innerHeight;
    const bandHeight = Math.min(12, Math.max(6, Math.round(viewportHeight * 0.01)));
    const activeLine = Math.round(viewportHeight * 0.48);
    const topInset = Math.max(0, Math.round(activeLine - bandHeight / 2));
    const bottomInset = Math.max(0, Math.round(viewportHeight - activeLine - bandHeight / 2));

    activeSectionObserver = new IntersectionObserver(() => {
      updateActiveFromGeometry();
    }, {
      rootMargin: `-${topInset}px 0px -${bottomInset}px 0px`,
      threshold: 0,
    });
    sectionLinks.forEach(({ section }) => activeSectionObserver.observe(section));
  };

  updateActiveFromGeometry();
  updateActiveUnderline();
  observeActiveSection();
  window.addEventListener('resize', () => {
    observeActiveSection();
    updateActiveUnderline();
  }, { passive: true });
}

if (menuButton && siteNav) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Open navigation' : 'Close navigation');
    siteNav.classList.toggle('is-open', !isOpen);
  });

  siteNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.setAttribute('aria-label', 'Open navigation');
      siteNav.classList.remove('is-open');
    });
  });
}

const yearElement = document.querySelector('#year');
if (yearElement) yearElement.textContent = new Date().getFullYear();

const revealItems = document.querySelectorAll('.reveal');
const aboutSection = document.querySelector('.about-section');
if (aboutSection) {
  const aboutCards = aboutSection.querySelectorAll('.about-card');
  const updateAboutMotion = () => {
    if (reduceMotion) {
      aboutSection.style.setProperty('--about-progress', '1');
      aboutSection.style.setProperty('--model-progress', '1');
      aboutCards.forEach((card) => card.style.setProperty('--card-progress', '1'));
      return;
    }

    const bounds = aboutSection.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const start = viewportHeight * 1.08;
    const finish = viewportHeight - bounds.height;
    const progress = Math.max(0, Math.min(1, (start - bounds.top) / Math.max(1, start - finish)));
    const ease = (value) => {
      const clamped = Math.max(0, Math.min(1, value));
      return clamped * clamped * (3 - 2 * clamped);
    };
    aboutSection.style.setProperty('--about-progress', String(progress));
    aboutSection.style.setProperty('--model-progress', String(ease(progress / 0.7)));
    aboutCards.forEach((card, index) => {
      const begins = 0.1 + index * 0.16;
      const cardProgress = ease((progress - begins) / 0.5);
      card.style.setProperty('--card-progress', String(cardProgress));
    });
  };

  scrollTasks.push(updateAboutMotion);
  window.addEventListener('resize', scheduleScrollWork);
  updateAboutMotion();
  aboutCards.forEach((card) => card.classList.remove('reveal'));

  aboutCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      const bounds = card.getBoundingClientRect();
      card.style.setProperty('--pointer-x', `${event.clientX - bounds.left}px`);
      card.style.setProperty('--pointer-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
    card.addEventListener('pointerleave', () => {
      card.style.removeProperty('--pointer-x');
      card.style.removeProperty('--pointer-y');
    });
  });

  const portraitContact = aboutSection.querySelector('.portrait-contact');
  const portraitContactPill = aboutSection.querySelector('.portrait-contact-pill');
  if (portraitContact && portraitContactPill) {
    portraitContact.addEventListener('pointermove', (event) => {
      const bounds = portraitContactPill.getBoundingClientRect();
      portraitContactPill.style.setProperty('--contact-glow-x', `${event.clientX - bounds.left}px`);
      portraitContactPill.style.setProperty('--contact-glow-y', `${event.clientY - bounds.top}px`);
    }, { passive: true });
    portraitContact.addEventListener('pointerleave', () => {
      portraitContactPill.style.removeProperty('--contact-glow-x');
      portraitContactPill.style.removeProperty('--contact-glow-y');
    });
  }
}

const ambientBackground = document.body;
if (ambientBackground && !reduceMotion) {
  const updateAmbientParallax = () => {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0
      ? Math.max(0, Math.min(1, window.scrollY / scrollableHeight))
      : 0;
    ambientBackground.style.setProperty('--ambient-parallax-y', `${(progress * -140).toFixed(1)}px`);
  };

  scrollTasks.push(updateAmbientParallax);
  window.addEventListener('resize', scheduleScrollWork);
  updateAmbientParallax();
} else if (ambientBackground) {
  ambientBackground.style.setProperty('--ambient-parallax-y', '0px');
}

if ('IntersectionObserver' in window && !reduceMotion) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.14 });
  revealItems.forEach((item) => revealObserver.observe(item));

} else {
  revealItems.forEach((item) => item.classList.add('is-visible'));
}

const serviceGrid = document.querySelector('.service-grid');
const toolkitGrid = document.querySelector('.toolkit-grid');
const toolkitSection = toolkitGrid?.closest('.toolkit-section');
const toolkitCircuits = Array.from(toolkitSection?.querySelectorAll('.toolkit-circuit') ?? []);
if (toolkitCircuits.length && !reduceMotion) {
  const sampleCount = 128;
  const particleSpeed = 0.04;
  const circuitPaths = toolkitCircuits.map((circuit) => {
    const path = circuit.querySelector('.toolkit-circuit-trace');
    const lights = Array.from(circuit.querySelectorAll('.toolkit-circuit-light'));
    if (!path || !lights.length) return null;
    const length = path.getTotalLength();
    const samples = Array.from({ length: sampleCount + 1 }, (_, index) =>
      path.getPointAtLength(length * index / sampleCount)
    );
    return { circuit, lights, samples, width: 260, height: 1000, scaleX: 1, scaleY: 1 };
  }).filter(Boolean);

  let sectionInView = false;
  let circuitFrame = 0;
  let lastCircuitScrollY = window.scrollY;
  let lastCircuitDirection = '';
  let travelDirection = 1;
  let travelProgress = 0;
  let previousFrameTime = 0;

  const measureToolkitCircuits = () => {
    circuitPaths.forEach((entry) => {
      const { lights, width, height } = entry;
      const svgBounds = lights[0].ownerSVGElement.getBoundingClientRect();
      entry.scaleX = svgBounds.width / width;
      entry.scaleY = svgBounds.height / height;
    });
  };

  const updateToolkitCircuits = (timestamp) => {
    circuitFrame = 0;
    if (!sectionInView) return;

    if (previousFrameTime) {
      const elapsedSeconds = Math.min(timestamp - previousFrameTime, 50) / 1000;
      travelProgress = (travelProgress + travelDirection * particleSpeed * elapsedSeconds + 1) % 1;
    }
    previousFrameTime = timestamp;

    circuitPaths.forEach(({ lights, samples, scaleX, scaleY }) => {
      lights.forEach((light, index) => {
        const particleProgress = (travelProgress + index / lights.length) % 1;
        const scaledProgress = particleProgress * sampleCount;
        const sampleIndex = Math.min(sampleCount - 1, Math.floor(scaledProgress));
        const sampleMix = scaledProgress - sampleIndex;
        const start = samples[sampleIndex];
        const end = samples[sampleIndex + 1];
        const x = start.x + (end.x - start.x) * sampleMix;
        const y = start.y + (end.y - start.y) * sampleMix;
        light.style.transform = `translate3d(${x * scaleX}px, ${y * scaleY}px, 0)`;
      });
    });

    circuitFrame = requestAnimationFrame(updateToolkitCircuits);
  };

  const scheduleToolkitCircuitFrame = () => {
    if (!circuitFrame && sectionInView) circuitFrame = requestAnimationFrame(updateToolkitCircuits);
  };
  const updateToolkitCircuitDirection = () => {
    const currentScrollY = window.scrollY;
    const delta = currentScrollY - lastCircuitScrollY;
    if (delta === 0) return;
    const direction = delta > 0 ? 'down' : 'up';
    travelDirection = direction === 'down' ? 1 : -1;
    lastCircuitScrollY = currentScrollY;
    if (direction !== lastCircuitDirection) {
      circuitPaths.forEach(({ circuit }) => { circuit.dataset.scrollDirection = direction; });
      lastCircuitDirection = direction;
    }
  };
  const handleToolkitCircuitResize = () => {
    measureToolkitCircuits();
  };

  const setToolkitCircuitVisibility = (isVisible) => {
    if (sectionInView === isVisible) return;
    sectionInView = isVisible;
    toolkitSection.classList.toggle('is-circuit-active', isVisible);
    if (isVisible) {
      measureToolkitCircuits();
      lastCircuitScrollY = window.scrollY;
      previousFrameTime = 0;
      window.addEventListener('scroll', updateToolkitCircuitDirection, { passive: true });
      window.addEventListener('resize', handleToolkitCircuitResize, { passive: true });
      scheduleToolkitCircuitFrame();
    } else {
      window.removeEventListener('scroll', updateToolkitCircuitDirection);
      window.removeEventListener('resize', handleToolkitCircuitResize);
      if (circuitFrame) cancelAnimationFrame(circuitFrame);
      circuitFrame = 0;
      previousFrameTime = 0;
    }
  };

  const toolkitCircuitObserver = new IntersectionObserver(([entry]) => {
    setToolkitCircuitVisibility(Boolean(entry?.isIntersecting));
  });
  toolkitCircuitObserver.observe(toolkitSection);
}
if (toolkitGrid && toolkitSection && !reduceMotion && 'IntersectionObserver' in window) {
  const toolItems = Array.from(toolkitGrid.querySelectorAll('.tool-item'));
  const staggerTimers = new Map();
  let sectionIsActive = false;
  let toolObserver = null;

  const resetToolkitAnimation = () => {
    sectionIsActive = false;
    toolObserver?.disconnect();
    toolObserver = null;
    staggerTimers.forEach((timer) => window.clearTimeout(timer));
    staggerTimers.clear();
    toolItems.forEach((item) => {
      item.classList.remove('is-zoomed');
      item.style.removeProperty('z-index');
    });
  };

  const playToolkitAnimation = () => {
    if (sectionIsActive) return;
    sectionIsActive = true;
    let zoomOrder = 1;
    toolObserver = new IntersectionObserver((entries, observer) => {
      const enteringTools = entries
        .filter((entry) => entry.isIntersecting && sectionIsActive)
        .sort((a, b) => toolItems.indexOf(a.target) - toolItems.indexOf(b.target));

      enteringTools.forEach((entry, staggerIndex) => {
        const item = entry.target;
        observer.unobserve(item);
        const timer = window.setTimeout(() => {
          staggerTimers.delete(item);
          if (!sectionIsActive) return;
          item.classList.add('is-zoomed');
          item.style.zIndex = String(++zoomOrder);
        }, staggerIndex * 90);
        staggerTimers.set(item, timer);
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

    toolItems.forEach((item) => {
      item.classList.remove('is-zoomed');
      item.style.removeProperty('z-index');
      toolObserver.observe(item);
    });
  };

  const toolkitSectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) playToolkitAnimation();
      else if (sectionIsActive) resetToolkitAnimation();
    });
  }, { threshold: 0 });

  toolkitSectionObserver.observe(toolkitSection);
}

if (serviceGrid && !reduceMotion && 'IntersectionObserver' in window) {
  const serviceCards = Array.from(serviceGrid.querySelectorAll('.service-card'));
  if (serviceCards.length) {
    let serviceIsInView = false;
    const resetServiceEntrance = () => {
      serviceIsInView = false;
      serviceCards.forEach((card) => card.classList.remove('service-card--entering'));
      serviceGrid.classList.add('service-grid--armed');
    };
    const playServiceEntrance = () => {
      if (serviceIsInView) return;
      serviceIsInView = true;
      serviceGrid.classList.add('service-grid--armed');
      void serviceGrid.offsetWidth;
      serviceGrid.classList.remove('service-grid--armed');

      serviceCards.forEach((card, index) => {
        card.style.setProperty('--service-card-delay', `${index * 250}ms`);
        card.classList.remove('service-card--entering');
        void card.offsetWidth;
        card.classList.add('service-card--entering');
      });
    };

    serviceCards.forEach((card) => {
      card.addEventListener('animationend', (event) => {
        if (event.animationName === 'serviceCardRise') card.classList.remove('service-card--entering');
      });
    });
    serviceGrid.classList.add('service-grid--armed');
    try {
      const serviceGridObserver = new IntersectionObserver((entries) => {
        const entry = entries[entries.length - 1];
        if (!entry) return;
        if (entry.isIntersecting) playServiceEntrance();
        else if (serviceIsInView) resetServiceEntrance();
      }, { threshold: 0.12 });

      serviceGridObserver.observe(serviceGrid);
    } catch {
      serviceGrid.classList.remove('service-grid--armed');
    }
  }
}

const certificateViewport = document.querySelector('.certificate-viewport');
if (certificateViewport) {
  const certificateTrack = certificateViewport.querySelector('.certificate-track');
  let activeFloatingCertificate = null;
  let returningCertificate = null;
  let returnTimer = 0;

  const floatingDimensions = () => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const mobile = viewportWidth <= 700;
    const maxWidthFromHeight = Math.max(180, (viewportHeight - 52) * (2246 / 1588));
    const width = mobile
      ? Math.min(viewportWidth * 0.88, 420, viewportWidth - 24, maxWidthFromHeight)
      : Math.min(Math.max(360, viewportWidth * 0.28), 540, viewportWidth - 24, maxWidthFromHeight);
    const height = width * (1588 / 2246) + 26;
    return { width, height, viewportWidth, viewportHeight };
  };

  const floatingPosition = (state, width, height, viewportWidth, viewportHeight) => {
    const bounds = state.placeholder.getBoundingClientRect();
    const minX = width / 2;
    const minY = height / 2;
    const pointer = state.pointer;
    const anchoredXMin = Math.max(minX, pointer.x - width / 2);
    const anchoredXMax = Math.min(viewportWidth - minX, pointer.x + width / 2);
    const anchoredYMin = Math.max(minY, pointer.y - height / 2);
    const anchoredYMax = Math.min(viewportHeight - minY, pointer.y + height / 2);
    const originalX = bounds.left + bounds.width / 2;
    const originalY = bounds.top + bounds.height / 2;
    return {
      left: Math.max(anchoredXMin, Math.min(anchoredXMax, originalX)),
      top: Math.max(anchoredYMin, Math.min(anchoredYMax, originalY)),
      sourceWidth: bounds.width,
    };
  };

  const clearFloatingStyles = (card) => {
    card.classList.remove('certificate-card--floating', 'is-returning');
    ['position', 'left', 'top', 'width', 'max-width', 'flex', 'margin', 'transform'].forEach((property) => {
      card.style.removeProperty(property);
    });
  };

  const finishCertificateReturn = () => {
    if (!returningCertificate) return;
    window.clearTimeout(returnTimer);
    const state = returningCertificate;
    returningCertificate = null;
    clearFloatingStyles(state.card);
    state.placeholder.replaceWith(state.card);
    if (certificateTrack) certificateTrack.style.removeProperty('animation-play-state');
  };

  const returnFloatingCertificate = () => {
    if (!activeFloatingCertificate) return;
    const state = activeFloatingCertificate;
    activeFloatingCertificate = null;
    window.removeEventListener('pointermove', trackFloatingPointer, true);

    const bounds = state.placeholder.getBoundingClientRect();
    state.card.style.width = `${bounds.width}px`;
    state.card.style.left = `${bounds.left + bounds.width / 2}px`;
    state.card.style.top = `${bounds.top + bounds.height / 2}px`;
    state.card.classList.add('is-returning');
    returningCertificate = state;
    returnTimer = window.setTimeout(finishCertificateReturn, 360);
  };

  const restoreCertificateBeforeScroll = () => {
    if (activeFloatingCertificate) {
      const state = activeFloatingCertificate;
      activeFloatingCertificate = null;
      window.removeEventListener('pointermove', trackFloatingPointer, true);
      clearFloatingStyles(state.card);
      state.placeholder.replaceWith(state.card);
      if (certificateTrack) certificateTrack.style.removeProperty('animation-play-state');
    }
    if (returningCertificate) finishCertificateReturn();
  };

  function trackFloatingPointer(event) {
    const state = activeFloatingCertificate;
    if (!state) return;
    state.pointer = { x: event.clientX, y: event.clientY };
    const bounds = state.card.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom) {
      returnFloatingCertificate();
    }
  }

  const showFloatingCertificate = (card, event) => {
    if (activeFloatingCertificate?.card === card) return;
    if (activeFloatingCertificate) returnFloatingCertificate();
    if (returningCertificate) finishCertificateReturn();

    const bounds = card.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'certificate-card-placeholder';
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.flex = `0 0 ${bounds.width}px`;
    placeholder.style.width = `${bounds.width}px`;
    placeholder.style.height = `${bounds.height}px`;
    card.replaceWith(placeholder);

    const state = {
      card,
      placeholder,
      pointer: { x: event.clientX, y: event.clientY },
    };
    activeFloatingCertificate = state;
    if (certificateTrack) certificateTrack.style.animationPlayState = 'paused';

    card.classList.add('certificate-card--floating');
    card.style.left = `${bounds.left + bounds.width / 2}px`;
    card.style.top = `${bounds.top + bounds.height / 2}px`;
    card.style.width = `${bounds.width}px`;
    document.body.append(card);
    window.addEventListener('pointermove', trackFloatingPointer, true);

    window.requestAnimationFrame(() => {
      if (activeFloatingCertificate !== state) return;
      const dimensions = floatingDimensions();
      const position = floatingPosition(
        state,
        dimensions.width,
        dimensions.height,
        dimensions.viewportWidth,
        dimensions.viewportHeight,
      );
      card.style.width = `${dimensions.width}px`;
      card.style.left = `${position.left}px`;
      card.style.top = `${position.top}px`;
    });
  };

  certificateViewport.querySelectorAll('.certificate-card').forEach((card) => {
    card.addEventListener('pointerenter', (event) => showFloatingCertificate(card, event));
  });

  window.addEventListener('resize', () => {
    const state = activeFloatingCertificate;
    if (!state) return;
    const dimensions = floatingDimensions();
    const position = floatingPosition(
      state,
      dimensions.width,
      dimensions.height,
      dimensions.viewportWidth,
      dimensions.viewportHeight,
    );
    state.card.style.width = `${dimensions.width}px`;
    state.card.style.left = `${position.left}px`;
    state.card.style.top = `${position.top}px`;
  }, { passive: true });

  window.addEventListener('blur', returnFloatingCertificate);
  window.addEventListener('scroll', restoreCertificateBeforeScroll, { capture: true, passive: true });
}

const projectSelection = document.querySelector('[data-project-selection]');
const projectFolders = Array.from(document.querySelectorAll('[data-project-open]'));
const projectGallery = document.querySelector('[data-project-gallery]');
const projectShowcases = document.querySelector('.project-showcases');
const projectGroups = Array.from(document.querySelectorAll('[data-project-group]'));
const projectBackButton = document.querySelector('[data-project-back]');
const projectGalleryCurrent = document.querySelector('.project-gallery-current');
let activeProjectFolder = '';

const projectFolderEntrances = Array.from(document.querySelectorAll('.project-folder-entrance'));
if (projectFolderEntrances.length && !reduceMotion && 'IntersectionObserver' in window) {
  projectFolderEntrances.forEach((entrance) => entrance.classList.add('has-folder-entrance'));
  const folderEntranceObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      entry.target.classList.toggle('is-folder-in-view', entry.isIntersecting);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });

  projectFolderEntrances.forEach((entrance) => folderEntranceObserver.observe(entrance));
}

if (projectSelection && projectGallery && projectShowcases && projectGroups.length) {
  const folderNames = {
    graphic: 'Graphic Design Projects',
    automation: 'Automation Solutions',
    future: 'Future Projects'
  };
  const motionDelay = reduceMotion ? 0 : 720;
  const automationFilters = Array.from(document.querySelectorAll('[data-automation-filter]'));
  const automationSlots = Array.from(document.querySelectorAll('.project-showcase--automation .project-gallery-slot[data-platform]'));
  const setAutomationFilter = (filter) => {
    automationFilters.forEach((button) => {
      const selected = button.dataset.automationFilter === filter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    automationSlots.forEach((slot) => {
      slot.hidden = filter !== 'all' && slot.dataset.platform !== filter;
    });
  };

  automationFilters.forEach((button) => button.addEventListener('click', () => {
    setAutomationFilter(button.dataset.automationFilter || 'all');
  }));

  projectFolders.forEach((folder) => {
    folder.addEventListener('click', () => {
      if (activeProjectFolder) return;
      activeProjectFolder = folder.dataset.projectOpen;
      const openDelay = reduceMotion
        ? 0
        : window.matchMedia('(hover: none)').matches
          ? (activeProjectFolder === 'future' ? 1100 : 900)
          : motionDelay;
      projectBackButton?.classList.toggle('is-automation', activeProjectFolder === 'automation');
      folder.setAttribute('aria-expanded', 'true');
      projectSelection.classList.add('is-opening');
      folder.classList.add('is-opening');
      projectFolders.filter((item) => item !== folder).forEach((item) => item.classList.add('is-dimmed'));

      window.setTimeout(() => {
        if (activeProjectFolder === 'automation') setAutomationFilter('all');
        projectGroups.forEach((group) => {
          group.hidden = group.dataset.projectGroup !== activeProjectFolder;
        });
        projectShowcases.dataset.active = activeProjectFolder;
        projectGalleryCurrent.textContent = folderNames[activeProjectFolder] || 'Projects';
        projectSelection.hidden = true;
        projectGallery.hidden = false;
        projectGallery.classList.remove('is-leaving');
        requestAnimationFrame(() => projectGallery.classList.add('is-visible'));
        projectBackButton?.focus({ preventScroll: true });
      }, openDelay);
    });
  });

  projectBackButton?.addEventListener('click', () => {
    if (!activeProjectFolder || projectBackButton.disabled) return;
    projectBackButton.disabled = true;
    const returningFolder = projectFolders.find((folder) => folder.dataset.projectOpen === activeProjectFolder);
    projectGallery.classList.remove('is-visible');
    projectGallery.classList.add('is-leaving');
    window.setTimeout(() => {
      projectGallery.hidden = true;
      setAutomationFilter('all');
      projectGallery.classList.remove('is-leaving');
      projectSelection.hidden = false;
      projectSelection.classList.add('is-returning');
      projectFolders.forEach((folder) => {
        folder.classList.remove('is-opening', 'is-dimmed');
        folder.setAttribute('aria-expanded', 'false');
      });
      activeProjectFolder = '';
      projectBackButton.disabled = false;
      projectBackButton.classList.remove('is-automation');
      requestAnimationFrame(() => {
        projectSelection.classList.remove('is-returning', 'is-opening');
        returningFolder?.focus({ preventScroll: true });
      });
    }, reduceMotion ? 0 : 420);
  });
}

const projectDetailData = [
  {
    id: 'moncy-branding',
    title: 'Moncy Coffee – Brand Identity & Visual Branding',
    category: 'Graphic Design · Brand Identity',
    images: [
      { src: 'assets/moncy/moncy%201.png', alt: 'Moncy Coffee brand identity and visual branding' },
      { src: 'assets/moncy/moncy%202.png', alt: 'Moncy Coffee packaging and brand applications' },
      { src: 'assets/moncy/moncy%203.png', alt: 'Moncy Coffee visual identity design' },
      { src: 'assets/moncy/moncy%204.png', alt: 'Moncy Coffee brand graphics and packaging' },
      { src: 'assets/moncy/moncy%205.png', alt: 'Moncy Coffee brand presentation' }
    ],
    video: null,
    client: '', duration: '',
    overview: 'Moncy Coffee is a modern coffee and snack brand that brings together coffee, sweets, pastries, and Filipino kakanin in one youthful and welcoming experience. Built around the idea of making everyday coffee moments more enjoyable, the brand combines familiar comfort with a fresh street-style personality. It aims to create a space where young adults can enjoy good coffee and satisfying treats without feeling too formal or intimidating.',
    objectives: 'Understanding the Need\nThe brand needed a visual identity that feels modern, playful, and recognizable while remaining approachable to its target audience. Since Moncy Coffee offers more than just coffee, the identity had to represent a wider range of products, from bottled coffee and sweet treats to pastries and traditional Filipino kakanin. The challenge was to create a brand that stands out in a competitive coffee market without losing its soft, friendly, and welcoming character. The central question was how to create a street-inspired coffee brand that feels bold and youthful while remaining warm and approachable.\n\nCrafting the Creative Direction\nThe creative direction combined modern streetwear aesthetics with playful café branding. Bold script typography became the foundation of the identity, giving the logo a distinctive and energetic personality. A friendly coffee cup mascot wearing sunglasses and sneakers represents the brand’s youthful, laid-back character. Orange, blue, black, and white create strong contrast while keeping the overall appearance clean and balanced. The goal was to make the identity cool and expressive without becoming too loud or overwhelming.\n\nThe Challenge\nThe identity needed to balance a street-style concept with the welcoming atmosphere expected from a coffee and food brand. It needed to appeal to young adults while remaining suitable for different products, including traditional Filipino snacks. The logo, mascot, packaging, storefront, and social media materials also needed to maintain a consistent visual direction.',
    role: 'Finding the Solution\nThe solution was to build a flexible visual identity around recognizable typography, a memorable mascot, and a consistent color system. The coffee cup mascot serves as the brand’s visual character, making the identity more personal and recognizable. The bold script logo establishes its personality, while orange and blue accents add energy and distinction. These elements were applied consistently across bottled coffee stickers, takeaway packaging, storefront signage, and Facebook branding. The result is a cohesive identity connecting the brand’s products and creating a recognizable experience across customer touchpoints.',
    process: 'The Design Process\nTypography: Bold, groovy script lettering for the main logo, paired with clean and readable secondary fonts.\n\nColor Palette: Orange (#FF7A00), blue (#0D47FF), black (#000000), and white (#FFFFFF) create a vibrant yet balanced visual identity.\n\nLogo & Mascot: A distinctive Moncy Coffee wordmark paired with a friendly coffee cup character wearing sunglasses and sneakers.\n\nGraphic Elements: Checkerboard patterns and flowing organic shapes introduce a modern street-style aesthetic.\n\nPackaging System: Coordinated bottle stickers, takeaway cups, and paper bags create consistency across product presentations.\n\nBrand Applications: Storefront signage and Facebook page graphics extend the identity into physical and digital spaces.',
    results: ['The final identity presents Moncy Coffee as a youthful, modern, and approachable coffee brand with a distinctive street-style personality.', 'The design brings its different products together under one recognizable visual system.', 'Bold yet approachable: expressive graphics with a welcoming personality.', 'Playful yet cohesive: a memorable mascot and consistent visual elements.', 'Modern yet familiar: contemporary street-style branding blended with the comfort of Filipino food culture.', 'Flexible and recognizable: adapts across bottled coffee, packaging, storefront signage, and social media.', 'With this identity, Moncy Coffee is positioned to build a recognizable presence, connect with young coffee lovers, and grow into a brand that offers more than coffee: a place for coffee, sweets, pastries, kakanin, and everyday moments worth enjoying.'],
    externalLink: ''
  },
  {
    id: 'wterly-branding',
    title: 'Wterly Eau de Parfum – Branding & Packaging Design',
    category: 'Graphic Design · Branding & Packaging',
    images: [
      { src: 'assets/wterly/wterly-1.png', alt: 'Wterly Eau de Parfum black and gold perfume packaging' },
      { src: 'assets/wterly/wterly-2.png', alt: 'Wterly Eau de Parfum bottle and packaging presentation' },
      { src: 'assets/wterly/wterly-3.png', alt: 'Wterly Eau de Parfum brand presentation' },
      { src: 'assets/wterly/wterly-4.png', alt: 'Wterly Eau de Parfum packaging design detail' },
      { src: 'assets/wterly/wterly-5.png', alt: 'Wterly Eau de Parfum visual identity presentation' }
    ],
    video: null,
    client: '', duration: '',
    overview: 'Wterly Eau de Parfum is a luxury fragrance brand created to represent elegance, sophistication, and individuality. Designed with a refined black-and-gold identity, the product communicates a premium fragrance experience through its visual presentation. More than a scent, it represents a feeling, a statement of confidence, and a lasting impression.\n\nInspired by the timeless appeal of luxury fragrances, Wterly combines minimalist elements with elegant details. Its identity is built around a lotus-inspired symbol, flowing gold accents, and sophisticated typography to create a brand that feels exclusive, memorable, and refined.',
    objectives: 'Understanding the Need\nThe product needed a visual identity that could communicate luxury and quality while remaining clean, cohesive, and recognizable. The packaging had to reflect the premium character of the fragrance, from the perfume bottle to its outer box. Every element needed to work together to establish a consistent brand experience. The challenge was to create packaging that communicates luxury, elegance, and sophistication while making the product visually distinctive.\n\nCrafting the Creative Direction\nThe creative direction was built around a black-and-gold visual theme. Black represents sophistication, mystery, and timeless elegance, while gold adds a sense of exclusivity and refinement. Flowing gold wave elements introduce movement and visual depth against the dark background. A lotus-inspired symbol serves as the brand’s visual signature, representing beauty and elegance.\n\nThe Challenge\nThe identity needed to feel premium without becoming overly decorative. The design balances visual richness with simplicity and maintains consistency across different packaging applications. The perfume box, bottle label, and overall presentation share the same visual language.',
    role: 'Finding the Solution\nThe approach focused on creating a unified visual identity through consistent colors, typography, and brand elements. The black packaging provides a strong foundation, while gold accents highlight the logo, product name, and decorative patterns. The bottle and packaging complement each other, resulting in a cohesive presentation that strengthens brand recognition.',
    process: 'The Design Process\nBrand Symbolism: The lotus-inspired logo represents elegance, beauty, and refinement.\n\nPackaging & Structure: The rectangular perfume box complements the 50 mL fragrance bottle, with a coordinated front, side, and back layout.\n\nTypography: Elegant serif typography communicates sophistication, while clean, spaced lettering enhances readability and adds a premium feel.\n\nColor & Texture: Deep black and metallic gold establish a luxurious atmosphere, enhanced by flowing gold wave patterns and subtle reflective details.\n\nBottle Label Design: The front label highlights the Wterly brand and fragrance name, while the back label accommodates product information and supporting details.',
    results: ['The final design presents Wterly as a sophisticated and premium fragrance brand.', 'The packaging translates the brand identity into a cohesive visual experience, with every component contributing to its overall appeal.', 'Elegant yet bold, combining dark tones with striking gold details.', 'Minimal yet luxurious, balancing simplicity with refined decoration.', 'Consistent yet distinctive, maintaining a unified identity across the bottle and packaging.', 'Wterly transforms the presentation of a fragrance into a visual expression of elegance and individuality. More than a scent, it’s a feeling.'],
    externalLink: ''
  },
  {
    id: 'mke-clothing-brand',
    title: 'MKE Design – Clothing Brand Identity & Apparel Design',
    category: 'Graphic Design · Brand Identity & Apparel',
    images: [
      { src: 'assets/MKE/mke-1.jpg', alt: 'MKE Design clothing brand identity presentation' },
      { src: 'assets/MKE/mke-2.jpg', alt: 'MKE Design streetwear apparel graphic' },
      { src: 'assets/MKE/mke-3.jpg', alt: 'MKE Design skull mascot and motivational streetwear artwork' },
      { src: 'assets/MKE/mke-4.jpg', alt: 'MKE Design apparel branding and shirt application' },
      { src: 'assets/MKE/mke-5.jpg', alt: 'MKE Design graphic artwork without text' }
    ],
    video: { src: 'assets/MKE/video_2026-08-27_13-27-14.mp4', type: 'video' },
    client: 'MKE Design (Motivation Kill Excuses)', duration: '',
    overview: 'MKE Design (Motivation Kill Excuses) is a streetwear-inspired clothing brand built around motivation, individuality, and self-expression. With a bold identity and a strong message, the brand represents a mindset of pushing beyond limitations, taking action, and refusing to make excuses.',
    objectives: 'Understanding the Need\nThe goal was to create a clothing identity that goes beyond simply putting graphics on shirts. MKE Design needed a recognizable visual style that reflects its motivational message while capturing the bold attitude of modern streetwear.\n\nThe challenge was to develop a design that feels edgy, expressive, and memorable without making the overall branding look overcrowded. Every detail needed to communicate the brand’s personality, from its logo and signature mascot to the graphics printed on the apparel.\n\nThe Challenge\nOne of the main challenges was balancing the brand’s aggressive streetwear aesthetic with its motivational message. The graphics needed to feel bold enough to attract attention while remaining visually organized and recognizable. Another consideration was maintaining consistency between the front and back of the shirt, ensuring that the smaller chest logo and larger back illustration worked together as one cohesive identity.',
    role: 'Crafting the Creative Direction\nThe creative direction centered on bold streetwear aesthetics, combining gothic-inspired typography, striking illustrations, and a strong black-and-white foundation with vibrant pink accents.\n\nThe visual concept revolves around the brand’s signature skull mascot featuring an exposed brain, symbolizing mindset, awareness, and the power of motivation. Crossed bones and aggressive facial expressions add character, giving the identity a rebellious and distinctive streetwear personality.\n\nRather than following a minimalist approach, the direction embraces oversized graphics, statement typography, and detailed compositions that make each apparel piece stand out.\n\nFinding the Solution\nThe solution was to establish a recognizable mascot-driven visual identity supported by a consistent typography and color system. The skull-and-brain illustration became the central visual signature of MKE Design, while the gothic lettering reinforced its rebellious and bold personality. The motivational message, “Motivation Kill Excuses,” was incorporated into the overall identity to give the brand a stronger purpose beyond fashion. The result is an apparel concept that combines streetwear culture, graphic illustration, and motivational storytelling.',
    process: 'Every element was developed to strengthen the brand’s visual identity and translate its personality into wearable graphics:\n\nLogo & Mascot: A custom skull-and-crossbones illustration with a pink brain, representing mindset, awareness, and determination.\n\nTypography: Bold gothic and blackletter-inspired fonts paired with condensed supporting typography for a powerful streetwear aesthetic.\n\nColor Palette: Black, white, and vibrant pink create a high-contrast identity that feels edgy, modern, and recognizable.\n\nFront Design: A small circular chest emblem provides a clean and understated brand signature.\n\nBack Design: An oversized graphic composition featuring the mascot, statement typography, and motivational messaging creates a strong visual impact.\n\nApparel Application: The identity was applied to oversized black T-shirts, maintaining a consistent look across front and back placements.',
    results: ['The final design delivers a bold and recognizable streetwear identity that gives MKE Design its own visual personality.', 'Bold and expressive: Strong graphics and typography capture the rebellious spirit of streetwear.', 'Meaningful and motivational: The mascot and brand message communicate a mindset of discipline and determination.', 'Distinctive and memorable: The signature skull mascot and pink accent create a recognizable visual identity.', 'Consistent and versatile: The branding works across chest prints, oversized back graphics, and promotional brand materials.', 'With this visual direction, MKE Design establishes more than just a clothing label. It represents a lifestyle and mindset built around one message: Motivation Kill Excuses.'],
    externalLink: ''
  },
  {
    id: 'ai-job-scraper',
    title: 'AI Job Scraper + Resume Optimizer',
    category: 'Automation Solutions · N8N',
    images: [{ src: 'assets/n8n%20project/AI%20Job%20Scraper%20%2B%20Resume%20Optimizer.jpg', alt: 'AI Job Scraper + Resume Optimizer workflow' }],
    video: null,
    client: '', duration: '',
    overview: "An n8n automation triggered via Slack that scrapes job listings, loops through each result, retrieves the user's resume from Google Drive, and uses an OpenRouter AI model to tailor it per job. It then copies and updates the resume document, drafts an email, and sends the job details back to a Slack channel — all automatically.",
    objectives: '', role: '', tools: ['n8n', 'Slack', 'Google Drive', 'OpenRouter'],
    process: 'Slack command → Scrape job board → Loop listings → Pull resume → AI tailoring (OpenRouter) → Copy & update doc → Draft email → Notify Slack.',
    results: ['Eliminated hours of manual job searching and resume editing', 'Delivered AI-tailored resumes for every job listing automatically', 'Streamlined the entire application process from search to outreach in one workflow'],
    externalLink: ''
  },
  {
    id: 'ai-receptionist',
    title: 'AI Receptionist',
    category: 'Automation Solutions · N8N',
    images: [{ src: 'assets/n8n%20project/AI%20Receptionist.jpg', alt: 'AI Receptionist workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'An n8n automation that acts as a fully functional AI receptionist managing appointment scheduling. It handles four core operations — getting available slots, booking, updating, and canceling appointments — all connected to Google Calendar and responding back to users via webhook in real time.',
    objectives: '', role: '', tools: ['n8n', 'Google Calendar', 'OpenAI'],
    process: 'Webhook trigger → Intent routing (4 ops) → Google Calendar read/write → Conflict checks → Real-time response to user.',
    results: ['Automated end-to-end appointment management with zero manual handling', 'Reduced scheduling errors through real-time calendar conflict checking', 'Saved hours of receptionist work daily with instant, accurate booking responses'],
    externalLink: ''
  },
  {
    id: 'social-content-creator',
    title: 'AI Social Media Content Creator',
    category: 'Automation Solutions · N8N',
    images: [{ src: 'assets/n8n%20project/AI%20Social%20Media%20Content%20Creator.jpg', alt: 'AI Social Media Content Creator workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'An n8n automation that generates social media content on a schedule. It creates unique AI-generated quotes, fetches real-time weather and relevant images from Pexels, then composes everything into a fully designed visual using an AI Agent — ensuring no duplicate quotes or images are ever reused.',
    objectives: '', role: '', tools: ['n8n', 'OpenAI', 'Pexels API', 'Weather API'],
    process: 'Cron trigger → Generate unique quote → Fetch weather + Pexels image → Compose visual via AI Agent → Dedup check → Publish & log.',
    results: ['Eliminated manual content creation with fully automated post generation', 'Ensured 100% unique content by tracking and avoiding duplicates', 'Increased posting consistency with zero daily manual input'],
    externalLink: ''
  },
  {
    id: 'drive-file-sorter',
    title: 'Auto Sort Files on Google Drive',
    category: 'Automation Solutions · N8N',
    images: [{ src: 'assets/n8n%20project/Auto%20Sort%20Files%20on%20Google%20Drive.jpg', alt: 'Auto Sort Files on Google Drive workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'An n8n automation that automatically organizes Google Drive files. When a new file is detected, it downloads and filters it, uses AI to analyze the content, then intelligently moves it to the correct folder — no manual sorting needed.',
    objectives: '', role: '', tools: ['n8n', 'Google Drive', 'OpenAI'],
    process: 'Trigger on new Drive file → Download & filter → AI content analysis → Match to folder taxonomy → Move file to correct destination → Log activity.',
    results: ['Reduced manual file organization time by 90%', 'Improved folder structure consistency and searchability', 'Increased productivity by eliminating repetitive sorting tasks'],
    externalLink: ''
  },
  {
    id: 'facebook-messenger-agent',
    title: 'Facebook Messenger AI Agent',
    category: 'Automation Solutions · N8N',
    images: [{ src: 'assets/n8n%20project/Facebook%20Messenger%20AI%20Agent.jpg', alt: 'Facebook Messenger AI Agent workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'An n8n automation that powers an AI chatbot for Facebook Messenger. Triggered via Webhook, it verifies incoming requests, filters valid messages, and passes them to a Google Gemini AI Agent with memory, then sends context-aware replies back to users via HTTP Request.',
    objectives: '', role: '', tools: ['n8n', 'Facebook Messenger', 'Google Gemini'],
    process: 'Webhook trigger → Verify Meta signature → Filter valid messages → Gemini AI Agent with memory → Send response via Graph API.',
    results: ['Delivered instant AI responses to Messenger users 24/7', 'Reduced manual customer support workload by up to 80%', 'Improved engagement through memory-enabled, personalized conversations'],
    externalLink: ''
  },
  {
    id: 'zapier-content-repurposing',
    title: 'AI Content Repurposing & Distribution Workflow',
    category: 'Automation Solutions · Zapier',
    images: [{ src: 'assets/Zapier%20project/AI%20CONTENT%20REPURPOSING.jpg', alt: 'AI Content Repurposing project' }],
    video: null,
    client: '', duration: '',
    overview: 'An AI-powered workflow in Zapier that automatically repurposes content and distributes it across multiple platforms. It collects original content (blogs, videos, social media posts), uses AI to generate variations, summaries, and platform-specific formats, schedules and posts content automatically to all social media, and tracks engagement with a dashboard for performance monitoring.',
    objectives: '', role: '', tools: ['Zapier', 'OpenAI', 'Buffer', 'Google Sheets'],
    process: 'Source content → AI variations & summaries → Per-platform formatting → Schedule & publish → Engagement tracking dashboard.',
    results: ['Saves hours of manual content editing and posting', 'Increases reach by delivering tailored content across channels', 'Ensures consistent publishing without human intervention'],
    externalLink: ''
  },
  {
    id: 'zapier-leads-enrichment',
    title: 'AUTOMATED LEADS ENRICHMENT',
    category: 'Automation Solutions · Zapier',
    images: [{ src: 'assets/Zapier%20project/AUTOMATED%20LEADS%20ENRICHMENT.jpg', alt: 'Automated Leads Enrichment project' }],
    video: null,
    client: '', duration: '',
    overview: 'A Zapier automation that triggers when a new lead comes in via webhook. It extracts the company URL, enriches the lead using Apollo, then splits into two paths — High Priority leads are saved to Google Sheets, notified via Slack, and sent an AI-drafted email, while Low Priority leads receive a Gmail notification to the sales team.',
    objectives: '', role: '', tools: ['Zapier', 'Apollo', 'Slack', 'Gmail', 'Google Sheets'],
    process: 'Webhook lead → Extract domain → Apollo enrichment → Priority router → High: Sheets + Slack + AI email / Low: Gmail to sales.',
    results: ['Automated lead enrichment and prioritization with zero manual research', 'Ensured high-priority leads receive instant, AI-personalized outreach', 'Improved sales team response time with real-time Slack and email notifications'],
    externalLink: ''
  },
  {
    id: 'zapier-asana-crm',
    title: 'Automation Setup for Asana CRM',
    category: 'Automation Solutions · Zapier',
    images: [{ src: 'assets/Zapier%20project/AUTOMATION%20SETUP%20FOR%20ASANA%20CRM.jpg', alt: 'Automation Setup for Asana CRM project' }],
    video: null,
    client: '', duration: '',
    overview: 'A Zapier automation triggered when an Asana task is updated. It splits into five paths based on deal stage — Ready to Start, No Response, Quoted, Approved, and Paid & Closed — each triggering tailored actions like creating Google Drive folders, sending follow-up emails with delays, generating AI welcome messages, and delivering AI-generated service variation emails via Gmail.',
    objectives: '', role: '', tools: ['Zapier', 'Asana', 'Gmail', 'Google Drive', 'OpenAI'],
    process: 'Asana task update → Path router by stage → Drive folders / delayed emails / AI welcome / Gmail sequences.',
    results: ['Automated the entire client pipeline from lead to closed deal', 'Eliminated manual follow-ups with stage-based email sequences and delays', 'Improved client experience with AI-personalized welcome and service emails'],
    externalLink: ''
  },
  {
    id: 'make-xero-transactions',
    title: 'Export Account Transactions from Xero',
    category: 'Automation Solutions · Make',
    images: [{ src: 'assets/MAKE%20PROJECTS/Export%20Account%20Transactions%20from%20Xero.jpg', alt: 'Export Account Transactions from Xero workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'A Make automation triggered by completed Asana tasks that pulls account transactions from Xero via API. It routes the data to Google Sheets — iterating and logging each transaction row — then aggregates the values, uploads the report as an Asana attachment, and clears the sheet range for the next run.',
    objectives: '', role: '', tools: ['Make', 'Xero', 'Asana', 'Google Sheets'],
    process: 'Asana task complete → Xero API pull → Iterator → Sheets logging → Aggregate → Upload report to Asana → Clear range.',
    results: ['Eliminated manual transaction exports with fully automated Xero-to-Sheets reporting', 'Ensured clean, up-to-date records by automatically clearing and refreshing data each cycle', 'Improved financial visibility by linking transaction reports directly to Asana tasks'],
    externalLink: ''
  },
  {
    id: 'make-gmail-attachments',
    title: 'File Attachment from Gmail Logs',
    category: 'Automation Solutions · Make',
    images: [{ src: 'assets/MAKE%20PROJECTS/FILE%20ATTACHMENT%20FROM%20GMAIL%20LOGS.jpg', alt: 'File Attachment from Gmail Logs workflow' }],
    video: null,
    client: '', duration: '',
    overview: 'A Make automation that monitors Gmail every 15 minutes for new emails with attachments. It lists the attachments, uploads them to AI for analysis, generates a new file name, saves the file to Google Drive, logs the attachment details in Google Sheets, and sends an email notification — all automatically.',
    objectives: '', role: '', tools: ['Make', 'Gmail', 'Google Drive', 'Google Sheets', 'OpenAI'],
    process: 'Gmail poll (15 min) → List attachments → AI analysis & rename → Save to Drive → Log to Sheets → Email notification.',
    results: ['Eliminated manual downloading and organizing of email attachments', 'Ensured every attachment is properly named, stored, and logged automatically', 'Improved file traceability with real-time email notifications and spreadsheet logs'],
    externalLink: ''
  }
];

const projectDetailDialog = document.querySelector('[data-project-detail-dialog]');
if (projectDetailDialog) {
  const projectCards = Array.from(document.querySelectorAll('[data-project-id]'));
  const projectLookup = new Map(projectDetailData.map((project) => [project.id, project]));
  const detailScroll = projectDetailDialog.querySelector('[data-project-detail-scroll]');
  const detailTitle = projectDetailDialog.querySelector('[data-project-detail-title]');
  const detailCategory = projectDetailDialog.querySelector('[data-project-detail-category]');
  const detailMainMedia = projectDetailDialog.querySelector('[data-project-detail-main-media]');
  const detailMainImage = projectDetailDialog.querySelector('[data-project-detail-main-image]');
  const detailPreviousImage = projectDetailDialog.querySelector('[data-project-image-previous]');
  const detailNextImage = projectDetailDialog.querySelector('[data-project-image-next]');
  const detailThumbnails = projectDetailDialog.querySelector('[data-project-detail-thumbnails]');
  const detailVideo = projectDetailDialog.querySelector('[data-project-detail-video]');
  const detailFields = projectDetailDialog.querySelector('[data-project-detail-fields]');
  const detailLower = projectDetailDialog.querySelector('.project-detail-lower');
  const detailBookCall = projectDetailDialog.querySelector('[data-project-book-call]');
  const detailWatchDemo = projectDetailDialog.querySelector('[data-project-watch-demo]');
  const detailWorkflowButton = projectDetailDialog.querySelector('[data-project-workflow]');
  const demoDialog = document.querySelector('[data-project-demo-dialog]');
  const workflowDialog = document.querySelector('[data-project-workflow-dialog]');
  const workflowImage = workflowDialog?.querySelector('[data-project-workflow-image]');
  const workflowTitle = workflowDialog?.querySelector('[data-project-workflow-title]');
  const workflowViewer = workflowDialog?.querySelector('[data-project-workflow-viewer]');
  const detailExternal = projectDetailDialog.querySelector('[data-project-detail-external]');
  const detailBackButton = projectDetailDialog.querySelector('[data-project-detail-back]');
  const projectCursorMedia = window.matchMedia('(min-width: 1024px) and (hover: hover) and (pointer: fine)');
  const projectHoverCursor = document.createElement('div');
  projectHoverCursor.className = 'project-hover-cursor';
  projectHoverCursor.setAttribute('aria-hidden', 'true');
  const cursorText = document.createElement('span');
  cursorText.textContent = 'View Full Project';
  const cursorArrow = document.createElement('span');
  cursorArrow.className = 'project-hover-cursor-arrow';
  cursorArrow.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
  projectHoverCursor.append(cursorText, cursorArrow);
  document.body.append(projectHoverCursor);
  document.body.classList.add('has-project-hover-cursor');
  const updateProjectCursor = (event) => {
    projectHoverCursor.style.setProperty('--project-cursor-x', `${event.clientX}px`);
    projectHoverCursor.style.setProperty('--project-cursor-y', `${event.clientY}px`);
  };
  const hideProjectCursor = () => projectHoverCursor.classList.remove('is-visible');
  let activeDetailCard = null;
  let activeDetailProject = null;
  let activeDetailImageIndex = 0;
  let activeDetailToken = '';
  let detailIsClosing = false;

  const renderProjectDetail = (project) => {
    activeDetailProject = project;
    detailTitle.textContent = project.title;
    detailCategory.textContent = project.category || '';
    detailCategory.hidden = !project.category;
    const isAutomationProject = /automation solutions/i.test(project.category || '');
    detailWatchDemo.hidden = !isAutomationProject;
    detailWorkflowButton.hidden = !isAutomationProject;
    detailBookCall?.classList.toggle('is-automation', isAutomationProject);
    detailBackButton?.classList.toggle('is-automation', /automation solutions/i.test(project.category || ''));

    const images = Array.isArray(project.images) ? project.images : [];
    activeDetailImageIndex = 0;
    detailMainImage.hidden = images.length === 0;
    detailMainMedia.hidden = images.length === 0;
    const showProjectImage = (index) => {
      if (!images.length) return;
      activeDetailImageIndex = (index + images.length) % images.length;
      const image = images[activeDetailImageIndex];
      detailMainImage.src = image.src;
      detailMainImage.alt = image.alt || project.title;
      detailThumbnails.querySelectorAll('.project-detail-thumbnail').forEach((button, buttonIndex) => {
        button.setAttribute('aria-pressed', String(buttonIndex === activeDetailImageIndex));
      });
    };
    detailPreviousImage.hidden = images.length < 2;
    detailNextImage.hidden = images.length < 2;
    detailPreviousImage.onclick = () => showProjectImage(activeDetailImageIndex - 1);
    detailNextImage.onclick = () => showProjectImage(activeDetailImageIndex + 1);
    detailThumbnails.replaceChildren();
    detailThumbnails.hidden = images.length < 2;
    if (images.length > 1) {
      images.forEach((image, index) => {
        const thumbnail = document.createElement('button');
        thumbnail.className = 'project-detail-thumbnail';
        thumbnail.type = 'button';
        thumbnail.setAttribute('aria-label', `View image ${index + 1} of ${images.length}`);
        thumbnail.setAttribute('aria-pressed', String(index === 0));
        const thumbnailImage = document.createElement('img');
        thumbnailImage.src = image.src;
        thumbnailImage.alt = '';
        thumbnail.append(thumbnailImage);
        thumbnail.addEventListener('click', () => {
          showProjectImage(index);
        });
        detailThumbnails.append(thumbnail);
      });
    }
    showProjectImage(0);

    detailVideo.replaceChildren();
    detailVideo.hidden = !project.video?.src;
    if (project.video?.src) {
      if (project.video.type === 'embed') {
        const frame = document.createElement('iframe');
        frame.src = project.video.src;
        frame.title = `${project.title} video`;
        frame.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        frame.loading = 'lazy';
        detailVideo.append(frame);
      } else {
        const video = document.createElement('video');
        video.controls = true;
        video.playsInline = true;
        video.preload = 'metadata';
        video.src = project.video.src;
        detailVideo.append(video);
      }
    }

    const fieldDefinitions = [
      ['Client', project.client],
      ['Project duration', project.duration],
      ['Description', project.overview],
      ['Objectives', project.objectives],
      ['My role', project.role],
      ['Workflow', project.process],
      ['Results', project.results],
      ['Tools Used', project.tools]
    ];
    detailFields.replaceChildren();
    fieldDefinitions.filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value)).forEach(([label, value]) => {
      const field = document.createElement('section');
      field.className = 'project-detail-field';
      const heading = document.createElement('h2');
      heading.textContent = label;
      field.append(heading);
      if (Array.isArray(value) && label === 'Tools Used') {
        const tags = document.createElement('div');
        tags.className = 'project-detail-tags';
        value.forEach((tool) => {
          const tag = document.createElement('span');
          tag.textContent = tool;
          tags.append(tag);
        });
        field.append(tags);
      } else if (Array.isArray(value)) {
        const list = document.createElement('ul');
        list.className = 'project-detail-list';
        value.forEach((item) => {
          const listItem = document.createElement('li');
          listItem.textContent = item;
          list.append(listItem);
        });
        field.append(list);
      } else {
        const content = document.createElement('p');
        content.textContent = value;
        field.append(content);
      }
      detailFields.append(field);
    });
    if (detailLower) detailLower.hidden = detailFields.childElementCount === 0;

    detailExternal.hidden = !project.externalLink;
    if (project.externalLink) detailExternal.href = project.externalLink;
  };

  projectDetailDialog.addEventListener('keydown', (event) => {
    if (!projectDetailDialog.open || !activeDetailProject) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const count = activeDetailProject.images?.length || 0;
    if (count > 1) {
      activeDetailImageIndex = (activeDetailImageIndex + direction + count) % count;
      const thumbnail = detailThumbnails.querySelectorAll('.project-detail-thumbnail')[activeDetailImageIndex];
      thumbnail?.click();
    }
  });

  const openProjectDetail = (projectId, fromHistory = false) => {
    if (projectDetailDialog.open || detailIsClosing) return;
    const project = projectLookup.get(projectId);
    if (!project) return;
    hideProjectCursor();
    activeDetailCard = projectCards.find((card) => card.dataset.projectId === projectId) || null;
    renderProjectDetail(project);
    detailScroll.scrollTop = 0;
    projectDetailDialog.classList.remove('is-closing');
    detailIsClosing = false;
    document.documentElement.classList.add('project-detail-active');
    if (!fromHistory) {
      activeDetailToken = `project-detail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const existingState = history.state && typeof history.state === 'object' ? history.state : {};
      history.pushState({ ...existingState, projectDetailId: projectId, projectDetailToken: activeDetailToken }, '');
    } else {
      activeDetailToken = history.state?.projectDetailToken || '';
    }
    projectDetailDialog.showModal();
    detailBackButton.focus({ preventScroll: true });
  };

  const closeProjectDetail = (fromHistory = false) => {
    if (!projectDetailDialog.open || detailIsClosing) return;
    detailIsClosing = true;
    projectDetailDialog.classList.add('is-closing');
    if (!fromHistory && activeDetailToken && history.state?.projectDetailToken === activeDetailToken) history.back();
    window.setTimeout(() => {
      if (projectDetailDialog.open) projectDetailDialog.close();
      document.documentElement.classList.remove('project-detail-active');
      projectDetailDialog.classList.remove('is-closing');
      detailIsClosing = false;
      activeDetailToken = '';
      activeDetailCard?.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 360);
  };

  projectCards.forEach((card) => {
    card.addEventListener('click', () => openProjectDetail(card.dataset.projectId));
    card.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openProjectDetail(card.dataset.projectId);
    });
    card.addEventListener('pointerenter', (event) => {
      if (!projectCursorMedia.matches || event.pointerType !== 'mouse') return;
      updateProjectCursor(event);
      projectHoverCursor.classList.add('is-visible');
    });
    card.addEventListener('pointermove', (event) => {
      if (projectCursorMedia.matches && event.pointerType === 'mouse') updateProjectCursor(event);
    });
    card.addEventListener('pointerleave', hideProjectCursor);
  });
  projectCursorMedia.addEventListener?.('change', (event) => {
    if (!event.matches) hideProjectCursor();
  });

  detailBackButton?.addEventListener('click', () => closeProjectDetail());
  detailWatchDemo?.addEventListener('click', () => {
    if (demoDialog && !demoDialog.open) demoDialog.showModal();
  });
  document.querySelector('[data-project-demo-close]')?.addEventListener('click', () => demoDialog?.close());
  detailWorkflowButton?.addEventListener('click', () => {
    const image = activeDetailProject?.images?.[0];
    if (!workflowDialog || !image?.src) return;
    workflowTitle.textContent = `${activeDetailProject.title} — workflow`;
    workflowImage.src = image.src;
    workflowImage.alt = image.alt || `${activeDetailProject.title} workflow`;
    workflowImage.style.width = '100%';
    workflowViewer.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    workflowDialog.showModal();
  });
  const adjustWorkflowZoom = (amount) => {
    if (!workflowImage) return;
    const current = Number.parseFloat(workflowImage.style.width) || 100;
    workflowImage.style.width = `${Math.min(300, Math.max(35, current + amount))}%`;
  };
  workflowDialog?.querySelector('[data-workflow-zoom-in]')?.addEventListener('click', () => adjustWorkflowZoom(25));
  workflowDialog?.querySelector('[data-workflow-zoom-out]')?.addEventListener('click', () => adjustWorkflowZoom(-25));
  workflowDialog?.querySelector('[data-workflow-zoom-reset]')?.addEventListener('click', () => {
    if (workflowImage) workflowImage.style.width = '100%';
    workflowViewer?.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  });
  workflowDialog?.querySelector('[data-workflow-close]')?.addEventListener('click', () => workflowDialog.close());
  detailBookCall?.addEventListener('click', (event) => {
    event.preventDefault();
    closeProjectDetail();
    window.setTimeout(() => {
      document.querySelector('#contact')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    }, reduceMotion ? 0 : 390);
  });
  projectDetailDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeProjectDetail();
  });
  projectDetailDialog.addEventListener('close', () => {
    document.documentElement.classList.remove('project-detail-active');
  });
  window.addEventListener('popstate', () => {
    if (projectDetailDialog.open) {
      if (!history.state?.projectDetailId) closeProjectDetail(true);
    } else if (history.state?.projectDetailId) {
      openProjectDetail(history.state.projectDetailId, true);
    }
  });
}

const projectPlaceholderDialog = document.querySelector('.project-placeholder-dialog');
if (projectPlaceholderDialog) {
  document.querySelectorAll('[data-project-placeholder]').forEach((button) => {
    button.addEventListener('click', () => projectPlaceholderDialog.showModal());
  });
  projectPlaceholderDialog.querySelector('.project-dialog-close')?.addEventListener('click', () => {
    projectPlaceholderDialog.close();
  });
  projectPlaceholderDialog.addEventListener('click', (event) => {
    if (event.target === projectPlaceholderDialog) projectPlaceholderDialog.close();
  });
}

const testimonialEntries = [
  { name: 'Aarav Sharma', company: 'Lumière Creative Studio', image: 'assets/client 1.png', feedback: 'Working with Mark was a great experience. He understood our vision and transformed our ideas into stunning visuals. His creativity, attention to detail, and consistency made our brand stand out. Highly recommended!' },
  { name: 'Miguel Santos', company: 'Nexora Digital Solutions', image: 'assets/client 2.png', feedback: 'Mark helped us simplify our daily operations through smart automation. His solutions reduced repetitive tasks, improved our workflow, and saved us valuable time. He truly understands how technology can make business processes more efficient.' },
  { name: 'Oliver Bennett', company: 'VertexFlow Technologies', image: 'assets/client 3.png', feedback: 'Mark delivered an excellent combination of creativity and technical expertise. From organizing our digital processes to implementing efficient workflows, he made everything smoother and easier to manage. A reliable professional to work with!' }
];

const testimonialCarousel = document.querySelector('[data-testimonial-carousel]');
const testimonialSlides = testimonialCarousel?.querySelector('[data-testimonial-slides]');
const testimonialDots = testimonialCarousel?.querySelector('[data-testimonial-dots]');
const testimonialPrevious = testimonialCarousel?.querySelector('[data-testimonial-previous]');
const testimonialNext = testimonialCarousel?.querySelector('[data-testimonial-next]');

if (testimonialCarousel && testimonialSlides && testimonialDots) {
  const slideElements = [];
  const dotElements = [];
  let activeTestimonialIndex = 0;

  testimonialEntries.forEach((entry, index) => {
    const slide = document.createElement('article');
    slide.className = 'testimonial-slide';
    slide.id = `testimonial-slide-${index + 1}`;
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `Client ${index + 1} of ${testimonialEntries.length}`);

    const avatar = document.createElement('div');
    avatar.className = 'testimonial-avatar';
    if (entry.image) {
      const image = document.createElement('img');
      image.src = entry.image;
      image.alt = `${entry.name} profile`;
      image.loading = 'lazy';
      image.decoding = 'async';
      avatar.append(image);
    } else {
      avatar.classList.add('testimonial-avatar--placeholder');
      avatar.setAttribute('aria-label', 'Replaceable client profile placeholder');
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 48 48');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<circle cx="24" cy="16" r="6"/><path d="M13 37c1-7 5-11 11-11s10 4 11 11"/>';
      avatar.append(icon);
    }

    const name = document.createElement('h3');
    name.className = 'testimonial-name';
    name.textContent = entry.name;

    const company = document.createElement('p');
    company.className = 'testimonial-company';
    company.textContent = entry.company;

    const feedback = document.createElement('blockquote');
    feedback.className = 'testimonial-feedback';
    feedback.textContent = entry.feedback;

    slide.append(avatar, name, company, feedback);
    testimonialSlides.append(slide);
    slideElements.push(slide);

    const dot = document.createElement('button');
    dot.className = 'testimonial-dot';
    dot.type = 'button';
    dot.setAttribute('aria-label', `Show client testimonial ${index + 1}`);
    dot.setAttribute('aria-controls', slide.id);
    dot.addEventListener('click', () => activateTestimonial(index));
    testimonialDots.append(dot);
    dotElements.push(dot);
  });

  function activateTestimonial(activeIndex) {
    activeTestimonialIndex = (activeIndex + testimonialEntries.length) % testimonialEntries.length;
    slideElements.forEach((slide, index) => {
      const isActive = index === activeTestimonialIndex;
      slide.classList.toggle('is-active', isActive);
      slide.setAttribute('aria-hidden', String(!isActive));
      dotElements[index].classList.toggle('is-active', isActive);
      dotElements[index].setAttribute('aria-pressed', String(isActive));
    });
  }

  testimonialPrevious?.addEventListener('click', () => activateTestimonial(activeTestimonialIndex - 1));
  testimonialNext?.addEventListener('click', () => activateTestimonial(activeTestimonialIndex + 1));

  let touchStart = null;
  testimonialCarousel.addEventListener('touchstart', (event) => {
    const touch = event.changedTouches[0];
    touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null;
  }, { passive: true });
  testimonialCarousel.addEventListener('touchend', (event) => {
    if (!touchStart) return;
    const touch = event.changedTouches[0];
    const swipeDistanceX = (touch?.clientX ?? touchStart.x) - touchStart.x;
    const swipeDistanceY = (touch?.clientY ?? touchStart.y) - touchStart.y;
    if (Math.abs(swipeDistanceX) > 48 && Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
      activateTestimonial(activeTestimonialIndex + (swipeDistanceX < 0 ? 1 : -1));
    }
    touchStart = null;
  }, { passive: true });

  activateTestimonial(0);

  const testimonialSection = testimonialCarousel.closest('.testimonials-section');
  if (testimonialSection && !reduceMotion && 'IntersectionObserver' in window) {
    const testimonialEntranceObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => testimonialSection.classList.toggle('is-in-view', entry.isIntersecting));
    }, { threshold: 0.18, rootMargin: '0px 0px -5% 0px' });
    testimonialEntranceObserver.observe(testimonialSection);
  } else {
    testimonialSection?.classList.add('is-in-view');
  }
}

