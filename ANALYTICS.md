# Portfolio analytics

The portfolio no longer loads the PostHog JavaScript SDK, session replay, autocapture, surveys or a consent banner. Previous consent cannot re-enable recording. Only the retired portfolio analytics storage keys/cookies are removed; unrelated site preferences remain intact.

## Active measurement

Existing Cloudflare Web Analytics embeds are retained. They provide country, device type, browser/OS, referral host, page traffic and performance metrics. Custom click/scroll events are not supported by Cloudflare Web Analytics. Its dashboard and server-side retention settings have not been independently audited in this patch.

## PostHog event counts: disabled pending server setting verification

`POSTHOG_IP_DISCARD_VERIFIED` in `assets/js/analytics.js` intentionally defaults to `false`. There are no PostHog requests in the shipping default, including on localhost with `?ph=1` and for visitors who previously accepted recording.

Before enabling: verify **Settings → Project → General → IP data capture configuration → Discard IP data** for the existing EU project. The PostHog SDK now documents `ip: false` as ineffective; client flags are not a substitute for this server control. Also review applicable retention, transformations and privacy disclosure before release. Do not claim complete anonymity or blanket exemption from consent based only on this client code.

After that verification, the prepared capture sender can count pageviews, scroll thresholds, contact-section reach, case opens, contact/mail/phone/CTA clicks and PDF clicks. It uses the existing project's public ingestion token and documented Capture API; no SDK is loaded.

- Every event shares `distinct_id: portfolio-aggregate-v1`. This is one constant for the entire site, not a visitor ID. Person processing is disabled. No cookies or storage are created for measurement.
- Use **total event counts**, filtered to `analytics_mode = aggregate-v1`. Unique-user counts, session duration, funnels, returning visitors and per-person journeys are intentionally unavailable. Existing dashboards based on those metrics or `ref` tagging need adjustment; this patch does not modify dashboards or erase historical data.
- Only allowlisted public page paths, known event names, case names, CTA locations and scroll thresholds leave the page. Query strings, fragments, referral tags, arbitrary PDF filenames, input contents, phone numbers and email addresses are excluded.
- Requests omit credentials and HTTP referrer; `$ip: null` and `$geoip_disable: true` are additional signals, not proof of server-side IP handling. Every network service necessarily receives a connection IP.
- DNT/GPC disables this PostHog sender. Cloudflare's separate, unchanged embed is not controlled by that check.
- Localhost is excluded unless `?ph=1`, and that parameter never bypasses the server-verification gate.

## Verification

Run `node --test tests/analytics.test.cjs`. Tests exercise the shipping disabled default and an in-memory enabled copy with mocked requests, so no test traffic is sent to the live analytics project.

Sources checked 2026-09-04:

- https://posthog.com/docs/api/capture
- https://posthog.com/docs/privacy/data-collection
- https://github.com/PostHog/posthog-js/blob/main/packages/browser/src/posthog-core.ts
- https://developers.cloudflare.com/web-analytics/data-metrics/dimensions/
- https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/
- https://developers.cloudflare.com/web-analytics/faq/
