/**
 * Popup Variant Price Fix
 *
 * Issue: when user picks a variant pill inside the quick-add / quick-view
 * popup, Shopify product-info refetches the page with a `quickadd-...`
 * section id. That section in this theme renders <product-price> WITHOUT
 * the price markup (it only contains a "sold/viewing" urgency block). As a
 * result, the popup price element never updates.
 *
 * Approach: bypass the section render flow. Subscribe to
 * PUB_SUB_EVENTS.variantChange — its `data.variant` carries the up-to-date
 * Shopify variant object (price, compare_at_price). Format the price using
 * Shopify.formatMoney and rewrite the popup's <product-price> inner DOM.
 *
 * We only target popups (product-info inside #QuickStandardModal,
 * <quick-view-modal>, <quick-add-modal>, or with id containing "quick-add"),
 * so the main product page is untouched.
 */
(function () {
  'use strict';

  function isPopupProductInfo(productInfo) {
    if (!productInfo) return false;
    if (productInfo.closest('#QuickStandardModal')) return true;
    if (productInfo.closest('quick-view-modal')) return true;
    if (productInfo.closest('quick-add-modal')) return true;
    var idAttr = productInfo.id || '';
    if (idAttr.indexOf('quick-add') !== -1 || idAttr.indexOf('quickview') !== -1) return true;
    return false;
  }

  function formatMoney(amountCents) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      return Shopify.formatMoney(amountCents, window.money_format || '${{amount}}');
    }
    // Fallback: render as plain dollars.
    return '$' + (amountCents / 100).toFixed(2);
  }

  function updatePopupPrice(popupInfo, variant) {
    if (!popupInfo || !variant) return;
    var priceEl = popupInfo.querySelector('product-price');
    if (!priceEl) return;

    var container = priceEl.querySelector('.price-product-container, .price');
    if (!container) return;

    var hasSale = variant.compare_at_price && variant.compare_at_price > variant.price;

    // Toggle sale state on the container.
    container.classList.toggle('price--on-sale', !!hasSale);
    container.classList.toggle('price--no-compare', !hasSale);

    // .price-new (current price) — present in both sale and regular.
    var newPriceEl = container.querySelector('.price-new');
    if (newPriceEl) {
      newPriceEl.textContent = formatMoney(variant.price);
    }

    // .price-old (compare-at price) — only meaningful on sale.
    var oldPriceEl = container.querySelector('.price-old');
    if (oldPriceEl) {
      oldPriceEl.textContent = hasSale ? formatMoney(variant.compare_at_price) : '';
    }

    // .price-percent — discount percent badge.
    var percentEl = container.querySelector('.price-percent');
    if (percentEl) {
      if (hasSale) {
        var diff = variant.compare_at_price - variant.price;
        var pct = Math.round((diff * 100) / variant.compare_at_price);
        percentEl.textContent = '-' + pct + '%';
      } else {
        percentEl.textContent = '';
      }
    }
  }

  function syncFromEvent(eventData) {
    if (!eventData || !eventData.variant) return;
    var popups = Array.from(document.querySelectorAll('product-info')).filter(isPopupProductInfo);
    if (popups.length === 0) return;

    popups.forEach(function (popupInfo) {
      updatePopupPrice(popupInfo, eventData.variant);
    });
  }

  function init() {
    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      try {
        syncFromEvent(event && event.data);
      } catch (e) {
        // silent
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
