/**
 * Popup Variant Price Fix
 *
 * Theme Ella renders the product price as <product-price> custom element
 * without an id="price-{sectionId}" wrapper. Shopify's stock product-info
 * code (updateSourceFromDestination('price')) looks for that id, so when a
 * variant is changed inside a quick-view popup, the price element never gets
 * the new HTML.
 *
 * Since the homepage uses <color-swatch> click handlers (which already work),
 * this issue only shows up in the popup, where the variant picker uses pill
 * buttons that go through the <product-info>.handleOptionValueChange flow.
 *
 * Fix: subscribe to PUB_SUB_EVENTS.variantChange (published right after the
 * server response is processed). When the event fires, find <product-price>
 * inside the popup, copy innerHTML from the response HTML, and replace it.
 *
 * Safety: only sync when source HTML actually contains a valid price element,
 * so we never wipe the current price.
 */
(function () {
  'use strict';

  function init() {
    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') {
      // Theme JS hasn't initialised yet; retry shortly.
      setTimeout(init, 100);
      return;
    }

    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      try {
        var data = event && event.data;
        if (!data || !data.html) return;

        // Only handle popup contexts. The main page already has its own
        // working flow (or doesn't show a popup), so we don't want to touch
        // its price element from here.
        var modal = document.querySelector('quick-view-modal');
        if (!modal || !modal.classList.contains('opened')) return;

        var popupInfo = modal.querySelector('product-info');
        if (!popupInfo) return;

        // Only react when the change came from this popup's product-info.
        var sectionId = data.sectionId;
        var popupSection = popupInfo.dataset.originalSection || popupInfo.dataset.section;
        if (!sectionId || sectionId !== popupSection) return;

        var sourcePrice = data.html.querySelector('product-price');
        var destPrice = popupInfo.querySelector('product-price');
        if (!sourcePrice || !destPrice) return;

        // Make sure source has actual price markup; otherwise leave the
        // current price alone.
        var hasContent =
          sourcePrice.innerHTML.trim() !== '' &&
          (sourcePrice.querySelector('.price-product-container') ||
            sourcePrice.querySelector('.price-new') ||
            sourcePrice.querySelector('.price-item') ||
            sourcePrice.querySelector('.price__container'));

        if (hasContent) {
          destPrice.innerHTML = sourcePrice.innerHTML;
        }
      } catch (e) {
        // Silent: never break checkout flow because of price fix.
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
