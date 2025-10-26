/**
 * CSS Optimization Script
 * 
 * This script optimizes CSS loading to reduce render-blocking time by:
 * 1. Adding preconnect hints for critical domains
 * 2. Preloading critical CSS files
 * 3. Adding font-display: swap to custom fonts
 */

(function() {
  'use strict';

  function addPreconnectHints() {
    const domains = [
      'https://prod.ferndocs.com',
      'https://cdn.jsdelivr.net'
    ];

    domains.forEach(domain => {
      const existing = document.querySelector(`link[rel="preconnect"][href="${domain}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = domain;
        link.crossOrigin = 'anonymous';
        document.head.insertBefore(link, document.head.firstChild);
      }
    });
  }

  function addDnsPrefetchHints() {
    const domains = [
      'https://prod.ferndocs.com',
      'https://cdn.jsdelivr.net'
    ];

    domains.forEach(domain => {
      const existing = document.querySelector(`link[rel="dns-prefetch"][href="${domain}"]`);
      if (!existing) {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain;
        document.head.insertBefore(link, document.head.firstChild);
      }
    });
  }

  function optimizeFontLoading() {
    const style = document.createElement('style');
    style.textContent = `
      @font-face {
        font-display: swap;
      }
    `;
    document.head.appendChild(style);

    try {
      Array.from(document.styleSheets).forEach(sheet => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              if (rule instanceof CSSFontFaceRule) {
                if (!rule.style.fontDisplay) {
                  rule.style.fontDisplay = 'swap';
                }
              }
            });
          }
        } catch (e) {
          console.debug('Could not access stylesheet rules:', e);
        }
      });
    } catch (e) {
      console.debug('Error optimizing fonts:', e);
    }
  }

  function preloadCriticalCSS() {
    const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
    
    stylesheets.forEach(link => {
      const href = link.href;
      
      if (href && href.includes('ferndocs.com') && href.includes('.css')) {
        const existing = document.querySelector(`link[rel="preload"][href="${href}"]`);
        if (!existing && !link.hasAttribute('data-preloaded')) {
          const preload = document.createElement('link');
          preload.rel = 'preload';
          preload.as = 'style';
          preload.href = href;
          preload.crossOrigin = 'anonymous';
          
          link.parentNode.insertBefore(preload, link);
          link.setAttribute('data-preloaded', 'true');
        }
      }
    });
  }

  function runOptimizations() {
    addPreconnectHints();
    addDnsPrefetchHints();
    optimizeFontLoading();
    preloadCriticalCSS();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runOptimizations);
  } else {
    runOptimizations();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('load', runOptimizations);
  }
})();
