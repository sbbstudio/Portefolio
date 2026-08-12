const ANIM_NUMBERS = {
   durationDefault: 1.47,
   durationDefaultFaster: 1.2,
   staggerPrimary: 0.07
};

function setViewportHeight() {
   const vh = window.innerHeight * 0.01;
   document.documentElement.style.setProperty('--vh-in-px', `${vh}px`);
}

function initLenis() {
   if (!window.Lenis) return;

   const lenis = new Lenis({ duration: 1 });
   lenis.on('scroll', ScrollTrigger.update);
   gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
   });
   gsap.ticker.lagSmoothing(0);
}

function getNumeric(value, fallback) {
   const parsed = parseFloat(value);
   return Number.isFinite(parsed) ? parsed : fallback;
}

function initHeroMatchMedia() {
   if (!window.gsap || !window.ScrollTrigger) return;

   if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.matchMedia({
         "(min-width: 1025px)": () => {
            initHeroSectionAnimations();
         }
      });
   }
}

function initHeroSectionAnimations() {
   const targetElementNav = gsap.utils.toArray('.main-nav-bar .nav-service, .main-nav-bar .logo-click');

   gsap.set(targetElementNav, {
      rotate: 0.001,
      yPercent: 125
   });

   document.querySelectorAll('.section-wrap-home-header').forEach((wrap) => {
      const triggerElement = wrap.querySelector('.section-home-header');
      const targetElementDarkOverlay = wrap.querySelector('.overlay-dark');
      const targetElementTileLogo = wrap.querySelector('.col-logo-inner');
      const targetElementTileCenter = wrap.querySelector('.center-tile');
      const targetElementFloatingNumber = wrap.querySelector('.floating-number');
      const targetElementMagneticInner = wrap.querySelector('.magnetic-overlay');
      const targetElementFigure = wrap.querySelector('.row-reel figure');

      const durationFirstScroll = getNumeric(wrap.dataset.durationFirstScroll, 1.25);
      const centerScaleXStart = getNumeric(wrap.dataset.centerScaleStart, 0.5);
      const centerScaleXEnd = getNumeric(wrap.dataset.centerScaleEnd, 1);
      const logoXStart = getNumeric(wrap.dataset.logoXStart, 0);
      const logoXEnd = getNumeric(wrap.dataset.logoXEnd, 100);
      const figureScaleStart = getNumeric(wrap.dataset.figureScaleStart, 1);
      const figureScaleEnd = getNumeric(wrap.dataset.figureScaleEnd, 1.1);
      const magneticWidthStart = wrap.dataset.magneticWidthStart || '130%';
      const magneticWidthEnd = wrap.dataset.magneticWidthEnd || '100%';
      const overlayDuration = getNumeric(wrap.dataset.darkOverlayDuration, 1);
      const triggerStart = wrap.dataset.triggerStart || '0% 0%';
      const triggerEnd = wrap.dataset.triggerEnd || '200% 0%';
      const scrubValue = wrap.hasAttribute('data-scrub') ? getNumeric(wrap.dataset.scrub, 0) : 0;

      if (targetElementMagneticInner) {
         gsap.set(targetElementMagneticInner, { width: magneticWidthStart });
      }

      const tl = gsap.timeline({
         scrollTrigger: {
            trigger: triggerElement,
            start: triggerStart,
            end: triggerEnd,
            scrub: scrubValue,
            markers: false,
            onEnterBack: () => headerEnter(),
            onLeave: () => headerLeave()
         }
      });

      tl.fromTo(
         targetElementTileLogo,
         { xPercent: logoXStart },
         {
            duration: durationFirstScroll,
            xPercent: logoXEnd,
            ease: 'none'
         }
      );

      tl.fromTo(
         targetElementTileCenter,
         { scaleX: centerScaleXStart },
         {
            duration: durationFirstScroll,
            scaleX: centerScaleXEnd,
            ease: 'none'
         },
         0
      );

      tl.fromTo(
         targetElementFloatingNumber,
         { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' },
         {
            duration: durationFirstScroll,
            clipPath: 'polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)',
            ease: 'none'
         },
         0
      );

      tl.fromTo(
         targetElementFigure,
         { scale: figureScaleStart, rotate: 0.001 },
         {
            duration: durationFirstScroll,
            scale: figureScaleEnd,
            rotate: 0.001,
            ease: 'none'
         },
         0
      );

      tl.to(
         targetElementMagneticInner,
         {
            width: magneticWidthEnd,
            duration: durationFirstScroll,
            rotate: 0.001,
            ease: 'none'
         },
         0
      );

      tl.fromTo(
         targetElementDarkOverlay,
         { opacity: 0 },
         {
            duration: overlayDuration,
            opacity: 1,
            ease: 'none'
         },
         1
      );

      function headerEnter() {
         gsap.to(targetElementNav, {
            opacity: 0,
            duration: 0.1,
            ease: 'none'
         });
      }

      function headerLeave() {
         gsap.fromTo(
            targetElementNav,
            { opacity: 1, rotate: 0.001, yPercent: 125 },
            {
               rotate: 0.001,
               yPercent: 0,
               duration: ANIM_NUMBERS.durationDefault,
               stagger: ANIM_NUMBERS.staggerPrimary * 2,
               ease: 'power2.out'
            }
         );
      }
   });
}

function init() {
   setViewportHeight();
   window.addEventListener('resize', setViewportHeight);
   initLenis();
   initHeroMatchMedia();
}

window.addEventListener('DOMContentLoaded', init);
