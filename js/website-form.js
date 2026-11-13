/* Anonymous website intake. Preview submits only to the isolated development database. */
(function () {
  'use strict';
  var form = document.getElementById('consultation-form');
  if (!form) return;
  var PREVIEW_HOST = 'tridentre.github.io';
  var PROD_HOSTS = ['tridentroofingandexteriors.ca', 'www.tridentroofingandexteriors.ca'];
  var host = window.location.hostname.toLowerCase();
  var preview = host === PREVIEW_HOST;
  var production = PROD_HOSTS.indexOf(host) !== -1 && window.TRIDENT_SITE && window.TRIDENT_SITE.releaseMode === 'production';
  var endpoint = preview ? 'https://fine-cow-593.convex.site/api/website/submit' :
    production ? 'https://spotted-gnat-928.convex.site/api/website/submit' : null;
  var btn = form.querySelector('button[type="submit"]');
  var originalText = btn.innerHTML;
  var status = document.createElement('p');
  status.id = 'form-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  status.tabIndex = -1;
  form.appendChild(status);
  var busy = false;
  var requestId = null;
  var requestContent = null;

  // Bots often fill every field, including this non-visible website field.
  var trapLabel = document.createElement('label');
  trapLabel.textContent = 'Leave this field empty';
  trapLabel.hidden = true;
  var trap = document.createElement('input');
  trap.type = 'text'; trap.name = 'website'; trap.tabIndex = -1;
  trap.autocomplete = 'off';
  trapLabel.appendChild(trap);
  form.appendChild(trapLabel);

  function message(text, error) {
    status.textContent = text;
    status.setAttribute('role', error ? 'alert' : 'status');
    status.focus();
  }
  function freshId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, function (n) { return n.toString(16).padStart(2, '0'); }).join('');
  }
  if (!endpoint) {
    btn.disabled = true;
    status.textContent = 'Online requests are not enabled on this host. Please contact Trident using the phone or email above.';
  } else if (preview) {
    status.textContent = 'Preview form: use made-up details only. Requests stay in the test system; no notification email is sent.';
  }
  var limits = { name: 120, phone: 40, email: 254, address: 300, message: 6000 };
  Object.keys(limits).forEach(function (name) {
    var input = form.elements.namedItem(name);
    if (input) input.maxLength = limits[name];
  });
  if (new URLSearchParams(window.location.search).get('project') === 'commercial') {
    var notes = form.elements.namedItem('message');
    if (notes) notes.placeholder = 'Tell us about your commercial property, the issue, and any access requirements.';
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (busy || !endpoint || !form.reportValidity()) return;
    var data = {};
    ['name', 'phone', 'email', 'address', 'message', 'website'].forEach(function (name) {
      var input = form.elements.namedItem(name);
      data[name] = input ? input.value : '';
    });
    data.services = Array.from(form.querySelectorAll('input[name="services"]:checked'), function (item) { return item.value; });
    var insurance = form.querySelector('input[name="insurance_claim"]');
    data.insurance_claim = insurance && insurance.checked ? 'yes' : 'no';
    var content = JSON.stringify(data);
    if (!requestId || requestContent !== content) {
      requestId = freshId();
      requestContent = content;
    }
    data.submission_id = requestId;
    busy = true;
    btn.disabled = true;
    btn.textContent = 'Saving your request…';
    status.textContent = '';
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), signal: controller.signal,
        credentials: 'omit', redirect: 'error'
      });
      var result;
      try { result = await response.json(); }
      catch (_) { throw new Error('The request service is unavailable. Your details have been kept. Please try again or call us.'); }
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || 'We could not save your request. Your details have been kept. Please try again or call us.');
      }
      form.reset();
      form.querySelectorAll('input[name="services"]').forEach(function (item) { item.dispatchEvent(new Event('change', { bubbles: true })); });
      requestId = null; requestContent = null;
      message(preview ? 'Preview request saved in the test system. No notification email was sent.' :
        'Your request has been received. Trident Roofing & Exteriors will contact you using the details you provided.', false);
    } catch (error) {
      message(error.name === 'AbortError' ? 'The connection timed out. Your details have been kept. Please try again; a saved request will not be duplicated.' : error.message, true);
    } finally {
      clearTimeout(timeout);
      busy = false; btn.disabled = false; btn.innerHTML = originalText;
    }
  });
  form.method = 'post';
  form.action = endpoint || '/contact.html';
  btn.disabled = !endpoint;
})();
