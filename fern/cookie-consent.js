// Cookie consent banner for buildwithfern.com/learn.
//
// Shares the `fern_cookie_consent` cookie with the marketing site
// (fern-api/marketing-site `src/lib/cookie-consent.ts`), so a visitor chooses
// once for both. Until the visitor accepts:
//   - Fern's PostHog stays off (`settings.require-analytics-consent` in docs.yml).
//   - Google Tag Manager isn't loaded. It loads from here instead of
//     `analytics.gtm`, which Fern doesn't gate on consent.
(function () {
  if (window.__fernCookieConsent) return;
  window.__fernCookieConsent = true;

  var COOKIE = "fern_cookie_consent";
  var GTM_ID = "GTM-55W3VNDW";
  var TRACK_EVENT = "fern-docs-track-analytics";
  var BANNER_ID = "fern-cookie-banner";
  var NON_ESSENTIAL_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_gcl", "ph_", "__ph_", "_rm", "li_", "__q", "_uet", "_fbp", "_hj"];

  function readConsent() {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].trim().split("=");
      if (pair[0] === COOKIE && (pair[1] === "granted" || pair[1] === "denied")) return pair[1];
    }
    return null;
  }

  function writeConsent(value) {
    var host = window.location.hostname;
    var domain = host === "buildwithfern.com" || /\.buildwithfern\.com$/.test(host) ? "; domain=.buildwithfern.com" : "";
    document.cookie = COOKIE + "=" + value + "; path=/; max-age=31536000; samesite=lax" + domain;
  }

  function clearNonEssentialCookies() {
    var labels = window.location.hostname.split(".");
    var domains = [""];
    for (var i = 0; i < labels.length; i++) domains.push("; domain=." + labels.slice(i).join("."));
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      var nonEssential = NON_ESSENTIAL_COOKIE_PREFIXES.some(function (prefix) {
        return name.indexOf(prefix) === 0;
      });
      if (!nonEssential) return;
      domains.forEach(function (domain) {
        document.cookie = name + "=; path=/; max-age=0" + domain;
      });
    });
  }

  function reportPosthogConsent(granted) {
    window.fernAnalyticsConsent = granted;
    window.dispatchEvent(new Event("fern-analytics-consent"));
  }

  var gtmLoaded = false;
  function loadGtm() {
    if (gtmLoaded) return;
    gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": new Date().getTime(), event: "gtm.js" });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtm.js?id=" + GTM_ID;
    document.head.appendChild(script);
    // Forward Fern's docs events to the dataLayer, as `analytics.gtm` does,
    // without the feedback email.
    window.addEventListener(TRACK_EVENT, function (event) {
      var detail = event.detail;
      if (!detail || typeof detail.event !== "string" || detail.internal) return;
      var properties = Object.assign({}, detail.properties);
      delete properties.email;
      delete properties.allowFollowUpViaEmail;
      window.dataLayer.push({ event: detail.event, properties: properties });
    });
  }

  function choose(value) {
    var previous = readConsent();
    writeConsent(value);
    removeBanner();
    if (value === "granted") {
      reportPosthogConsent(true);
      loadGtm();
    } else if (previous === "granted") {
      // Scripts that already ran can't be unloaded, so a revoke reloads the
      // page without them.
      reportPosthogConsent(false);
      clearNonEssentialCookies();
      window.location.reload();
    }
  }

  function removeBanner() {
    var banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();
  }

  function showBanner() {
    if (!document.body || document.getElementById(BANNER_ID)) return;
    var banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.innerHTML =
      '<p class="fern-cookie-banner-text">We use cookies for analytics and marketing. Read our ' +
      '<a href="https://buildwithfern.com/privacy-policy">privacy policy</a>.</p>' +
      '<div class="fern-cookie-banner-actions">' +
      '<button type="button" class="fern-cookie-banner-accept">Accept</button>' +
      '<button type="button" class="fern-cookie-banner-reject">Reject</button>' +
      "</div>";
    banner.querySelector(".fern-cookie-banner-accept").addEventListener("click", function () {
      choose("granted");
    });
    banner.querySelector(".fern-cookie-banner-reject").addEventListener("click", function () {
      choose("denied");
    });
    document.body.appendChild(banner);
  }

  var consent = readConsent();
  window.fernAnalyticsConsent = consent === "granted";
  if (consent === "granted") loadGtm();
  // Scripts can rewrite their cookies while the page unloads after a revoke,
  // so clear them again on every load while consent is denied.
  if (consent === "denied") clearNonEssentialCookies();

  function onPageReady() {
    if (readConsent() === null) showBanner();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onPageReady);
  } else {
    onPageReady();
  }
  // Client-side navigation can replace <body>, which drops the banner.
  document.addEventListener("astro:page-load", onPageReady);
  document.addEventListener("astro:after-swap", onPageReady);

  // The footer's "Cookie settings" link reopens the banner.
  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-fern-cookie-settings]") : null;
    if (!target) return;
    event.preventDefault();
    showBanner();
  });
})();
