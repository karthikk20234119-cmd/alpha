(function () {
  "use strict";

  const config = {
    scrollOffset: 84,
    revealThreshold: 0.15,
    counterDuration: 2200,
    typingDelay: 500,
    pageLeaveDuration: 320,
    magneticMaxOffset: 14,
  };

  const media = {
    reduced: window.matchMedia("(prefers-reduced-motion: reduce)"),
    coarse: window.matchMedia("(pointer: coarse)"),
  };

  const state = {
    mouse: {
      x: window.innerWidth * 0.5,
      y: window.innerHeight * 0.5,
      targetX: window.innerWidth * 0.5,
      targetY: window.innerHeight * 0.5,
    },
    rafId: null,
  };

  const q = (selector, root = document) => root.querySelector(selector);
  const qa = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  const isReducedMotion = () => media.reduced.matches;
  const isCoarsePointer = () => media.coarse.matches;
  const hasGSAP = () => typeof window.gsap !== "undefined";

  const easeInOutExpo = (t, b, c, d) => {
    if (t === 0) return b;
    if (t === d) return b + c;
    if ((t /= d / 2) < 1) return (c / 2) * Math.pow(2, 10 * (t - 1)) + b;
    return (c / 2) * (-Math.pow(2, -10 * --t) + 2) + b;
  };

  const smoothScrollTo = (targetY, duration = 1000) => {
    const startY = window.pageYOffset;
    const distance = targetY - startY;
    if (Math.abs(distance) < 2) return;

    let startTime = null;
    const step = (timestamp) => {
      if (startTime === null) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const y = easeInOutExpo(elapsed, startY, distance, duration);
      window.scrollTo(0, y);
      if (elapsed < duration) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  };

  const initLoader = () => {
    let isActivated = false;
    const activate = () => {
      if (isActivated || !hasGSAP()) return;
      isActivated = true;

      const gsap = window.gsap;
      const loader = q(".page-loader");

      gsap.to(loader, {
        opacity: 0,
        y: -20,
        duration: 0.8,
        ease: "power3.inOut",
        onComplete: () => {
          loader.classList.add("hidden");
          document.body.classList.remove("is-loading");
          document.body.classList.add("is-loaded");
        },
      });
    };

    window.addEventListener(
      "load",
      () => {
        setTimeout(activate, 400);
      },
      { once: true },
    );

    setTimeout(activate, 2500);
  };

  const initNavbar = () => {
    const navbar = q(".navbar");
    const navToggle = q(".nav-toggle");
    const mobileMenu = q(".mobile-menu");
    const mobileOverlay = q("#mobile-menu-overlay");

    const setMenuOpen = (open) => {
      if (!mobileMenu || !navToggle || !mobileOverlay) return;
      mobileMenu.classList.toggle("open", open);
      navToggle.classList.toggle("active", open);
      mobileOverlay.classList.toggle("open", open);
      document.body.style.overflow = open ? "hidden" : "";
    };

    const handleScroll = () => {
      if (!navbar) return;
      navbar.classList.toggle("scrolled", window.pageYOffset > 60);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    navToggle?.addEventListener("click", () => {
      setMenuOpen(!mobileMenu?.classList.contains("open"));
    });

    mobileOverlay?.addEventListener("click", () => setMenuOpen(false));
    qa(".mobile-menu a").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });
  };

  const initSmoothScroll = () => {
    const anchors = qa('a[href*="#"], .hero-cta, .btn-scroll');

    anchors.forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const href = anchor.getAttribute("href") || anchor.dataset.target;
        if (!href || href === "#") return;

        let url;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }

        if (url.pathname !== window.location.pathname || !url.hash) return;

        const target = q(url.hash);
        if (!target) return;

        event.preventDefault();
        const y =
          target.getBoundingClientRect().top +
          window.pageYOffset -
          config.scrollOffset;

        smoothScrollTo(Math.max(0, y), 1100);
        window.history.replaceState(null, "", url.hash);
      });
    });
  };

  const initReveals = () => {
    // Basic reveals for simpler elements
    const revealTargets = qa(
      ".reveal:not(.stagger .card), .reveal-left, .reveal-right, .process-line",
    );
    if (revealTargets.length) {
      const revealObserver = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -5% 0px" },
      );
      revealTargets.forEach((target) => revealObserver.observe(target));
    }

    // Cinematic section scaling
    const sections = qa(".section, .stats-section");
    if (!sections.length || isReducedMotion()) return;

    sections.forEach((section) => section.classList.add("section-cinematic"));
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          entry.target.classList.toggle("is-active", entry.isIntersecting);
        });
      },
      { threshold: 0.15 },
    );
    sections.forEach((section) => sectionObserver.observe(section));
  };

  const initCounters = () => {
    const counterEls = qa("[data-counter]");
    if (!counterEls.length || !hasGSAP()) return;

    const gsap = window.gsap;

    counterEls.forEach((el) => {
      const source = el.dataset.target || el.textContent || "0";
      const numberMatch = source.match(/[\d.]+/);
      if (!numberMatch) return;

      const targetValue = parseFloat(numberMatch[0]);
      const suffix = source.replace(numberMatch[0], "");
      const decimals = numberMatch[0].includes(".")
        ? numberMatch[0].split(".")[1].length
        : 0;

      const obj = { val: 0 };

      gsap.to(obj, {
        val: targetValue,
        duration: 2.2,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 92%",
        },
        onUpdate: () => {
          el.textContent = obj.val.toFixed(decimals) + suffix;
        },
        onComplete: () => {
          const item = el.closest(".stat-item");
          if (item) {
            gsap.fromTo(
              item,
              { scale: 1 },
              {
                scale: 1.08,
                duration: 0.4,
                yoyo: true,
                repeat: 1,
                ease: "power2.inOut",
              },
            );
          }
        },
      });
    });
  };

  const typeWriter = (el, phrases, options = {}) => {
    if (!el || !phrases.length) return;

    if (isReducedMotion()) {
      el.textContent = phrases[0];
      return;
    }

    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;
    const typeSpeed = options.typeSpeed ?? 70;
    const deleteSpeed = options.deleteSpeed ?? 38;
    const pause = options.pause ?? 1700;
    const startDelay = options.startDelay ?? config.typingDelay;

    const step = () => {
      const phrase = phrases[phraseIndex];

      if (deleting) {
        charIndex -= 1;
        el.textContent = phrase.slice(0, Math.max(charIndex, 0));
      } else {
        charIndex += 1;
        el.textContent = phrase.slice(0, Math.min(charIndex, phrase.length));
      }

      let timeout = deleting ? deleteSpeed : typeSpeed;

      if (!deleting && charIndex >= phrase.length) {
        deleting = true;
        timeout = pause;
      } else if (deleting && charIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        timeout = 420;
      }

      window.setTimeout(step, timeout);
    };

    window.setTimeout(step, startDelay);
  };

  const initTyping = () => {
    const bodyTypingEl = q("[data-typing]");
    const heroTypingEl = q("[data-typing-headline]");

    if (bodyTypingEl?.dataset.typing) {
      const phrases = bodyTypingEl.dataset.typing
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      typeWriter(bodyTypingEl, phrases, {
        typeSpeed: 72,
        deleteSpeed: 38,
        pause: 1500,
      });
    }

    if (heroTypingEl?.dataset.typingHeadline) {
      const phrases = heroTypingEl.dataset.typingHeadline
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      typeWriter(heroTypingEl, phrases, {
        typeSpeed: 84,
        deleteSpeed: 45,
        pause: 1300,
        startDelay: 900,
      });
    }
  };

  const initScrollProgress = () => {
    const progressBar = q("#scroll-progress-bar");
    const backToTop = q("#back-to-top");

    const handleScroll = () => {
      const scrollTop =
        document.documentElement.scrollTop || document.body.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      if (progressBar) progressBar.style.width = `${progress}%`;
      if (backToTop) backToTop.classList.toggle("visible", scrollTop > 500);
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
  };

  const initBackToTop = () => {
    const backToTop = q("#back-to-top");
    if (!backToTop) return;

    backToTop.addEventListener("click", (event) => {
      event.preventDefault();
      smoothScrollTo(0, 850);
    });
  };

  const initCursorAndDepth = () => {
    const cursorGlow = q(".cursor-glow");
    const cursorDot = q(".cursor-dot");
    const spotlightEl = document.documentElement;
    const depthEls = qa("[data-depth]");

    if (
      isReducedMotion() ||
      isCoarsePointer() ||
      !cursorGlow ||
      !cursorDot ||
      !hasGSAP()
    ) {
      document.body.classList.remove("cursor-active", "cursor-hover");
      return;
    }

    const gsap = window.gsap;
    const xQuickGlow = gsap.quickTo(cursorGlow, "x", {
      duration: 0.45,
      ease: "power3",
    });
    const yQuickGlow = gsap.quickTo(cursorGlow, "y", {
      duration: 0.45,
      ease: "power3",
    });
    const xQuickDot = gsap.quickTo(cursorDot, "x", {
      duration: 0.15,
      ease: "power2",
    });
    const yQuickDot = gsap.quickTo(cursorDot, "y", {
      duration: 0.15,
      ease: "power2",
    });

    const interactiveTargets = qa(
      "a, button, .btn, input, textarea, select, [data-modal-target], .card, .nav-brand",
    );

    interactiveTargets.forEach((target) => {
      target.addEventListener("mouseenter", () => {
        document.body.classList.add("cursor-hover");
        gsap.to(cursorDot, { scale: 1.5, duration: 0.3 });
      });

      target.addEventListener("mouseleave", () => {
        document.body.classList.remove("cursor-hover");
        gsap.to(cursorDot, { scale: 1, duration: 0.3 });
      });
    });

    document.addEventListener(
      "mousemove",
      (event) => {
        const { clientX: x, clientY: y } = event;

        xQuickGlow(x);
        yQuickGlow(y);
        xQuickDot(x);
        yQuickDot(y);

        if (!document.body.classList.contains("cursor-active")) {
          document.body.classList.add("cursor-active");
        }

        const xp = (x / window.innerWidth) * 100;
        const yp = (y / window.innerHeight) * 100;

        spotlightEl.style.setProperty("--spotlight-x", `${xp}%`);
        spotlightEl.style.setProperty("--spotlight-y", `${yp}%`);

        const gridX = (xp - 50) * -0.28;
        const gridY = (yp - 50) * -0.28;
        spotlightEl.style.setProperty("--grid-shift-x", `${gridX}px`);
        spotlightEl.style.setProperty("--grid-shift-y", `${gridY}px`);

        depthEls.forEach((el) => {
          const depth = parseFloat(el.dataset.depth || "0.08");
          const dx = (xp - 50) * depth;
          const dy = (yp - 50) * depth;
          el.style.setProperty("--depth-x", `${dx}px`);
          el.style.setProperty("--depth-y", `${dy}px`);
        });
      },
      { passive: true },
    );

    // Initial positioning to avoid jump
    gsap.set([cursorGlow, cursorDot], {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  };

  const initCardTilt = () => {
    if (isReducedMotion() || isCoarsePointer() || !hasGSAP()) return;

    const cards = qa(".card");
    if (!cards.length) return;

    const gsap = window.gsap;

    cards.forEach((card) => {
      const xTo = gsap.quickTo(card, "--tilt-rotate-y", {
        duration: 0.5,
        ease: "power2.out",
      });
      const yTo = gsap.quickTo(card, "--tilt-rotate-x", {
        duration: 0.5,
        ease: "power2.out",
      });
      const sheenX = gsap.quickTo(card, "--sheen-x", {
        duration: 0.3,
        ease: "power2.out",
      });
      const sheenY = gsap.quickTo(card, "--sheen-y", {
        duration: 0.3,
        ease: "power2.out",
      });

      card.addEventListener("mousemove", (event) => {
        const { clientX, clientY } = event;
        const { left, top, width, height } = card.getBoundingClientRect();

        const x = (clientX - left) / width - 0.5;
        const y = (clientY - top) / height - 0.5;

        card.classList.add("is-tilting");
        xTo(x * 12);
        yTo(-y * 12);
        sheenX(`${(x + 0.5) * 100}%`);
        sheenY(`${(y + 0.5) * 100}%`);
      });

      card.addEventListener("mouseleave", () => {
        card.classList.remove("is-tilting");
        xTo(0);
        yTo(0);
      });
    });
  };

  const initMagneticButtons = () => {
    if (isReducedMotion() || isCoarsePointer() || !hasGSAP()) return;

    const gsap = window.gsap;

    qa("[data-magnetic]").forEach((button) => {
      const xTo = gsap.quickTo(button, "--magnetic-x", {
        duration: 0.8,
        ease: "elastic.out(1, 0.3)",
      });
      const yTo = gsap.quickTo(button, "--magnetic-y", {
        duration: 0.8,
        ease: "elastic.out(1, 0.3)",
      });

      button.addEventListener("mousemove", (event) => {
        const { clientX, clientY } = event;
        const { left, top, width, height } = button.getBoundingClientRect();
        const x = clientX - (left + width / 2);
        const y = clientY - (top + height / 2);

        xTo(x * 0.35);
        yTo(y * 0.35);
      });

      button.addEventListener("mouseleave", () => {
        xTo(0);
        yTo(0);
      });
    });
  };

  const initButtonRipples = () => {
    qa(".btn").forEach((button) => {
      button.addEventListener("click", (event) => {
        const rect = button.getBoundingClientRect();
        const ripple = document.createElement("span");
        const size = Math.max(rect.width, rect.height) * 1.9;
        ripple.className = "btn-ripple";
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left}px`;
        ripple.style.top = `${event.clientY - rect.top}px`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 760);
      });
    });
  };

  const initModals = () => {
    const modals = qa(".modal");
    if (!modals.length) return;

    const syncBodyLock = () => {
      if (q(".modal.is-open")) return;
      document.body.classList.remove("modal-open");
    };

    const closeModal = (modal) => {
      if (!modal) return;

      if (hasGSAP() && !isReducedMotion()) {
        const panel = q(".modal-panel", modal);
        window.gsap.to(panel, {
          y: 14,
          scale: 0.95,
          autoAlpha: 0,
          duration: 0.22,
          ease: "power2.out",
          onComplete: () => {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            syncBodyLock();
          },
        });
      } else {
        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");
        syncBodyLock();
      }
    };

    const openModal = (modal) => {
      if (!modal) return;
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("modal-open");

      if (hasGSAP() && !isReducedMotion()) {
        const panel = q(".modal-panel", modal);
        window.gsap.fromTo(
          panel,
          { y: 16, scale: 0.95, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.34, ease: "power3.out" },
        );
      }
    };

    qa("[data-modal-target]").forEach((trigger) => {
      trigger.addEventListener("click", (event) => {
        event.preventDefault();
        const id = trigger.getAttribute("data-modal-target");
        openModal(q(`#${id}`));
      });
    });

    qa("[data-modal-close]").forEach((closeBtn) => {
      closeBtn.addEventListener("click", () => {
        closeModal(closeBtn.closest(".modal"));
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const activeModal = q(".modal.is-open");
      if (activeModal) closeModal(activeModal);
    });
  };

  const initPageTransitions = () => {
    qa("a[href]").forEach((link) => {
      link.addEventListener("click", (event) => {
        const href = link.getAttribute("href");
        if (!href || href.startsWith("javascript:")) return;
        if (link.target === "_blank" || link.hasAttribute("download")) return;
        if (link.dataset.noTransition !== undefined) return;

        let url;
        try {
          url = new URL(href, window.location.href);
        } catch {
          return;
        }

        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.hash) return;

        event.preventDefault();
        document.body.classList.add("is-leaving");

        setTimeout(() => {
          window.location.href = url.href;
        }, config.pageLeaveDuration);
      });
    });

    window.addEventListener("pageshow", () => {
      document.body.classList.remove("is-leaving");
    });
  };

  const initHeroEntrance = () => {
    if (!hasGSAP() || isReducedMotion()) return;
    const gsap = window.gsap;

    const tl = gsap.timeline({
      defaults: { ease: "power4.out", duration: 1.2 },
    });

    tl.from(".hero-badge", { y: 30, opacity: 0, scale: 0.9 }, 0.4)
      .from(".hero-title", { y: 40, opacity: 0, stagger: 0.15 }, "-=0.9")
      .from(".hero-subtitle", { y: 30, opacity: 0 }, "-=1.1")
      .from(
        ".hero-actions .btn",
        { x: -25, opacity: 0, stagger: 0.1, duration: 1 },
        "-=1.2",
      )
      .from(".hero-quick-call", { opacity: 0, y: 15 }, "-=0.8")
      .from(
        ".hero-visual",
        { scale: 0.6, rotate: -8, opacity: 0, duration: 1.8, ease: "expo.out" },
        0.6,
      )
      .from(".navbar", { y: -20, opacity: 0, duration: 1 }, 0.8);
  };

  const initScrollEffects = () => {
    if (!hasGSAP() || isReducedMotion()) return;

    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

    const hero = q(".hero");
    if (hero) {
      const heroContent = q(".hero-content");
      const heroVisual = q(".hero-visual");
      const visualCore = q(".hero-visual-core");

      if (heroContent) {
        gsap.to(heroContent, {
          yPercent: 12,
          opacity: 0.4,
          filter: "blur(6px)",
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      if (heroVisual) {
        gsap.to(heroVisual, {
          yPercent: -24,
          rotate: 12,
          scale: 1.1,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      if (visualCore) {
        gsap.to(visualCore, {
          boxShadow: "0 0 80px rgba(34, 211, 238, 0.9)",
          duration: 2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }

    const staggerGroups = [
      { selector: ".services-grid .card", trigger: ".services-grid" },
      {
        selector: ".testimonials-grid .testimonial-card",
        trigger: ".testimonials-grid",
      },
      { selector: ".stats-grid .stat-item", trigger: ".stats-section" },
      { selector: ".process-step", trigger: ".process-steps" },
    ];

    staggerGroups.forEach((group) => {
      const items = qa(group.selector);
      if (!items.length) return;

      gsap.from(items, {
        opacity: 0,
        y: 48,
        scale: 0.95,
        rotateX: -10,
        duration: 1.1,
        stagger: 0.14,
        ease: "power3.out",
        scrollTrigger: {
          trigger: group.trigger,
          start: "top 85%",
        },
      });
    });

    // Parallax background items
    qa(".hero-glow-1, .hero-glow-2").forEach((glow, i) => {
      gsap.to(glow, {
        yPercent: i === 0 ? 30 : -25,
        ease: "none",
        scrollTrigger: {
          trigger: ".hero",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    });
  };

  const initContactForm = () => {
    const form = q("#contact-form");
    if (!form) return;

    qa(".form-input", form).forEach((input) => {
      input.addEventListener("invalid", (event) => {
        event.preventDefault();
        input.classList.add("invalid");
        setTimeout(() => input.classList.remove("invalid"), 600);
      });
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const button = q('button[type="submit"]', form);
      if (!button) return;

      const originalContent = button.innerHTML;
      button.disabled = true;
      button.innerHTML =
        '<span class="loading-spinner"></span><span>Sending...</span>';

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
        });
        const data = await response.json();

        if (!data.success)
          throw new Error(data.message || "Submission failed.");

        button.innerHTML = "<span>Sent!</span>";
        button.style.background = "var(--color-success)";
        showFlash("success", data.message || "Message delivered.");
        form.reset();
      } catch (error) {
        button.innerHTML = "<span>Failed</span>";
        button.style.background = "var(--color-error)";
        showFlash("error", error.message || "Something went wrong.");
      } finally {
        setTimeout(() => {
          button.innerHTML = originalContent;
          button.style.background = "";
          button.disabled = false;
        }, 2200);
      }
    });
  };

  const initFileUpload = () => {
    const zone = q("#drop-zone");
    const input = q("#file-input");
    const fileName = q("#file-name");
    if (!zone || !input) return;

    const updateLabel = () => {
      const file = input.files?.[0];
      if (!fileName) return;
      if (!file) {
        fileName.classList.add("hidden");
        fileName.textContent = "";
        return;
      }
      fileName.classList.remove("hidden");
      fileName.textContent = file.name;
    };

    zone.addEventListener("click", () => input.click());
    input.addEventListener("change", updateLabel);

    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      zone.addEventListener(eventName, (event) => event.preventDefault());
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      zone.addEventListener(eventName, () => zone.classList.add("dragover"));
    });

    ["dragleave", "drop"].forEach((eventName) => {
      zone.addEventListener(eventName, () => zone.classList.remove("dragover"));
    });

    zone.addEventListener("drop", (event) => {
      const files = event.dataTransfer?.files;
      if (!files || !files.length) return;
      input.files = files;
      updateLabel();
    });
  };

  const initFlashAutoDismiss = () => {
    qa("[data-auto-dismiss]").forEach((el, index) => {
      setTimeout(
        () => {
          el.style.opacity = "0";
          el.style.transform = "translateY(-8px)";
          setTimeout(() => el.remove(), 340);
        },
        4200 + index * 240,
      );
    });
  };

  const showFlash = (type, message) => {
    let container = q(".flash-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "flash-container";
      document.body.appendChild(container);
    }

    const alert = document.createElement("div");
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `<span>${message}</span>`;
    container.appendChild(alert);

    setTimeout(() => {
      alert.style.opacity = "0";
      alert.style.transform = "translateY(-10px)";
      setTimeout(() => alert.remove(), 320);
    }, 4200);
  };

  const init = () => {
    initLoader();
    initNavbar();
    initSmoothScroll();
    initReveals();
    initHeroEntrance();
    initCounters();
    initTyping();
    initScrollProgress();
    initBackToTop();
    initCursorAndDepth();
    initCardTilt();
    initMagneticButtons();
    initButtonRipples();
    initModals();
    initPageTransitions();
    initContactForm();
    initFileUpload();
    initFlashAutoDismiss();
    initScrollEffects();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
