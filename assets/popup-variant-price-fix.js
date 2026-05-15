/**
 * Popup Variant Price Fix
 *
 * Theme Ella renders the product price as <product-price> custom element
 * without an id="price-{sectionId}" wrapper. Shopify's stock product-info
 * code (updateSourceFromDestination('price')) looks for that id, so when a
 * variant is changed inside a quick-add / quick-view popup, the price element
 * never gets the new HTML.
 *
 * The popup container in this theme is <div id="QuickStandardModal"> and the
 * popup product-info has its id prefixed with `MainProduct-quick-add-`. Both
 * popup and main page product-info share the same dataset.section, so we must
 * identify the popup by DOM ancestry (parent #QuickStandardModal, or id prefix
 * "quick-add"), not by sectionId.
 *
 * Approach: subscribe to PUB_SUB_EVENTS.variantChange. The publisher includes
 * the parsed response HTML in event.data.html. We find every <product-info>
 * that lives inside a popup container and copy <product-price> innerHTML into
 * it.
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

  function syncPopupPrice(sourceHtml, eventSectionId) {
    if (!sourceHtml) return;

    // Find all popup product-info elements; sync only the one whose section
    // matches the event (or any visible popup if section can't be matched).
    var popups = Array.from(document.querySelectorAll('product-info'))
      .filter(isPopupProductInfo);
    if (popups.length === 0) return;

    var sourcePrice = sourceHtml.querySelector('product-price');
    if (!sourcePrice) return;

    // Validate source price has actual price markup; otherwise leave alone.
    var hasContent =
      sourcePrice.innerHTML.trim() !== '' &&
      (sourcePrice.querySelector('.price-product-container') ||
        sourcePrice.querySelector('.price-new') ||
        sourcePrice.querySelector('.price-item') ||
        sourcePrice.querySelector('.price__container'));
    if (!hasContent) return;

    popups.forEach(function (popupInfo) {
      // Match by section id when possible to avoid touching the wrong popup.
      var popupSection = popupInfo.dataset.originalSection || popupInfo.dataset.section;
      if (eventSectionId && popupSection && eventSectionId !== popupSection) {
        console.log('[popup-fix] section mismatch, skip', { event: eventSectionId, popup: popupSection });
        return;
      }

      var destPrice = popupInfo.querySelector('product-price');
      console.log('[popup-fix] destPrice for', popupInfo.id, ':', !!destPrice);
      if (!destPrice) return;
      destPrice.innerHTML = sourcePrice.innerHTML;
      console.log('[popup-fix] PRICE UPDATED for', popupInfo.id);
    });
  }

  function init() {
    if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') {
      setTimeout(init, 100);
      return;
    }

    subscribe(PUB_SUB_EVENTS.variantChange, function (event) {
      try {
        var data = event && event.data;
        console.log('[popup-fix] variantChange', { hasData: !!data, hasHtml: !!data?.html, sectionId: data?.sectionId });
        if (!data || !data.html) return;

        var popups = Array.from(document.querySelectorAll('product-info')).filter(isPopupProductInfo);
        console.log('[popup-fix] popups found:', popups.length);
        popups.forEach(function (p, i) {
          console.log('[popup-fix] popup #' + i, { id: p.id, section: p.dataset.section, original: p.dataset.originalSection });
        });

        var sourcePrice = data.html.querySelector('product-price');
        console.log('[popup-fix] source <product-price>:', !!sourcePrice, 'len:', sourcePrice?.innerHTML?.length);

        syncPopupPrice(data.html, data.sectionId);
      } catch (e) {
        console.error('[popup-fix] error:', e);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
