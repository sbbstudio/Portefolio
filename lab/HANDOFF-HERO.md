# HANDOFF — HERO-MEKANIKK (justgowiththeflow)

**Sak:** KAIZEN Studio Landing → hero-mekanikk som håndverksbevis
**Arbeidstre:** `~/KAIZEN-wt-hero-ab` · branch `feature/hero-ab-test` · base `004de25`
**Filnavn med vilje ikke `HANDOFF-CODEX.md`** — det navnet ble skrevet over av en parallell Codex-sesjon på StickyScroll3DStack. Ett spor, ett filnavn.

**Ikke bland med:** HID-20260806-2015-004 / StickyScroll3DStack / PR #70. Den saken har eget arbeidstre: `/private/tmp/kz-sticky-scroll-004` (`fix/sticky-scroll-3d-stack-v2`). Rør den ikke herfra.

---

## Authority (CEO, 2026-08-07)

- **Ingen plagiat-brems.** Dekoding av en mekanikk og gjenoppbygging som egen komponent er normalt håndverk. Strukturell 1:1 under bygging er et uttrykt krav; sluttproduktet publiseres ikke 1:1.
- **Ingen governance-gate.** Fri bygging.
- **Runtime-deps tillatt.** GSAP, ScrollTrigger, Lenis — vendret lokalt i `lab/vendor/`.
- **Ingen fabrikerte produktflater.** Vi mangler ekte agentskjermer/logger/resultater. Ærlige placeholders.

## Isolasjonsregel (ikke-forhandlingsbar)

`lab/` er frittstående. Ingen import fra `catalog/` eller `packages/design-system/`. Ingen dev-harness, målerail, annotasjon eller grid-overlay. Åpnes rett fra disk: `open lab/index.html`.

Grunn: forrige runde ble rendret inne i KAIZEN-siden, arvet global spacing og typografi, og var umulig å bedømme. Den flaten er lagt ned (`catalog/app/side/kaizen-root-7/` og `catalog/app/preview/` ligger i scratchpad).

## Verifisert mekanikk

Kilde er uminifisert. Hero-ScrollTriggeren står i `assets/js/index.js` linje 1655–1758. Verifisert i kildekode **og** målt i live render på seks scroll-posisjoner.

**CEOs 80vw/60vw-beskrivelse er avkreftet.** Ingen tre skalerende kort. Det er én fast video-kolonne og en hvit L-formet maske (logoblokk + `center-tile`) som feier av den mot høyre.

- Ingen `pin`. Ren CSS: `.section-wrap-home-header { height: 300vh }` + `.section-home-header { position: sticky; top: 0 }`. Neste seksjon `margin-top: -100vh`.
- ScrollTrigger: `start "0% 0%"` → `end "200% 0%"`, `scrub: 0`. Timeline-lengde 2.0.
- Lenis `{ duration: 1 }` driver `ScrollTrigger.update` via `gsap.ticker`. All mykhet kommer derfra, ikke fra scrub.
- **Alle scrub-tweens `ease: "none"`.**

Fase A (timeline 0→1.25 = scroll 0→125vh):
- `.col-logo-inner` `xPercent 0 → 100` (målt 0 → 525.22px = egen bredde)
- `.center-tile` `scaleX 0.5 → 1`, **`transform-origin: right`** ← hele illusjonen
- `.row-reel figure` `scale 1 → 1.1`
- `.magnetic-overlay` `width 130% → 100%` (1024 → 788px)
- `.floating-number` clip-path-wipe venstre kant `0% → 100%`

Fase B (timeline 1→2 = scroll 100vh→200vh):
- `.overlay-dark` `opacity 0 → 1` (målt 0.25 @1125px, 0.50 @1350, 1.00 @1800)

Geometri: video-kolonne `calc(50vw - var(--gap) * 0.5)` (788px @1600). `--gap = title-size * 0.2` (24px @1600).
Mobil ≤1024px: mekanikken koblet ut — logorad og floating-number `display:none`, seksjonen ikke sticky.

**Felle:** `.row-reel` står midt i DOM-en, men er `position:absolute; inset:0` på desktop og ligger visuelt bakerst. Bygging etter DOM-rekkefølge gir feil komposisjon — det var nøyaktig feilen i første forsøk.

## Research

- `scratchpad/RESEARCH-flow-hero-mechanic.md` — mekanikken, med kode for både GSAP+Lenis og vanilla React (scroll → rAF → `--p`, `--a = clamp01(p/0.625)`, `--b = clamp01((p-0.5)/0.5)`).
- `scratchpad/RESEARCH-design-system-practice.md` — hvorfor alt blir flatt: `tokens.css` eier spacing/skala/rytme og temaene får bare bytte farge og font. Anbefaling: seksjoner blir integrerte og eier egen skala; bare primitiver forblir strengt tema-portable.

## Verifiseringsmetode (viktig)

Playwrights bundlede chromium krasjer med SIGTRAP i dette miljøet. **Systemets egen Chrome fungerer:**

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --screenshot=<ut>.png --window-size=1600,900 --virtual-time-budget=5000 \
  "file:///Users/runeoverland/KAIZEN-wt-hero-ab/lab/index.html"
```

Bruk den. Ikke rapporter «kan ikke verifisere».

## Status

- Bygget i `lab/`: 1:1-variant + tre varianter, GSAP/ScrollTrigger/Lenis vendret lokalt.
- Rettet: ubalansert `calc()` i `hero-lab.css` (manglet én `)`) drepte alt etter linje 105 — siden rendret helt ustylet. Fikset og render-verifisert.
- **Ikke verifisert ennå:** scroll-mekanikken i bevegelse (skjermdump ved flere scroll-posisjoner), og sammenligning mot referansen.
- Lenis i lab er 1.0.42 mot kildens 1.2.3 — mest sannsynlige årsak hvis mykheten føles annerledes.
- Ingenting committet. Alt dirty på `feature/hero-ab-test`.
