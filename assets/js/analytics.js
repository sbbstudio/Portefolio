/* runeoverland.no — aggregate event counts, no visitor/session identity.
   Cloudflare Web Analytics remains responsible for country/device/referrer reports.
   No PostHog SDK, replay, autocapture, profiles, or consent UI is loaded. */
(function () {
  'use strict';
  try {
    var KEY = 'phc_w8gQPgCLTZkFrJcSHJnfDcmqvNr7damibbQVGfEFPXgE';
    /* Fail closed until Settings > Project > General > Discard IP data is verified.
       Client-side ip:false is deprecated and cannot enforce server IP disposal. */
    var POSTHOG_IP_DISCARD_VERIFIED = false;
    var ENDPOINT = 'https://eu.i.posthog.com/i/v0/e/';
    /* A single shared label for ALL visitors, not a browser/user identifier.
       Use total events in reports; unique users and session funnels are invalid. */
    var AGGREGATE_ID = 'portfolio-aggregate-v1';
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';

    /* Delete only the retired analytics keys, never unrelated site preferences.
       No stored values are read or sent. Old consent cannot re-enable recording. */
    function cleanStorage(storage) {
      var prefix = 'ph_' + KEY;
      for (var i = storage.length - 1; i >= 0; i--) {
        var key = storage.key(i);
        if (key === 'ro-consent' || key === 'ro-ref' ||
            key === prefix || key.indexOf(prefix + '_') === 0) storage.removeItem(key);
      }
    }
    try { cleanStorage(window.localStorage); } catch (e) {}
    try { cleanStorage(window.sessionStorage); } catch (e) {}
    try {
      var cookie = 'ph_' + KEY + '_posthog=; Max-Age=0; Path=/; SameSite=Lax';
      document.cookie = cookie;
      if (host === 'runeoverland.no' || host === 'www.runeoverland.no') {
        document.cookie = cookie + '; Domain=runeoverland.no';
      }
    } catch (e) {}

    if (!POSTHOG_IP_DISCARD_VERIFIED) return;
    if (isLocal && new URLSearchParams(location.search).get('ph') !== '1') return;
    if (navigator.globalPrivacyControl === true ||
        navigator.doNotTrack === '1' || window.doNotTrack === '1') return;

    /* Explicit public-page allowlist: never forward arbitrary paths, query
       strings, fragments, referral tags, form values, link text or email/phone. */
    var PAGES = {
      '/grid-video.html': 1, '/grid-sticky.html': 1, '/r2/': 1, '/r2/index.html': 1,
      '/nyme.html': 1, '/kaizen.html': 1, '/kaizen-ai.html': 1,
      '/legal-casework.html': 1, '/jelsa-hero.html': 1,
      '/how-i-work.html': 1, '/contact.html': 1
    };
    var page = location.pathname;
    if (!Object.prototype.hasOwnProperty.call(PAGES, page)) return;
    var CASES = { 'kaizen': 1, 'kaizen-ai': 1, 'nyme': 1, 'legal-casework': 1, 'jelsa-hero': 1, 'how-i-work': 1 };
    var EVENTS = {
      '$pageview': 1, 'mail_click': 1, 'phone_click': 1, 'pdf_download': 1,
      'contact_click': 1, 'case_open': 1, 'cta_click': 1,
      'contact_module_reached': 1, 'scroll_depth': 1
    };

    function cap(name, props) {
      try {
        if (!Object.prototype.hasOwnProperty.call(EVENTS, name)) return;
        var safe = {
          '$process_person_profile': false,
          '$geoip_disable': true,
          '$ip': null,
          '$current_url': 'https://runeoverland.no' + page,
          '$pathname': page,
          'analytics_mode': 'aggregate-v1'
        };
        /* Only finite, pre-defined dimensions may leave the page. */
        props = props || {};
        if (name === 'scroll_depth' && [25, 50, 75, 100].indexOf(props.depth) !== -1) safe.depth = props.depth;
        if (name === 'case_open' && Object.prototype.hasOwnProperty.call(CASES, props.case)) safe.case = props.case;
        if ((name === 'contact_click' || name === 'cta_click') &&
            ['nav', 'cta', 'footer', 'other'].indexOf(props.location) !== -1) safe.location = props.location;
        fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          keepalive: true,
          body: JSON.stringify({
            api_key: KEY, distinct_id: AGGREGATE_ID, event: name, properties: safe
          })
        }).catch(function () { /* blocked/offline: no retry identifiers or storage */ });
      } catch (e) { /* analytics must never break navigation */ }
    }

    cap('$pageview');
    document.addEventListener('click', function (ev) {
      try {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) return;
        var href = a.getAttribute('href') || '';
        if (/^mailto:/i.test(href)) { cap('mail_click'); return; }
        if (/^tel:/i.test(href)) { cap('phone_click'); return; }
        var url = new URL(href, location.href);
        var file = url.pathname.split('/').pop();
        var loc = a.closest('.nav') ? 'nav'
                : a.closest('.footer__nav') ? 'footer'
                : a.closest('[class$="__cta"]') ? 'cta' : 'other';
        if (/\.pdf$/i.test(file)) { cap('pdf_download'); return; }
        if (url.origin === location.origin) {
          if (file === 'contact.html') { cap('contact_click', { location: loc }); return; }
          var m = /^(.+)\.html$/.exec(file);
          if (m && Object.prototype.hasOwnProperty.call(CASES, m[1])) {
            cap('case_open', { case: m[1] }); return;
          }
        }
        if (loc === 'cta') cap('cta_click', { location: loc });
      } catch (e) {}
    }, true);

    function watchContact() {
      try {
        var el = document.getElementById('contact') || document.querySelector('.contact-reveal');
        if (!el || !('IntersectionObserver' in window)) return;
        var io = new IntersectionObserver(function (entries) {
          for (var i = 0; i < entries.length; i++) {
            if (entries[i].isIntersecting && entries[i].intersectionRatio >= 0.5) {
              cap('contact_module_reached'); io.disconnect(); return;
            }
          }
        }, { threshold: 0.5 });
        io.observe(el);
      } catch (e) {}
    }

    /* Each reached threshold is counted once per page load, not per visitor. */
    var marks = [25, 50, 75, 100], fired = {}, ticking = false;
    function depth() {
      ticking = false;
      try {
        var d = document.documentElement;
        var total = Math.max(d.scrollHeight, document.body ? document.body.scrollHeight : 0) - window.innerHeight;
        if (total <= 0) return; // a non-scrollable page is not four scroll events
        var pct = Math.min(100, ((window.scrollY || d.scrollTop) / total) * 100);
        for (var i = 0; i < marks.length; i++) {
          if (pct >= marks[i] && !fired[marks[i]]) {
            fired[marks[i]] = true; cap('scroll_depth', { depth: marks[i] });
          }
        }
      } catch (e) {}
    }
    function onScroll() {
      if (!ticking) { ticking = true; requestAnimationFrame(depth); }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    function ready() { watchContact(); depth(); }
    if (document.readyState === 'complete') ready();
    else window.addEventListener('load', ready);
  } catch (e) { /* analytics must never break the site */ }
})();
