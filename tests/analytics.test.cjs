const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/analytics.js'), 'utf8');
const key = 'phc_w8gQPgCLTZkFrJcSHJnfDcmqvNr7damibbQVGfEFPXgE';

function storage(seed = {}) {
  const values = new Map(Object.entries(seed));
  return { values, get length() { return values.size; }, key(i) { return [...values.keys()][i]; },
    removeItem(k) { values.delete(k); }, getItem() { throw Error('Must not read values'); },
    setItem() { throw Error('Must not persist analytics'); } };
}
function run({ verified = false, url = 'https://runeoverland.no/grid-video.html?ref=PRIVATE&email=PRIVATE#PRIVATE', consent, deniedStorage = false, dnt, gpc, failFetch = false, shortPage = false } = {}) {
  const requests = [], cookies = [], docEvents = {}, winEvents = {}, observations = [];
  const local = storage({ 'ro-consent': consent || 'yes', ['ph_' + key + '_posthog']: 'OLD_ID', preference: 'keep' });
  const session = storage({ 'ro-ref': 'PRIVATE', ['ph_' + key + '_posthog_session_id']: 'OLD_SESSION', splashSeen: '1' });
  const document = { readyState: 'complete', documentElement: { scrollHeight: shortPage ? 900 : 1900, scrollTop: 0 },
    body: { scrollHeight: shortPage ? 900 : 1900 }, getElementById(id) { assert.equal(id, 'contact'); return {}; },
    querySelector() { return null; }, addEventListener(n, cb) { docEvents[n] = cb; },
    createElement() { throw Error('Must not insert SDK or consent UI'); }, set cookie(v) { cookies.push(v); } };
  const window = { innerHeight: 900, scrollY: 0, addEventListener(n, cb) { winEvents[n] = cb; },
    get localStorage() { if (deniedStorage) throw Error('Denied'); return local; },
    get sessionStorage() { if (deniedStorage) throw Error('Denied'); return session; } };
  function IntersectionObserver(cb) { this.observe = () => observations.push(cb); this.disconnect = () => {}; }
  window.IntersectionObserver = IntersectionObserver;
  const context = { window, document, location: new URL(url), URL, URLSearchParams,
    navigator: { doNotTrack: dnt, globalPrivacyControl: gpc }, IntersectionObserver,
    requestAnimationFrame(cb) { cb(); }, fetch(endpoint, options) {
      requests.push({ endpoint, options, data: JSON.parse(options.body) });
      return failFetch ? Promise.reject(Error('Offline')) : Promise.resolve({ ok: true });
    } };
  vm.runInNewContext(verified ? source.replace('var POSTHOG_IP_DISCARD_VERIFIED = false;', 'var POSTHOG_IP_DISCARD_VERIFIED = true;') : source, context);
  function click(href, location = 'cta') {
    const a = { getAttribute() { return href; }, closest(selector) {
      return (location === 'nav' && selector === '.nav') || (location === 'footer' && selector === '.footer__nav') || (location === 'cta' && selector === '[class$="__cta"]') ? {} : null;
    } };
    docEvents.click?.({ target: { closest() { return a; } } });
  }
  return { requests, cookies, local, session, window, docEvents, winEvents, observations, click };
}

test('shipping default fails closed; old yes/no consent cannot start requests or replay', () => {
  for (const consent of ['yes', 'no', 'unknown']) {
    const r = run({ consent });
    assert.equal(r.requests.length, 0);
    assert.deepEqual(Object.keys(r.docEvents), []);
    assert.equal(r.window.posthog, undefined);
    assert.deepEqual([...r.local.values], [['preference', 'keep']]);
    assert.deepEqual([...r.session.values], [['splashSeen', '1']]);
    assert.ok(r.cookies.every(c => c.startsWith('ph_' + key + '_posthog=; Max-Age=0;')));
  }
});
test('aggregate sender uses shared label, no credentials/referrer, no query or identifiers', () => {
  const r = run({ verified: true });
  r.click('mailto:PRIVATE@example.test?subject=PRIVATE');
  r.click('tel:PRIVATE');
  r.click('/assets/PRIVATE.pdf?token=PRIVATE');
  r.click('/contact.html?email=PRIVATE', 'nav');
  r.click('/nyme.html?ref=PRIVATE');
  r.click('https://external.test/PRIVATE?email=PRIVATE');
  assert.deepEqual(r.requests.map(x => x.data.event), ['$pageview', 'mail_click', 'phone_click', 'pdf_download', 'contact_click', 'case_open', 'cta_click']);
  for (const { data, options } of r.requests) {
    assert.equal(data.distinct_id, 'portfolio-aggregate-v1');
    assert.equal(data.properties.$process_person_profile, false);
    assert.equal(data.properties.$geoip_disable, true);
    assert.equal(data.properties.$ip, null);
    assert.equal(options.credentials, 'omit');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.equal(options.keepalive, true);
    assert.doesNotMatch(options.body, /PRIVATE|session_id|device_id|user_agent|\$set|\$snapshot/);
  }
  const other = run({ verified: true, url: 'https://runeoverland.no/nyme.html' });
  assert.equal(other.requests[0].data.distinct_id, r.requests[0].data.distinct_id);
});
test('no events from unknown pages, preview by default, DNT or GPC', () => {
  for (const options of [{ url: 'https://runeoverland.no/PRIVATE' }, { url: 'https://runeoverland.no/index.html' }, { url: 'http://127.0.0.1:8768/grid-video.html' }, { dnt: '1' }, { gpc: true }]) {
    assert.equal(run({ verified: true, ...options }).requests.length, 0);
  }
  assert.equal(run({ verified: true, url: 'http://127.0.0.1:8768/grid-video.html?ph=1' }).requests.length, 1);
});
test('scroll thresholds count once, only when reached, never on a non-scrollable page', () => {
  const r = run({ verified: true });
  for (const scrollY of [249, 250, 499, 500, 749, 750, 999, 1000, 0, 1000]) {
    r.window.scrollY = scrollY; r.winEvents.scroll();
  }
  assert.deepEqual(r.requests.filter(x => x.data.event === 'scroll_depth').map(x => x.data.properties.depth), [25, 50, 75, 100]);
  assert.equal(run({ verified: true, shortPage: true }).requests.length, 1);
});
test('contact section counts only at half visibility; no form/input listeners', () => {
  const r = run({ verified: true });
  r.observations[0]([{ isIntersecting: true, intersectionRatio: 0.1 }]);
  assert.equal(r.requests.length, 1);
  r.observations[0]([{ isIntersecting: true, intersectionRatio: 0.5 }]);
  assert.equal(r.requests[1].data.event, 'contact_module_reached');
  assert.deepEqual(Object.keys(r.docEvents), ['click']);
});
test('storage denial and offline failures do not break the page', async () => {
  assert.doesNotThrow(() => run({ deniedStorage: true }));
  const r = run({ verified: true, deniedStorage: true, failFetch: true });
  assert.doesNotThrow(() => r.click('/contact.html'));
  await new Promise(resolve => setImmediate(resolve));
});
