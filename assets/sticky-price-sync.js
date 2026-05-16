/**
 * Sticky Price Sync
 *
 * Keeps the sticky add-to-cart bar's price in sync with the main product
 * information block when a user picks a variant. Replaces the inline script
 * previously embedded in theme.liquid that used a global MutationObserver
 * watching the entire <body>.
 *
 * Strategy:
 * - Listen to PUB_SUB_EVENTS.variantChange (published by product-info.js
 *   right after a variant change is processed). This fires only on the
 *   product detail page, so no work is done on other pages.
 * - Fallback: also listen to legacy events ('variant:change',
 *   'theme:variant:change', 'variantChange') and to clicks on variant
 *   pills/swatches, in case publish() doesn't fire.
 * - When triggered, copy textContent from the main price elements into the
 *   sticky bar's price elements. No DOM observer needed.
 */
(function () {
  'use strict';

  var MAIN_PRICE_SELECTORS = {
    new: '.product-information .price-new, #MainProduct .price-new, [data-section*="main"] .price-new',
    old: '.product-information .price-old, #MainProduct .price-old, [data-section*="main"] .price-old',
    percent: '.product-information .price-percent, #MainProduct .price-percent, [data-section*="main"] .price-percent'
  };

  function syncStickyPrice() {
    var sticky = document.querySelector('.sticky-atc__price');
    if (!sticky) return;

    var mainNew = document.querySelector(MAIN_PRICE_SELECTORS.new);
    if (!mainNew) return;

    var stickyNew = sticky.querySelector('.price-new');
    if (stickyNew) stickyNew.textContent = mainNew.textContent;

    var mainOld = document.querySelector(MAIN_PRICE_SELECTORS.old);
    var stickyOld = sticky.querySelector('.price-old');
    if (stickyOld && mainOld) stickyOld.textContent = mainOld.textContent;

    var mainPercent = document.querySelector(MAIN_PRICE_SELECTORS.percent);
    var stickyPercent = sticky.querySelector('.price-percent');
    if (stickyPercent && mainPercent) stickyPercent.textContent = mainPercent.textContent;
  }

  function init() {
    // Best signal: Shopify pub/sub variant change event (fires after price
    // markup is updated in the DOM).
    if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
      subscribe(PUB_SUB_EVENTS.variantChange, function () {
        // Wait one frame so any DOM updates flush first.
        requestAnimationFrame(syncStickyPrice);
      });
    }

    // Legacy theme events.
    document.addEventListener('variant:change', function () { setTimeout(syncStickyPrice, 50); });
    document.addEventListener('theme:variant:change', syncStickyPrice);
    document.addEventListener('variantChange', syncStickyPrice);

    // Defensive: catch direct clicks on variant pills/swatches in case the
    // events above don't fire (e.g. third-party variant pickers).
    document.addEventListener('click', function (e) {
      if (!e.target.closest('fieldset.product-form__input--pill, fieldset.variant-option--pill, fieldset.variant-option--swatches')) {
        return;
      }
      // Two passes: once after Shopify's pricing updates settle (~100ms) and
      // once after slower async paths (~300ms).
      setTimeout(syncStickyPrice, 100);
      setTimeout(syncStickyPrice, 300);
    });

    // Initial sync on load (in case the sticky bar renders with stale price).
    syncStickyPrice();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
