/**
 * Site-wide config for stealth links, citations, and Search Console.
 * Set googleSiteVerification when Google Search Console provides a meta tag code.
 */
window.TRIDENT_SITE = {
  siteBase: 'https://www.tridentroofingandexteriors.ca',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61574192168160',
  googleBusinessUrl: 'https://maps.app.goo.gl/A9c6rB5yp7LvkTxg7',
  googleMapsUrl: 'https://www.google.com/maps/place/Trident+Roofing+and+Exteriors/data=!4m2!3m1!1s0x82c489405877397f:0xf50c224fa29eb86c',
  googleSiteVerification: '9mw8ELiWYHt97ut5_XsxRyNJf7IYDPJ4AN2QgevQhpo',
  bingSiteVerification: '',
};

(function () {
  function resolveRootPath(path) {
    if (!path || path.charAt(0) !== '/') return path;
    var host = window.location.hostname;
    var isLocalServer = host === 'localhost' || host === '127.0.0.1';
    if (isLocalServer) return path;
    // Preview/staging hosts: keep links on the same host
    if (host.indexOf('tridentroofingandexteriors.ca') === -1) return path;
    return window.TRIDENT_SITE.siteBase + path;
  }

  function initStealthLinks() {
    document.querySelectorAll('a[href^="/"]').forEach(function (link) {
      link.href = resolveRootPath(link.getAttribute('href'));
    });
  }

  function injectVerificationMeta() {
    var cfg = window.TRIDENT_SITE;
    if (cfg.googleSiteVerification) {
      var g = document.createElement('meta');
      g.name = 'google-site-verification';
      g.content = cfg.googleSiteVerification;
      document.head.appendChild(g);
    }
    if (cfg.bingSiteVerification) {
      var b = document.createElement('meta');
      b.name = 'msvalidate.01';
      b.content = cfg.bingSiteVerification;
      document.head.appendChild(b);
    }
  }

  function initReviewLinks() {
    var cfg = window.TRIDENT_SITE;
    document.querySelectorAll('[data-trident-google-reviews]').forEach(function (link) {
      if (cfg.googleBusinessUrl) link.href = cfg.googleBusinessUrl;
    });
    document.querySelectorAll('[data-trident-facebook]').forEach(function (link) {
      if (cfg.facebookUrl) link.href = cfg.facebookUrl;
    });
  }

  function init() {
    initStealthLinks();
    injectVerificationMeta();
    initReviewLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
