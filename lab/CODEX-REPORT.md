# CODEX REPORT — section 5 hero mekanikk (korrigert mot forskning)

## 1) Kilder

- [RESEARCH-flow-hero-mechanic.md](/private/tmp/claude-501/-Users-runeoverland/c5f50a52-e76d-4768-ac88-3b1193949c0f/scratchpad/RESEARCH-flow-hero-mechanic.md) (verifisert kjerne-mekanikk)
- [RESEARCH-design-system-practice.md](/private/tmp/claude-501/-Users-runeoverland/c5f50a52-e76d-4768-ac88-3b1193949c0f/scratchpad/RESEARCH-design-system-practice.md) (designsystem-implikasjoner)

## 2) 1:1-variant i `lab/` — verifiserte justeringer

Status i `lab/` nå:

- [VERIFISERT] Wrapper-struktur er endret til ren CSS-løsning (`height: 300vh`, `.section-home-header` sticky + `top: 0`, `margin-top: -100vh` på neste `.section`) uten `pin: true`.
- [VERIFISERT] Tidslinje er satt til fase A `duration: 1.25` og overlay-fase starter på `1` med `duration: 1`, dvs. total length `2.0`.
- [VERIFISERT] `.magnetic-overlay` animasjon er rettet fra `.magnetic-inner` til `.magnetic-overlay`, med start `130%` (evt. `data-magnetic-width-start`) og slutt `100%`.
- [VERIFISERT] `.center-tile` har fortsatt `transform-origin: right`.
- [VERIFISERT] Video-kolonne er `width: calc(50vw - (var(--gap) * 0.5))` på desktop.
- [VERIFISERT] `.row-reel` er `position: absolute; inset: 0` på desktop og holder korrekt lagrekkefølge mot teksten/logo.
- [VERIFISERT] Mobil-atferd (< =1024px): mekanikk kobles ut via `prefers-reduced-motion` + `matchMedia`-grening; `.row-logo` og `.floating-number` `display:none`; seksjonen er ikke sticky.
- [VERIFISERT] Alle scrub-tweens er `ease: "none"`, smoothing kommer fra Lenis `duration: 1` via `gsap.ticker`.

Implementerte filer:
- [lab/index.html](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/index.html)
- [lab/hero-lab.css](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/hero-lab.css)
- [lab/hero-lab.js](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/hero-lab.js)

## 3) Lokalt bibliotek (uten CDN)

- [VERIFISERT] `lab/index.html` peker nå til lokale filer i `[lab/vendor](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/vendor/):`
  - [lab/vendor/gsap.min.js](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/vendor/gsap.min.js)
  - [lab/vendor/ScrollTrigger.min.js](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/vendor/ScrollTrigger.min.js)
  - [lab/vendor/lenis.min.js](/Users/runeoverland/KAIZEN-wt-hero-ab/lab/vendor/lenis.min.js)
- [VERIFISERT] Siden er dermed kjørbar uten nett når åpnet direkte fra disk.

## 4) Variant 02–04

- [VERIFISERT] Alle tre varianter bruker samme grunnmekanikk (struktur, kjerne-timelignende, scrub/linje-easing, Lenis-styrt mykhet).
- [VERIFISERT] Variant-spesifikke avvik er begrenset til data-attributter (f.eks. omvendt logo-reise, alternative varigheter/verdier).
- [ANTATT] De eksakte variantverdiene er pedagogiske variasjoner og ikke målt mot kilde i denne runden.

## 5) Notater fra design-system-forsking

`RESEARCH-design-system-practice.md` endrer hvordan disse seksjonene skal inn i DS:
- [VERIFISERT] Seksjons-tung scroll-mekanikk bør klassifiseres som art-directed klasse (se “modular” vs “integrated” skille), altså egen seksjonstype med egne rytmer/verdier fremfor strengt reusable core-tokener.
- [VERIFISERT] `tokens.css` bør fortsatt eie grunngrammatikk, mens art-directed seksjoner trenger egne kontraktsregler (skala, bevegelseslogikk, overlay/scroll-risiko).
- [VERIFISERT] Preview-miljø må kunne isolere sekvenser fra global app-kontekst (route-group/isolert frame), ellers forsvinner verdi i visuell kvalitetssjekk.
- [ANTATT] Valgt “motion-stack” er ikke ferdig implementert i repo; rapporten peker mot to-lagsmodell (CSS scroll-driven der mulig + GSAP/ScrollTrigger for komplekse sekvenser).

## 6) Verifisert vs antatt (oversikt)

- [VERIFISERT] Mekanisk baseline (struktur, timeline, easing, breakpoints, kolonnebredder, overlay-logikk, offload under mobile).
- [VERIFISERT] Lokale bibliotek i `lab/vendor` og CDN-fjerning.
- [VERIFISERT] Rapportstruktur og kildehenvisninger oppdatert.
- [ANTATT] Korrekte “optimaliseringer” av de tre andre variantene utover kjernemekanikk (forventet design-intensjon, ikke ny kilde-måling).
- [ANTATT] Exakt Lenis-version i kilde (1.2.3) vs lokal lab-versjon (1.0.42) har ikke blitt målt for visuelle sideeffekter i denne korrigerte runden.
