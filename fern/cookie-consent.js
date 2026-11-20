// Cookie consent banner for buildwithfern.com/learn.
//
// Shares the `fern_cookie_consent` cookie (`analytics:0|marketing:0`) with the
// marketing site (fern-api/marketing-site `src/lib/cookie-consent.ts`), so a
// visitor chooses once for both.
//   - Analytics gates Fern's PostHog (`settings.require-analytics-consent`).
//   - Marketing gates Google Tag Manager, which loads from here instead of
//     `analytics.gtm` because Fern doesn't gate that on consent.
(function () {
  if (window.__fernCookieConsent) return;
  window.__fernCookieConsent = true;

  var COOKIE = "fern_cookie_consent";
  var COOKIE_VALUE_PATTERN = /^analytics:([01])\|marketing:([01])$/;
  var GTM_ID = "GTM-55W3VNDW";
  var TRACK_EVENT = "fern-docs-track-analytics";
  var BANNER_ID = "fern-cookie-banner";
  var CATEGORY_COOKIE_PREFIXES = {
    analytics: ["_ga", "_gid", "_gat", "ph_", "__ph_", "_hj"],
    marketing: ["_gcl", "_rm", "li_", "__q", "_uet", "_fbp"],
  };
  var CATEGORIES = [
    {
      key: "analytics",
      label: "Analytics",
      description: "Helps us understand how visitors use the docs (PostHog).",
    },
    {
      key: "marketing",
      label: "Marketing",
      description: "Measures our ads and campaigns (Google Tag Manager).",
    },
  ];
  var ALL_GRANTED = { analytics: true, marketing: true };
  var ALL_DENIED = { analytics: false, marketing: false };

  // What this page has already turned on. Scripts can't be unloaded, so
  // revoking one of these reloads the page.
  var active = { analytics: false, marketing: false };

  function readConsent() {
    var parts = document.cookie.split(";");
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].trim().split("=");
      var match = pair[0] === COOKIE && COOKIE_VALUE_PATTERN.exec(pair[1] || "");
      if (match) return { analytics: match[1] === "1", marketing: match[2] === "1" };
    }
    return null;
  }

  function writeConsent(consent) {
    var host = window.location.hostname;
    var domain = host === "buildwithfern.com" || /\.buildwithfern\.com$/.test(host) ? "; domain=.buildwithfern.com" : "";
    var value = "analytics:" + (consent.analytics ? 1 : 0) + "|marketing:" + (consent.marketing ? 1 : 0);
    document.cookie = COOKIE + "=" + value + "; path=/; max-age=31536000; samesite=lax" + domain;
  }

  function clearCookies(consent) {
    var prefixes = [];
    CATEGORIES.forEach(function (category) {
      if (!consent[category.key]) prefixes = prefixes.concat(CATEGORY_COOKIE_PREFIXES[category.key]);
    });
    if (prefixes.length === 0) return;
    var labels = window.location.hostname.split(".");
    var domains = [""];
    for (var i = 0; i < labels.length; i++) domains.push("; domain=." + labels.slice(i).join("."));
    document.cookie.split(";").forEach(function (part) {
      var name = part.split("=")[0].trim();
      var matches = prefixes.some(function (prefix) {
        return name.indexOf(prefix) === 0;
      });
      if (!matches) return;
      domains.forEach(function (domain) {
        document.cookie = name + "=; path=/; max-age=0" + domain;
      });
    });
  }

  function loadGtm(analyticsGranted) {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    var analytics = analyticsGranted ? "granted" : "denied";
    gtag("consent", "default", {
      analytics_storage: analytics,
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
    });
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

  // Turns on what `consent` allows, or reloads if it revokes something this
  // page already turned on (including a change made in another tab or on the
  // marketing site).
  function apply(consent) {
    if ((active.analytics && !consent.analytics) || (active.marketing && !consent.marketing)) {
      window.fernAnalyticsConsent = false;
      window.dispatchEvent(new Event("fern-analytics-consent"));
      clearCookies(consent);
      window.location.reload();
      return;
    }
    clearCookies(consent);
    if (consent.analytics && !active.analytics) {
      active.analytics = true;
      window.fernAnalyticsConsent = true;
      window.dispatchEvent(new Event("fern-analytics-consent"));
    }
    if (consent.marketing && !active.marketing) {
      active.marketing = true;
      loadGtm(consent.analytics);
    }
  }

  function choose(consent) {
    writeConsent(consent);
    removeBanner();
    apply(consent);
  }

  function removeBanner() {
    var banner = document.getElementById(BANNER_ID);
    if (banner) banner.remove();
  }

  function escapeHtml(text) {
    return text.replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function showBanner(withSettings) {
    if (!document.body) return;
    removeBanner();
    var current = readConsent() || ALL_DENIED;
    var banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    var settings = "";
    if (withSettings) {
      settings =
        '<div class="fern-cookie-banner-settings">' +
        '<label class="fern-cookie-banner-option"><input type="checkbox" checked disabled />' +
        "<span><strong>Strictly necessary</strong><span>Required for the site to work, including remembering this choice.</span></span></label>" +
        CATEGORIES.map(function (category) {
          return (
            '<label class="fern-cookie-banner-option"><input type="checkbox" data-category="' +
            category.key +
            '"' +
            (current[category.key] ? " checked" : "") +
            " /><span><strong>" +
            escapeHtml(category.label) +
            "</strong><span>" +
            escapeHtml(category.description) +
            "</span></span></label>"
          );
        }).join("") +
        "</div>";
    }
    banner.innerHTML =
      '<p class="fern-cookie-banner-text">We use cookies for analytics and marketing. Read our ' +
      '<a href="https://buildwithfern.com/privacy-policy">privacy policy</a>.</p>' +
      settings +
      '<div class="fern-cookie-banner-actions">' +
      '<button type="button" class="fern-cookie-banner-primary" data-action="accept">Accept all</button>' +
      '<button type="button" data-action="reject">Reject all</button>' +
      (withSettings
        ? '<button type="button" data-action="save">Save choices</button>'
        : '<button type="button" class="fern-cookie-banner-ghost" data-action="manage">Manage</button>') +
      "</div>";
    banner.addEventListener("click", function (event) {
      var button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
      if (!button) return;
      var action = button.getAttribute("data-action");
      if (action === "accept") choose(ALL_GRANTED);
      else if (action === "reject") choose(ALL_DENIED);
      else if (action === "manage") showBanner(true);
      else if (action === "save") {
        var consent = { analytics: false, marketing: false };
        banner.querySelectorAll("input[data-category]").forEach(function (input) {
          consent[input.getAttribute("data-category")] = input.checked;
        });
        choose(consent);
      }
    });
    document.body.appendChild(banner);
  }

  var initial = readConsent();
  window.fernAnalyticsConsent = false;
  if (initial) apply(initial);

  function onPageReady() {
    if (readConsent() === null && !document.getElementById(BANNER_ID)) showBanner(false);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onPageReady);
  } else {
    onPageReady();
  }
  // Client-side navigation can replace <body>, which drops the banner.
  document.addEventListener("astro:page-load", onPageReady);
  document.addEventListener("astro:after-swap", onPageReady);

  // Pick up a choice made in another tab or on the marketing site.
  function syncFromCookie() {
    var consent = readConsent();
    if (consent) apply(consent);
  }
  window.addEventListener("focus", syncFromCookie);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") syncFromCookie();
  });

  // The footer's "Cookie Settings" link reopens the banner with the toggles.
  document.addEventListener("click", function (event) {
    var target = event.target instanceof Element ? event.target.closest("[data-fern-cookie-settings]") : null;
    if (!target) return;
    event.preventDefault();
    showBanner(true);
  });
})();
