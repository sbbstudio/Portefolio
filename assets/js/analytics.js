/* runeoverland.no — analytics (PostHog EU, consent-gated session replay)
   Delt av alle publiserte sider. Ingen deps. Alt i try/catch:
   blokkeres PostHog (adblock) skal siden fungere som før.        */
(function () {
  'use strict';
  try {
    var KEY = 'phc_w8gQPgCLTZkFrJcSHJnfDcmqvNr7damibbQVGfEFPXgE';
    var HOST = 'https://eu.i.posthog.com';
    var UI_HOST = 'https://eu.posthog.com';
    var CONSENT_KEY = 'ro-consent';
    var REF_KEY = 'ro-ref';

    var params = new URLSearchParams(location.search);
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1';
    if (isLocal && params.get('ph') !== '1') return;

    /* ── storage helpers (Safari private mode etc. kan kaste) ── */
    function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
    function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

    var consent = lsGet(CONSENT_KEY); // 'yes' | 'no' | null

    /* ── 1. PostHog array-snippet (offisielt) ── */
    !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

    /* NB: array.js bytter ut window.posthog med ekte instans etter last —
       slå alltid opp ved kalltid, aldri cache stub-referansen.        */
    function ph() { return window.posthog; }
    var allowed = consent === 'yes';

    ph().init(KEY, {
      api_host: HOST,
      ui_host: UI_HOST,
      /* uten samtykke: ingen cookies/localStorage-ID, ingen opptak */
      persistence: allowed ? 'localStorage+cookie' : 'memory',
      disable_session_recording: !allowed,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      ip: false,                 /* posthog-js: ikke lagre klient-IP på events */
      disable_surveys: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: 'input, textarea, [data-mask]'
      }
    });

    /* ── 5. ref-tagging (?ref=juris) — super property + overlever navigasjon ── */
    try {
      var ref = params.get('ref');
      if (ref) { ref = String(ref).slice(0, 64); ssSet(REF_KEY, ref); }
      else ref = ssGet(REF_KEY);
      if (ref) ph().register({ ref: ref });
    } catch (e) {}

    /* ── 3. samtykke ── */
    function grant() {
      lsSet(CONSENT_KEY, 'yes');
      try {
        ph().set_config({ persistence: 'localStorage+cookie', disable_session_recording: false });
        ph().startSessionRecording();
        ph().capture('consent_given');
      } catch (e) {}
    }
    function deny() {
      lsSet(CONSENT_KEY, 'no');
      try { ph().capture('consent_declined'); } catch (e) {}
    }

    /* ── 4. samtykkestripe ── */
    function mountBanner() {
      if (document.getElementById('ro-consent')) return;
      var css = document.createElement('style');
      css.textContent =
        '#ro-consent{position:fixed;left:var(--pad,10px);right:var(--pad,10px);bottom:var(--pad,10px);' +
        'z-index:60;box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;' +
        'gap:8px 2.5ch;padding:14px var(--cell,16px);background:var(--ground,#000);' +
        'border-top:var(--hair,1px) solid var(--line,rgba(255,255,255,.16));' +
        'font-family:inherit;font-size:var(--t-fine,.75rem);line-height:1.4;letter-spacing:.14em;text-transform:uppercase;' +
        'color:var(--ink-2,rgba(255,255,255,.52));}' +
        '#ro-consent p{margin:0;}' +
        '#ro-consent .ro-consent__act{display:flex;gap:2.5ch;flex:none;}' +
        '#ro-consent button{appearance:none;-webkit-appearance:none;background:none;border:0;border-radius:0;padding:0;margin:0;' +
        'font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--ink,#fff);cursor:pointer;' +
        'transition:color .3s var(--ez,ease);}' +
        '#ro-consent button:hover,#ro-consent button:focus-visible{color:var(--ink-2,rgba(255,255,255,.52));outline:0;}' +
        '@media (prefers-reduced-motion:reduce){#ro-consent,#ro-consent button{transition:none;}}';
      document.head.appendChild(css);

      var bar = document.createElement('div');
      bar.id = 'ro-consent';
      bar.setAttribute('role', 'region');
      bar.setAttribute('aria-label', 'Privacy');
      var p = document.createElement('p');
      p.textContent = 'This site records anonymous visits to improve it. Allow session recording?';
      var act = document.createElement('div');
      act.className = 'ro-consent__act';
      var yes = document.createElement('button');
      yes.type = 'button'; yes.textContent = 'Allow';
      var no = document.createElement('button');
      no.type = 'button'; no.textContent = 'Decline';
      act.appendChild(yes); act.appendChild(no);
      bar.appendChild(p); bar.appendChild(act);
      document.body.appendChild(bar);

      function close() { try { bar.parentNode.removeChild(bar); } catch (e) {} }
      yes.addEventListener('click', function () { grant(); close(); });
      no.addEventListener('click', function () { deny(); close(); });
    }
    if (consent !== 'yes' && consent !== 'no') {
      if (document.body) mountBanner();
      else document.addEventListener('DOMContentLoaded', mountBanner);
    }

    /* ── 6. events ── */
    function cap(name, props) { try { ph().capture(name, props || {}); } catch (e) {} }
    function base(href) {
      return String(href || '').split('#')[0].split('?')[0].split('/').pop();
    }

    var CASES = { 'kaizen': 1, 'kaizen-ai': 1, 'nyme': 1, 'legal-casework': 1, 'jelsa-hero': 1, 'how-i-work': 1 };

    document.addEventListener('click', function (ev) {
      try {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (/^mailto:/i.test(href)) { cap('mail_click'); return; }
        if (/^tel:/i.test(href)) { cap('phone_click'); return; }
        var file = base(href);
        if (/\.pdf$/i.test(file)) { cap('pdf_download', { file: file }); return; }
        if (/contact\.html$/i.test(file)) {
          var loc = a.closest('.nav') ? 'nav'
                  : a.closest('.contact__cta') ? 'cta'
                  : a.closest('.footer__nav') ? 'footer' : 'other';
          cap('contact_click', { location: loc });
          return;
        }
        var m = /^(.+)\.html$/i.exec(file);
        if (m && CASES[m[1]]) cap('case_open', { case: m[1] });
      } catch (e) {}
    }, true);

    /* contact_module_reached — én gang per sidevisning */
    function watchContact() {
      try {
        var el = document.getElementById('contact') || document.querySelector('.contact-reveal');
        if (!el || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting) { cap('contact_module_reached'); io.disconnect(); return; }
          }
        }, { threshold: 0.5 });
        io.observe(el);
      } catch (e) {}
    }

    /* scroll_depth 25/50/75/100 — én gang hver */
    var marks = [25, 50, 75, 100], fired = {}, ticking = false;
    function depth() {
      ticking = false;
      try {
        var d = document.documentElement;
        var total = Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
        var pct = total <= 0 ? 100 : Math.min(100, Math.round(((window.scrollY || d.scrollTop) / total) * 100));
        for (var i = 0; i < marks.length; i++) {
          if (pct >= marks[i] && !fired[marks[i]]) { fired[marks[i]] = true; cap('scroll_depth', { depth: marks[i] }); }
        }
      } catch (e) {}
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(depth); } }
    window.addEventListener('scroll', onScroll, { passive: true });

    function ready() { watchContact(); depth(); }
    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready);
  } catch (e) { /* analytics må aldri knekke siden */ }
})();
