/**
 * Site-wide config for stealth links, citations, and Search Console.
 * Set googleSiteVerification when Google Search Console provides a meta tag code.
 */
window.TRIDENT_SITE = {
  releaseMode: 'preview',
  siteBase: 'https://www.tridentroofingandexteriors.ca',
  facebookUrl: 'https://www.facebook.com/profile.php?id=61574192168160',
  googleBusinessUrl: 'https://maps.app.goo.gl/A9c6rB5yp7LvkTxg7',
  googleMapsUrl: 'https://www.google.com/maps/place/Trident+Roofing+and+Exteriors/data=!4m2!3m1!1s0x82c489405877397f:0xf50c224fa29eb86c',
  googleSiteVerification: '9mw8ELiWYHt97ut5_XsxRyNJf7IYDPJ4AN2QgevQhpo',
  bingSiteVerification: '',
};

(function () {
  var productionHosts = ['tridentroofingandexteriors.ca', 'www.tridentroofingandexteriors.ca'];
  var isPreview = window.location.hostname === 'tridentre.github.io';

  function resolveRootPath(path) {
    if (!path || path.charAt(0) !== '/' || path.charAt(1) === '/') return path;
    // Exact host membership: look-alike/attacker hosts must not trigger live rewrites.
    if (productionHosts.indexOf(window.location.hostname) === -1) return path;
    return window.TRIDENT_SITE.siteBase + path;
  }

  function initStealthLinks() {
    document.querySelectorAll('a[href]').forEach(function (link) {
      var path = link.getAttribute('href');
      if (isPreview) {
        var url = new URL(path, window.location.href);
        if ((url.protocol === 'https:' || url.protocol === 'http:') &&
            !url.username && !url.password && productionHosts.indexOf(url.hostname) !== -1) {
          // Navigation only. Keep canonical, Open Graph and structured-data URLs unchanged.
          link.setAttribute('href', url.pathname + url.search + url.hash);
          return;
        }
      }
      link.setAttribute('href', resolveRootPath(path));
    });
  }

  function initPreviewNotice() {
    if (!isPreview) return;
    var robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.name = 'robots';
      document.head.appendChild(robots);
    }
    robots.content = 'noindex,nofollow';
    if (document.getElementById('trident-preview-notice')) return;
    var notice = document.createElement('aside');
    notice.id = 'trident-preview-notice';
    notice.setAttribute('role', 'note');
    notice.textContent = 'Website preview. Please do not submit real customer information.';
    notice.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:1001;' +
      'padding:0.5rem 1rem;text-align:center;font-size:0.875rem;' +
      'background:var(--accent-blue);color:var(--white);pointer-events:none;';
    document.body.appendChild(notice);
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
    initPreviewNotice();
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
