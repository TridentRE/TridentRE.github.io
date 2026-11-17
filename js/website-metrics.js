/* First/last-touch attribution and anonymous interaction counts. No form values in events. */
(function () {
  'use strict';
  if (window.TRIDENT_METRICS) return;
  var hosts = ['www.tridentroofingandexteriors.ca', 'tridentroofingandexteriors.ca', 'tridentre.github.io'];
  if (hosts.indexOf(window.location.hostname.toLowerCase()) === -1) return;
  var ENDPOINT = 'https://spotted-gnat-928.convex.site/api/website/event';
  var KEY = 'trident.attribution.v1';
  var TTL = 30 * 24 * 60 * 60 * 1000;
  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  var CAMPAIGN = UTMS.concat(['gclid', 'fbclid']);
  function text(value, max) {
    if (typeof value !== 'string' || /[@?#]/.test(value)) return '';
    return value.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
  }
  function page(value) {
    var clean = text(typeof value === 'string' ? value.split(/[?#]/)[0] : '', 300);
    return clean.charAt(0) === '/' && clean.charAt(1) !== '/' ? clean : '/';
  }
  function referrer(value) {
    try {
      var url = new URL(value);
      return /^https?:$/.test(url.protocol) ? text(url.host + url.pathname, 300) : '';
    } catch (_) { return ''; }
  }
  function campaign(source) {
    var result = {};
    CAMPAIGN.forEach(function (key) {
      var value = text(source[key], key === 'gclid' || key === 'fbclid' ? 64 : 120);
      if (value) result[key] = value;
    });
    return result;
  }
  var now = Date.now();
  var current = {};
  var params = new URLSearchParams(window.location.search);
  CAMPAIGN.forEach(function (key) { current[key] = params.get(key); });
  current = campaign(current);
  var state;
  try {
    var saved = JSON.parse(window.localStorage.getItem(KEY));
    var first = saved && saved.firstTouch;
    if (first && Number.isFinite(first.firstSeenAt) && first.firstSeenAt <= now && now - first.firstSeenAt < TTL) {
      state = {
        firstTouch: Object.assign(campaign(first), {
          landingPage: page(first.landingPage),
          // Re-parse persisted referrers rather than trusting editable storage.
          referrer: first.referrer ? referrer('https://' + first.referrer) : '',
          firstSeenAt: Math.floor(first.firstSeenAt)
        }),
        lastTouch: campaign(saved.lastTouch || {})
      };
    }
  } catch (_) { /* Storage denied/corrupt: attribution still works in memory. */ }
  if (!state) {
    state = {
      firstTouch: Object.assign({}, current, {
        landingPage: page(window.location.pathname), referrer: referrer(document.referrer), firstSeenAt: now
      }),
      lastTouch: Object.assign({}, current)
    };
  } else if (Object.keys(current).length) {
    // Replace the campaign as a group; never combine a new campaign with an old click ID.
    state.lastTouch = current;
  }
  try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (_) { /* Private mode/quota. */ }
  function attribution() {
    var result = {
      formPage: page(window.location.pathname), landingPage: state.firstTouch.landingPage,
      referrer: state.firstTouch.referrer, firstSeenAt: state.firstTouch.firstSeenAt
    };
    return Object.assign(result, state.lastTouch);
  }
  var config = window.TRIDENT_ANALYTICS_CONFIG || {};
  var ga = typeof config.GA4_ID === 'string' && /^G-[A-Z0-9]+$/.test(config.GA4_ID) ? config.GA4_ID : '';
  var clarity = typeof config.CLARITY_ID === 'string' && /^[a-z0-9]+$/i.test(config.CLARITY_ID) ? config.CLARITY_ID : '';
  function script(src) {
    var node = document.createElement('script');
    node.async = true; node.src = src; document.head.appendChild(node);
  }
  if (ga) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // No full URL/referrer queries (which may contain contact details) in GA events.
    window.gtag('config', ga, {
      send_page_view: true,
      page_location: window.location.origin + page(window.location.pathname),
      page_referrer: state.firstTouch.referrer ? 'https://' + state.firstTouch.referrer : ''
    });
    script('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(ga));
  }
  if (clarity) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    script('https://www.clarity.ms/tag/' + encodeURIComponent(clarity));
  }
  function track(type) {
    if (['call_tap', 'form_start', 'form_submit'].indexOf(type) === -1) return;
    var attr = attribution();
    var payload = { type: type, page: attr.formPage, landingPage: attr.landingPage, gclid: !!attr.gclid, fbclid: !!attr.fbclid };
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (key) { if (attr[key]) payload[key] = attr[key]; });
    var body = JSON.stringify(payload);
    var sent = false;
    try {
      // text/plain is CORS-safelisted: cross-origin beacons need no preflight.
      if (navigator.sendBeacon) sent = navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain;charset=UTF-8' }));
    } catch (_) { /* Fall back if the browser refuses a beacon. */ }
    if (!sent) {
      try {
        window.fetch(ENDPOINT, {
          method: 'POST', body: body, headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          keepalive: true, credentials: 'omit', redirect: 'error'
        }).catch(function () {});
      } catch (_) { /* Metrics must never block a call or a request. */ }
    }
    if (ga && (type === 'call_tap' || type === 'form_submit')) {
      window.gtag('event', type === 'call_tap' ? 'click_call' : 'generate_lead', {
        page_path: payload.page, page_location: window.location.origin + payload.page
      });
    }
  }
  window.TRIDENT_METRICS = { attribution: attribution, track: track };
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (link && /^tel:/i.test(link.getAttribute('href'))) track('call_tap');
  });
  var started = false;
  document.addEventListener('focusin', function (event) {
    var field = event.target;
    if (!started && field && field.closest && field.closest('#consultation-form') &&
        /^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName) && field.type !== 'hidden' && field.name !== 'website') {
      started = true; track('form_start');
    }
  });
})();
