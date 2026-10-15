(() => {
  function initWhatsAppWidget() {
    if (!document.body || document.getElementById('netpro-whatsapp-widget')) return;

    let openFromFooter = null;
    let pendingFooterInvoker = null;
    document.addEventListener('click', event => {
      const target = event.target instanceof Element ? event.target : null;
      const link = target?.closest('a[href]');
      if (!link) return;
      const isWhatsAppFooterLink = link.matches('[data-social="whatsapp"], .footer-social-icon[href*="whatsapp.com"], .footer-social-icon[href*="wa.me"]');
      if (!isWhatsAppFooterLink) return;
      event.preventDefault();
      if (openFromFooter) openFromFooter(link);
      else pendingFooterInvoker = link;
    });

    const appScriptUrl = document.currentScript?.src || document.baseURI;
    const widgetStyles = document.createElement('link');
    widgetStyles.rel = 'stylesheet';
    widgetStyles.href = new URL('whatsapp-widget.css?v=20261015-whatsapp-font1', appScriptUrl).href;
    widgetStyles.dataset.netproWhatsappStyles = '';

    const contactUrl = 'https://api.whatsapp.com/send/?phone=%2B85260888498&text&type=phone_number&app_absent=0';
    const render = () => {
      if (document.getElementById('netpro-whatsapp-widget')) return;

      const widget = document.createElement('div');
      widget.id = 'netpro-whatsapp-widget';
      widget.className = 'netpro-whatsapp-widget';
      widget.innerHTML = `
        <section class="netpro-whatsapp-panel" id="netpro-whatsapp-panel" role="dialog" aria-modal="false" aria-labelledby="netpro-whatsapp-title" aria-describedby="netpro-whatsapp-copy" tabindex="-1" hidden>
          <header class="netpro-whatsapp-header">
            <div class="netpro-whatsapp-heading">
              <span class="netpro-whatsapp-brand">NETPRO SOURCING</span>
              <h2 id="netpro-whatsapp-title" tabindex="-1">Contact our team</h2>
            </div>
            <div class="netpro-whatsapp-controls">
              <button class="netpro-whatsapp-control" type="button" data-whatsapp-minimize aria-label="Minimize contact panel" title="Minimize">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/></svg>
              </button>
              <button class="netpro-whatsapp-control" type="button" data-whatsapp-close aria-label="Close contact panel" title="Close">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
              </button>
            </div>
          </header>
          <div class="netpro-whatsapp-content">
            <p id="netpro-whatsapp-copy">Planning a product or comparing options? Tell us about your product, quantity and customisation needs.</p>
            <a class="netpro-whatsapp-action" data-whatsapp-action href="${contactUrl}">
              <span>Continue to WhatsApp</span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M7 7h10v10"/></svg>
            </a>
            <div class="netpro-whatsapp-fallback" data-whatsapp-fallback hidden>
              <p role="status" aria-live="polite">Your browser blocked the popup. Open WhatsApp directly using this link.</p>
              <a href="${contactUrl}" target="_blank" rel="noopener noreferrer">Open WhatsApp in a new tab <span aria-hidden="true">↗</span></a>
            </div>
            <p class="netpro-whatsapp-manager">Sales Manager: Stanley Poon</p>
            <a class="netpro-whatsapp-phone" href="tel:+85260888498">+852 6088 8498</a>
          </div>
        </section>
        <button class="netpro-whatsapp-launcher" type="button" aria-label="Open WhatsApp contact panel" aria-controls="netpro-whatsapp-panel" aria-expanded="false">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.52 3.48A11.84 11.84 0 0 0 12.09 0C5.56 0 .24 5.32.24 11.85c0 2.09.55 4.12 1.59 5.91L.14 24l6.39-1.67a11.8 11.8 0 0 0 5.65 1.44h.01c6.53 0 11.85-5.32 11.85-11.85 0-3.17-1.23-6.15-3.47-8.44ZM12.19 21.72h-.01a9.86 9.86 0 0 1-5.03-1.37l-.36-.21-3.77.99 1.01-3.67-.23-.38a9.86 9.86 0 1 1 8.39 4.64Zm5.42-7.38c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.27-.47-2.42-1.49-.9-.8-1.5-1.78-1.68-2.08-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/></svg>
        </button>`;

      document.body.append(widget);
      const panel = widget.querySelector('.netpro-whatsapp-panel');
      const launcher = widget.querySelector('.netpro-whatsapp-launcher');
      const heading = widget.querySelector('#netpro-whatsapp-title');
      const fallback = widget.querySelector('[data-whatsapp-fallback]');
      let returnFocusTo = null;
      let contactPopup = null;

      const restoreFocus = target => {
        const focusTarget = target?.isConnected ? target : launcher;
        requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
      };
      const closePanel = (focusTarget = returnFocusTo) => {
        if (panel.hidden) return;
        panel.hidden = true;
        launcher.setAttribute('aria-expanded', 'false');
        launcher.setAttribute('aria-label', 'Open WhatsApp contact panel');
        fallback.hidden = true;
        returnFocusTo = null;
        restoreFocus(focusTarget);
      };
      const openPanel = invoker => {
        if (panel.hidden) {
          returnFocusTo = invoker?.isConnected ? invoker : launcher;
          fallback.hidden = true;
          panel.hidden = false;
          launcher.setAttribute('aria-expanded', 'true');
          launcher.setAttribute('aria-label', 'Close WhatsApp contact panel');
          requestAnimationFrame(() => heading.focus({ preventScroll: true }));
          return;
        }
        if (invoker?.isConnected) returnFocusTo = invoker;
        heading.focus({ preventScroll: true });
      };
      openFromFooter = openPanel;
      if (pendingFooterInvoker) {
        openPanel(pendingFooterInvoker);
        pendingFooterInvoker = null;
      }

      launcher.addEventListener('click', () => {
        if (panel.hidden) openPanel(launcher);
        else closePanel(launcher);
      });
      widget.querySelector('[data-whatsapp-minimize]').addEventListener('click', () => closePanel());
      widget.querySelector('[data-whatsapp-close]').addEventListener('click', () => closePanel());
      widget.querySelector('[data-whatsapp-action]').addEventListener('click', event => {
        event.preventDefault();

        try {
          if (contactPopup && !contactPopup.closed) {
            contactPopup.focus();
            fallback.hidden = true;
            return;
          }
        } catch {
          contactPopup = null;
        }

        const screen = window.screen;
        const availableLeft = Number.isFinite(screen.availLeft) ? screen.availLeft : 0;
        const availableTop = Number.isFinite(screen.availTop) ? screen.availTop : 0;
        const availableWidth = Number.isFinite(screen.availWidth) && screen.availWidth > 0
          ? screen.availWidth
          : Number.isFinite(screen.width) && screen.width > 0 ? screen.width : 520;
        const availableHeight = Number.isFinite(screen.availHeight) && screen.availHeight > 0
          ? screen.availHeight
          : Number.isFinite(screen.height) && screen.height > 0 ? screen.height : 780;
        const width = Math.min(520, availableWidth);
        const height = Math.min(780, availableHeight);
        const browserCenterX = Number.isFinite(window.screenX) && Number.isFinite(window.outerWidth) && window.outerWidth > 0
          ? window.screenX + window.outerWidth / 2
          : availableLeft + availableWidth / 2;
        const browserCenterY = Number.isFinite(window.screenY) && Number.isFinite(window.outerHeight) && window.outerHeight > 0
          ? window.screenY + window.outerHeight / 2
          : availableTop + availableHeight / 2;
        const left = Math.round(Math.max(availableLeft, Math.min(browserCenterX - width / 2, availableLeft + availableWidth - width)));
        const top = Math.round(Math.max(availableTop, Math.min(browserCenterY - height / 2, availableTop + availableHeight - height)));
        let popup = null;
        try {
          popup = window.open('about:blank', '_blank', `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
        } catch {
          popup = null;
        }
        if (popup) {
          try {
            popup.opener = null;
            popup.location.replace(contactUrl);
            fallback.hidden = true;
            contactPopup = popup;
            try { popup.focus(); } catch { /* The browser may prevent focusing a new window. */ }
            return;
          } catch {
            contactPopup = null;
            try { popup.close(); } catch { /* The browser may have already closed the popup. */ }
          }
        }
        fallback.hidden = false;
        widget.querySelector('[data-whatsapp-fallback] a').focus({ preventScroll: true });
      });

      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || panel.hidden || document.querySelector('dialog[open]')) return;
        event.preventDefault();
        event.stopPropagation();
        closePanel();
      });
    };

    if (document.querySelector('link[data-netpro-whatsapp-styles]')) {
      render();
      return;
    }
    widgetStyles.addEventListener('load', render, { once: true });
    widgetStyles.addEventListener('error', render, { once: true });
    document.head.append(widgetStyles);
  }

  const start = () => {
    'use strict';

  // Shared destination for patch customization entry points.
  const PATCHES_URL = 'https://www.netpropatches.com/netpro2026/';
  const products = Array.isArray(window.NETPRO_PRODUCTS) ? window.NETPRO_PRODUCTS : [];
  const isShop = document.body.classList.contains("shop-page");
  const isHome = document.body.classList.contains("home-page");
  const pageHeading = (homeTitle, innerTitle) => isHome ? homeTitle : innerTitle;
  const navigationEntry = performance.getEntriesByType('navigation')[0];
  const shouldResetHomeReload = isHome
    && navigationEntry?.type === 'reload'
    && ['', '#home', '#top'].includes(location.hash);
  const previousScrollRestoration = shouldResetHomeReload ? history.scrollRestoration : null;
  if (shouldResetHomeReload) {
    try { history.scrollRestoration = 'manual'; } catch { /* History may be unavailable in private embeds. */ }
  }
  const shopState = {color:"all",size:[],sort:"featured",page:1};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const arrow = '<svg aria-hidden="true"><use href="#i-arrow"/></svg>';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const customizationKey = href => String(href || '').replace(/\.html(?=#|$)/, '').replace(/^\.\//, '');
  const customStyleLabel = href => customizationKey(href).split('/').pop().replace(/^custom-/, '').replace(/[-_]+/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
  const styleKeys = new Set(products.map(product => customizationKey(product.customizationHref)));
  const enquiryState = window.NetproEnquiryState;
  let activeFilter = isShop ? (new URLSearchParams(location.search).get('category') || 'all') : 'all';
  if (!['all','clothing','socks','headwear','bags','patches'].includes(activeFilter)) activeFilter = 'all';
  const normalizeStyleKey = href => customizationKey(href).replace(/^customization(?=#)/, 'custom-patches');
  const requestedStyle = isShop ? normalizeStyleKey(new URLSearchParams(location.search).get('style')) : null;
  let activeStyle = requestedStyle && styleKeys.has(requestedStyle) ? requestedStyle : null;
  function clearIncompatibleStyle() {
    if (!activeStyle || activeFilter === 'all') return;
    const matches = products.filter(product => customizationKey(product.customizationHref) === activeStyle);
    if (!matches.length || !matches.some(product => activeFilter === 'new' ? product.isNew : product.category === activeFilter)) activeStyle = null;
  }
  clearIncompatibleStyle();
  function syncShopUrl() {
    if (!isShop) return;
    const url = new URL(location.href);
    url.searchParams.set('category', activeFilter);
    if (activeStyle && styleKeys.has(activeStyle)) url.searchParams.set('style', activeStyle);
    else url.searchParams.delete('style');
    history.replaceState(null, '', url);
  }
  let toastTimer;
  let bag = enquiryState ? enquiryState.load(products) : [];

  function art(p, extra = '') {
    const imageStyle = p.image
      ? ` style="background-image:url('${escape(p.image)}');background-size:${escape(p.imageSize || 'cover')};background-position:${escape(p.position || 'center')}"`
      : '';
    const imageAlt = p.imageAlt || `${p.color} ${p.name}`;
    return `<div class="product-art ${p.art ? `art-${p.art}` : ''} ${extra}"${imageStyle} role="img" aria-label="${escape(imageAlt)}"></div>`;
  }
  function productHover(p) {
    if (p.hoverImage) {
      const imageAlt = p.hoverImageAlt || `${p.name} worn by model`;
      return `<span class="product-model product-model--onbody" role="img" aria-label="${escape(imageAlt)}" style="background-image:url('${escape(p.hoverImage)}');background-size:${escape(p.hoverImageSize || 'cover')};background-position:${escape(p.hoverImagePosition || 'center')}"></span>`;
    }
    return p.art ? `<span class="product-model model-${p.art}" role="img" aria-label="${escape(p.name)} ${p.category === 'patches' ? 'in use' : 'on model'}"></span>` : '';
  }
  function notify(message) {
    clearTimeout(toastTimer);
    const toast = $('.toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
  }
  function openDialog(id) {
    $$('dialog[open]').forEach(dialog => dialog.close());
    const dialog = document.getElementById(id);
    if(id==='bag-dialog'){
      const rect=$('.bag-button').getBoundingClientRect();
      dialog.style.setProperty('--cart-close-right',`${document.body.getBoundingClientRect().right-rect.right}px`);
      dialog.style.setProperty('--cart-close-top',`${Math.max(12,rect.top)}px`);
    }
    dialog.classList.remove('drawer-closing');
    dialog.showModal();
    document.body.classList.add('modal-open');
    return dialog;
  }
  function dismissDialog(dialog){
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){dialog.close();return;}
    if(dialog.id!=='bag-dialog'){if(dialog.classList.contains('modal-closing'))return;dialog.classList.add('modal-closing');setTimeout(()=>{dialog.close();dialog.classList.remove('modal-closing');},180);return;}
    if(dialog.classList.contains('drawer-closing'))return;
    dialog.classList.add('drawer-closing');
    setTimeout(()=>{dialog.close();dialog.classList.remove('drawer-closing');},280);
  }
  function ensureNetproPatchesDialog() {
    let dialog = $('#netpro-patches-confirm-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'netpro-patches-confirm-dialog';
    dialog.className = 'netpro-patches-confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'netpro-patches-confirm-title');
    dialog.setAttribute('aria-describedby', 'netpro-patches-confirm-copy netpro-patches-confirm-destination');
    dialog.innerHTML = `<div class="netpro-patches-confirm-layout"><section class="netpro-patches-confirm-content"><p class="eyebrow">NETPROPATCHES</p><h2 id="netpro-patches-confirm-title">Your Next Patch Starts Here.</h2><div class="netpro-patches-confirm-offer"><strong>20% OFF</strong><span>On Your First Order</span></div><p class="netpro-patches-confirm-reorder">5% OFF every re-order</p><p id="netpro-patches-confirm-copy" class="netpro-patches-confirm-copy">Continue to our dedicated custom patch website.</p><p class="netpro-patches-confirm-destination"><span id="netpro-patches-confirm-destination"></span></p><ul class="netpro-patches-confirm-benefits" hidden></ul><div class="netpro-patches-confirm-actions"><a class="button primary" href="#" data-netpro-confirm-continue>Continue To NetproPatches <span aria-hidden="true">↗</span></a><button class="button outline close-dialog" type="button" autofocus>Stay Here</button></div></section><figure class="netpro-patches-confirm-image"><img src="assets/netpropatches-offer-embroidered.webp" alt="Embroidered custom patch" id="netpro-patches-confirm-image"></figure><button class="netpro-patches-confirm-close close-dialog" type="button" aria-label="Close NetproPatches offer">×</button></div>`;
    document.body.append(dialog);
    return dialog;
  }
  const netproPatchesDialog = ensureNetproPatchesDialog();
  let netproPatchesInvoker = null;
  function isNetproPatchesUrl(href) {
    try {
      const url = new URL(href, document.baseURI);
      return url.protocol === 'https:' && ['netpropatches.com', 'www.netpropatches.com'].includes(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }
  function netproPatchOffer(destination) {
    const path = destination.pathname.replace(/\/+$/, '').toLowerCase();
    const type = path.endsWith('/netpro2026') ? 'root'
      : path.endsWith('/chenille') ? 'chenille'
      : path.endsWith('/pvc') ? 'pvc'
      : path.endsWith('/woven') ? 'woven'
      : path.endsWith('/embroidered') ? 'embroidered'
      : 'root';
    const typeNames = { root: 'Custom', embroidered: 'Embroidered', chenille: 'Chenille', pvc: 'PVC', woven: 'Woven' };
    const colors = { embroidered: 15, chenille: 9 };
    const benefits = type === 'embroidered' || type === 'chenille'
      ? ['Free Digital Sample · Unlimited Revisions', '7–14 Days · Rush Available', `Up to ${colors[type]} Colors`]
      : [];
    return { type, imageType: type === 'root' ? 'embroidered' : type, typeName: typeNames[type], benefits };
  }
  function restoreNetproPatchesFocus() {
    const invoker = netproPatchesInvoker;
    netproPatchesInvoker = null;
    requestAnimationFrame(() => {
      if (invoker?.isConnected && invoker.getClientRects().length) {
        invoker.focus({ preventScroll: true });
        return;
      }
      const navTrigger = $('.nav-trigger[aria-controls="nav-panel-1"]');
      const fallback = navTrigger?.getClientRects().length ? navTrigger : $('.menu-toggle');
      fallback?.focus({ preventScroll: true });
    });
  }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('cancel',event=>{event.preventDefault();dismissDialog(dialog);});
    $$('.close-dialog', dialog).forEach(button => button.addEventListener('click', () => dismissDialog(dialog)));
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
      if (dialog === netproPatchesDialog) restoreNetproPatchesFocus();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismissDialog(dialog);
    });
  });
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const link = target?.closest('a[href]');
    if (!link || link.matches('[data-netpro-confirm-continue]')) return;
    const href = link.getAttribute('href');
    if (!href || !isNetproPatchesUrl(href)) return;
    event.preventDefault();
    netproPatchesInvoker = link;
    const destination = new URL(href, document.baseURI);
    const offer = netproPatchOffer(destination);
    $('[data-netpro-confirm-continue]', netproPatchesDialog).setAttribute('href', href);
    $('#netpro-patches-confirm-destination', netproPatchesDialog).textContent = `${destination.hostname}${destination.pathname}`;
    const patchImage = $('#netpro-patches-confirm-image', netproPatchesDialog);
    patchImage.src = `assets/netpropatches-offer-${offer.imageType}.webp`;
    patchImage.alt = `${offer.imageType === 'embroidered' ? 'Embroidered' : offer.typeName} custom patch`;
    const benefits = $('.netpro-patches-confirm-benefits', netproPatchesDialog);
    benefits.classList.remove('is-patch-types');
    if (offer.benefits.length) {
      benefits.innerHTML = offer.benefits.map(benefit => `<li>${escape(benefit)}</li>`).join('');
      benefits.hidden = false;
    } else if (offer.type === 'root') {
      benefits.innerHTML = ['Embroidered', 'Chenille', 'PVC', 'Woven'].map(type => `<li>${type}</li>`).join('');
      benefits.hidden = false;
      benefits.classList.add('is-patch-types');
    } else {
      benefits.innerHTML = '';
      benefits.hidden = true;
    }
    const sourceDialog = link.closest('dialog[open]');
    if (sourceDialog) {
      netproPatchesDialog.classList.remove('modal-closing');
      netproPatchesDialog.showModal();
    } else {
      openDialog(netproPatchesDialog.id);
    }
  });

  function ensureFamilyDialog() {
    let dialog = $('#custom-family-dialog');
    if (dialog) return dialog;
    document.body.insertAdjacentHTML('beforeend', `<dialog id="custom-family-dialog" class="custom-family-dialog"><button class="close-dialog floating-close" type="button" aria-label="Close style picker">×</button><p class="eyebrow">CUSTOM REQUEST</p><h2 id="custom-family-title">Choose a style</h2><p class="custom-family-intro">Select a product to start your request. Final specifications will be confirmed with our team.</p><div id="custom-family-options" class="custom-family-options"></div></dialog>`);
    dialog = $('#custom-family-dialog');
    dialog.addEventListener('cancel', event => { event.preventDefault(); dismissDialog(dialog); });
    $('.close-dialog', dialog).addEventListener('click', () => dismissDialog(dialog));
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismissDialog(dialog);
    });
    return dialog;
  }

  function openFamilyPicker(family) {
    const labels = { headwear: 'Headwear', socks: 'Socks' };
    const label = labels[family];
    if (!label) return;
    const familyProducts = products.filter(product => product.category === family);
    const uniqueStyles = [...new Map(familyProducts.map(product => [customizationKey(product.customizationHref), product])).values()];
    const dialog = ensureFamilyDialog();
    $('#custom-family-title', dialog).textContent = `Choose a ${label.toLowerCase()} style`;
    $('#custom-family-options', dialog).innerHTML = uniqueStyles.map(product => `<button type="button" class="custom-family-option" data-family-product="${escape(product.id)}"><span>${escape(customStyleLabel(product.customizationHref))}</span><span aria-hidden="true">${arrow}</span></button>`).join('');
    $$('[data-family-product]', dialog).forEach(button => button.addEventListener('click', () => {
      const product = products.find(candidate => candidate.id === button.dataset.familyProduct);
      if (!product) return;
      showProduct(product.id, { intent: 'custom' });
    }));
    openDialog(dialog.id);
  }

  // Real links let visitors open the custom store in a new tab or copy its address.
  $$('.patch-link').forEach(button => {
    const a = document.createElement('a');
    a.className = button.className;
    a.href = PATCHES_URL;
    a.target = '_self';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', 'Explore Custom Patches');
    a.innerHTML = button.innerHTML;
    button.replaceWith(a);
  });

  const header = $('.site-header');
  const menuButton = $('.menu-toggle');
  function closeMenu() {
    $('#mobile-nav').hidden = true;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open menu');
    header.classList.remove('menu-is-open');
    $('use', menuButton).setAttribute('href', '#i-menu');
  }
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true';
    if (isOpen) return closeMenu();
    $('#mobile-nav').hidden = false;
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Close menu');
    header.classList.add('menu-is-open');
    $('use', menuButton).setAttribute('href', '#i-close');
  });
  $$('#mobile-nav a').forEach(a => a.addEventListener('click', () => { if (!isNetproPatchesUrl(a.href)) closeMenu(); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !netproPatchesDialog.open) closeMenu(); });
  document.addEventListener('click', e => { if (!netproPatchesDialog.open && !header.contains(e.target)) closeMenu(); });
  const mobileQuery = matchMedia('(max-width: 1100px)');
  mobileQuery.addEventListener('change', closeMenu);

  // Pointer and keyboard users share one dropdown state.
  const navGroups = $$('.nav-group');
  const dropdownCloseTimers = new WeakMap();
  function clearDropdownClose(group) {
    const timer = dropdownCloseTimers.get(group);
    if (timer !== undefined) {
      clearTimeout(timer);
      dropdownCloseTimers.delete(group);
    }
  }
  function setDropdown(group, open) {
    clearDropdownClose(group);
    $('.nav-trigger', group).setAttribute('aria-expanded', String(open));
    $('.nav-dropdown', group).hidden = !open;
    if (group.classList.contains('has-customization-menu')) group.classList.toggle('customization-menu-open', open);
  }
  function closeDropdowns() { navGroups.forEach(group => setDropdown(group, false)); }
  $$('.nav-dropdown--customization').forEach(menu => {
    const tabs = $$('[data-customization-tab]', menu);
    const panels = $$('[data-customization-panel]', menu);
    function activateTab(tab) {
      const selected = tab.dataset.customizationTab;
      tabs.forEach(item => {
        const active = item === tab;
        item.setAttribute('aria-selected', String(active));
        item.tabIndex = active ? 0 : -1;
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.customizationPanel !== selected; });
    }
    tabs.forEach((tab, index) => {
      tab.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse') activateTab(tab);
      });
      tab.addEventListener('focus', () => activateTab(tab));
      tab.addEventListener('click', () => activateTab(tab));
      tab.addEventListener('keydown', event => {
        let next = null;
        if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== null) {
          event.preventDefault();
          activateTab(tabs[next]);
          tabs[next].focus({ preventScroll: true });
        }
      });
    });
  });
  navGroups.forEach(group => {
    const trigger = $('.nav-trigger', group);
    const customizationMenu = $('.nav-dropdown--customization', group);
    if (customizationMenu) group.classList.add('has-customization-menu');
    const open = () => { closeDropdowns(); setDropdown(group, true); };
    const scheduleClose = () => {
      if (!customizationMenu) return setDropdown(group, false);
      clearDropdownClose(group);
      dropdownCloseTimers.set(group, setTimeout(() => {
        dropdownCloseTimers.delete(group);
        if (!group.matches(':hover') && !group.contains(document.activeElement)) setDropdown(group, false);
      }, 140));
    };
    group.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(); });
    group.addEventListener('pointerleave', () => { if (!netproPatchesDialog.open && !group.contains(document.activeElement)) scheduleClose(); });
    customizationMenu?.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse') setDropdown(group, true);
    });
    if ($('.nav-dropdown--customization', group)) trigger.addEventListener('focus', open);
    if (trigger.tagName === 'BUTTON') trigger.addEventListener('click', event => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      // A mouse hover already opened the panel; the following click must keep it open.
      const mouseClick = event.pointerType === 'mouse';
      closeDropdowns();
      setDropdown(group, mouseClick || !expanded);
    });
    group.addEventListener('focusout', e => {
      if (netproPatchesDialog.open) return;
      if (!group.contains(e.relatedTarget)) scheduleClose();
    });
    group.addEventListener('keydown', e => {
      if (e.key === 'Escape') { trigger.focus(); closeDropdowns(); }
      if (e.key === 'ArrowDown' && e.target === trigger) {
        e.preventDefault();
        open();
        const firstTarget = $('.nav-customization-tab[aria-selected="true"]', group) || $('.nav-dropdown a', group);
        firstTarget?.focus({ preventScroll: true });
      }
    });
    $$('a', group).forEach(a => a.addEventListener('click', () => { if (!isNetproPatchesUrl(a.href)) closeDropdowns(); }));
  });
  document.addEventListener('click', e => { if (!netproPatchesDialog.open && !e.target.closest('.nav-group')) closeDropdowns(); });
  mobileQuery.addEventListener('change', closeDropdowns);

  // Image accordion: hover, click, focus and keyboard share the same state.
  const categories = $$('.category');
  function activateCategory(index) {
    categories.forEach((category, i) => {
      const active = i === index;
      category.classList.toggle('is-active', active);
      $('.category-toggle', category).setAttribute('aria-expanded', String(active));
      const panel = $('.category-details', category);
      panel.inert = !active;
      $('a', panel).tabIndex = active ? 0 : -1;
    });
  }
  categories.forEach((category, i) => {
    const button = $('.category-toggle', category);
    const imageLink = $('.category-image-link', category);
    category.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse' && !mobileQuery.matches) activateCategory(i);
    });
    imageLink?.addEventListener('focus', () => activateCategory(i));
    button.addEventListener('click', () => activateCategory(i));
    button.addEventListener('focus', () => activateCategory(i));
    button.addEventListener('keydown', e => {
      let next = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % categories.length;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i + categories.length - 1) % categories.length;
      if (e.key === 'Home') next = 0;
      if (e.key === 'End') next = categories.length - 1;
      if (next !== null) { e.preventDefault(); activateCategory(next); $('.category-toggle', categories[next]).focus({ preventScroll: true }); }
    });
  });

  function styleFilterLabel(key) {
    const product = products.find(item => customizationKey(item.customizationHref) === key);
    const name = key === 'customization#patches'
      ? 'Blank Shape Patches'
      : (product?.name || 'Product style').replace(/^Custom\s+/i, '');
    return `Style: ${name}`;
  }

  function renderProducts() {
    if(!document.querySelector('#product-grid'))return;
    if (isShop && window.NETPRO_PRODUCTS_LOAD_FAILED) {
      $('#shop-count').textContent = 'The product catalogue could not load. Refresh this page to try again.';
      $('#pagination').innerHTML = '';
      $('#product-grid').innerHTML = '<p class="empty-results" role="status">Product details are temporarily unavailable. Your saved enquiry list remains in this browser.</p>';
      return;
    }
    let items = products.filter(p => activeFilter === 'all' || (activeFilter === 'new' ? p.isNew : p.category === activeFilter));
    if (isShop && activeStyle) items = items.filter(p => customizationKey(p.customizationHref) === activeStyle);
    if (isShop) {
      const colorSelect = $('[data-shop-filter="color"]');
      if (!colorSelect.dataset.catalogOptions) {
        const colors = [...new Set(products.map(p => p.color))].sort((a, b) => a.localeCompare(b));
        colorSelect.insertAdjacentHTML('beforeend', colors.filter(color => ![...colorSelect.options].some(option => option.value === color)).map(color => `<option>${escape(color)}</option>`).join(''));
        colorSelect.dataset.catalogOptions = 'true';
      }
      const colors=new Set(items.map(p=>p.color)),sizes=new Set(items.filter(p=>p.category!=='patches').flatMap(p=>p.sizes));
      const sizeFilter = $('[data-size]')?.closest('.filter-group');
      if (sizeFilter) sizeFilter.hidden = !sizes.size;
      if(!colors.has(shopState.color))shopState.color="all";
      shopState.size=shopState.size.filter(size=>sizes.has(size));
      $$('[data-shop-filter="color"] option').forEach(o=>o.hidden=o.value!=="all"&&!colors.has(o.value));
      $$("[data-size]").forEach(b=>b.hidden=!sizes.has(b.dataset.size));
      items = items.filter(p => (shopState.color === 'all' || p.color === shopState.color) && (!shopState.size.length || (p.category!=='patches' && shopState.size.some(size=>p.sizes.includes(size)))));
      if (shopState.sort === 'name') items.sort((a,b)=>a.name.localeCompare(b.name));
      const total=items.length, pages=Math.max(1,Math.ceil(total/6)); shopState.page=Math.min(shopState.page,pages);
      $('#shop-count').textContent = total ? `Showing ${(shopState.page-1)*6+1}–${Math.min(shopState.page*6,total)} of ${total} products` : 'No products match your filters';
      $('#pagination').innerHTML = pages>1 ? Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" aria-label="Page ${i+1}" ${i+1===shopState.page?'aria-current="page"':''}>${i+1}</button>`).join('') : '';
      const label={all:'All Products',new:'New Arrivals',clothing:'Clothing',socks:'Socks',headwear:'Headwear',bags:'Bags',patches:'Ready-Made Patches'}[activeFilter];
      $('#shop-title').textContent=label; $('#breadcrumb-current').textContent=label;
      const banner=$('.shop-banner-photo');
      const bannerImages={all:'banner-new.webp',new:'banner-new.webp',clothing:'banner-clothing.webp',socks:'banner-socks.webp',headwear:'banner-headwear.webp',bags:'banner-bags.webp',patches:'banner-patches.webp'};
      const bannerAlts={all:'Blue, white and cream everyday basics',new:'Discover the latest everyday basics',clothing:'Plain everyday clothing in blue, white and cream',socks:'Basic ribbed crew socks in coordinated colors',headwear:'Plain baseball caps in blue, navy and cream',bags:'Cream canvas tote with navy handles and a navy backpack on pale blue studio plinths',patches:'A collection of custom patch styles in blue and cream'};
      const bannerSrc='assets/'+bannerImages[activeFilter]+'?v=20260914-banner4';
      banner.dataset.category=activeFilter;
      banner.alt=bannerAlts[activeFilter];
      if(banner.dataset.requestedSrc!==bannerSrc){
        banner.dataset.requestedSrc=bannerSrc;
        const nextBanner=new Image();
        nextBanner.className='shop-banner-photo';
        nextBanner.alt=bannerAlts[activeFilter];
        nextBanner.dataset.category=activeFilter;
        nextBanner.dataset.requestedSrc=bannerSrc;
        nextBanner.onload=()=>{
          const current=$('.shop-banner-photo');
          if(current.dataset.requestedSrc!==bannerSrc)return;
          if(window.gsap)gsap.killTweensOf(current);
          nextBanner.dataset.category=current.dataset.category;
          nextBanner.alt=current.alt;
          current.replaceWith(nextBanner);
          if(window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo(nextBanner,{opacity:.65},{opacity:1,duration:.3,clearProps:'opacity'});
        };
        nextBanner.src=bannerSrc;
      }

      document.title=label+' — Netpro Sourcing';
      $('#category-select').value=activeFilter;
      $$('#category-options input').forEach(input=>input.checked=input.value===activeFilter);
      const tags=[...(activeFilter!=='all'?[['category',activeFilter,label]]:[]),...(activeStyle?[['style',activeStyle,styleFilterLabel(activeStyle)]]:[]),...(shopState.color!=='all'?[['color',shopState.color,shopState.color]]:[]),...shopState.size.map(v=>['size',v,v])];
      $('#active-filters').innerHTML=tags.length?tags.map(([kind,value,text])=>`<button class="filter-tag" data-remove-filter="${kind}" data-value="${value}" aria-label="Remove ${text} filter">${text}<span aria-hidden="true">×</span></button>`).join(''):'<span class="no-filters">All products</span>';
      $('#clear-filter-tags').hidden=!tags.length;
      $$('[data-size]').forEach(el=>el.setAttribute('aria-pressed',String(shopState.size.includes(el.dataset.size))));
      $$('[data-price]').forEach(el=>el.checked=shopState.price.includes(el.dataset.price));
      $$('[data-shop-filter]').forEach(el=>el.value=shopState[el.dataset.shopFilter]);
      items=items.slice((shopState.page-1)*6,shopState.page*6);
    } else items=(activeFilter==='all' ? ['hoodie','socks','cap','patch'].map(id=>products.find(p=>p.id===id)) : items.slice(0,4)).filter(Boolean);
    $('#product-grid').innerHTML = items.map(p => `<article class="product-card" data-product="${p.id}">
      <button class="product-image" data-detail="${p.id}" aria-label="View ${escape(p.name)} details">${art(p)}${productHover(p)}</button>
      <div class="product-meta"><span class="new-label">${p.category === 'patches' ? 'READY-MADE PATCHES' : isShop ? 'READY STOCK · CUSTOMIZABLE' : 'BASIC · CUSTOMIZABLE'}</span><h3><button class="product-name" data-detail="${p.id}">${escape(p.name)}</button></h3><p class="product-color"><span class="color-dot" style="--swatch:${p.swatch}"></span>${escape(p.color)}</p></div>
    </article>`).join('') || '<p class="empty-results">Try another category or clear your filters to explore more basics.</p>';
    $$('.filters button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
  }
  document.addEventListener('click', e => {
    const filter = e.target.closest('[data-filter]');
    if (filter) {
      activeFilter = filter.dataset.filter; shopState.page=1;
      clearIncompatibleStyle();
      syncShopUrl();
      renderProducts();
      if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.from('.product-card', { opacity: 0, y: 20, duration: .45, stagger: .06, clearProps: 'all' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    const customRequest = e.target.closest('[data-custom-request]');
    if (customRequest) {
      const target = customizationKey(customRequest.dataset.customRequest);
      const product = products.find(candidate => customizationKey(candidate.customizationHref) === target);
      if (product) {
        e.preventDefault();
        showProduct(product.id, { intent: 'custom' });
      }
    }
    const customFamily = e.target.closest('[data-custom-family]');
    if (customFamily) {
      e.preventDefault();
      openFamilyPicker(customFamily.dataset.customFamily);
    }
    const detail = e.target.closest('[data-detail]');
    if (detail) showProduct(detail.dataset.detail);
  });
  renderProducts();
  if(isShop){
    function updateShop(){shopState.page=1;clearIncompatibleStyle();syncShopUrl();renderProducts();if(window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo('.product-card',{opacity:0,y:14},{opacity:1,y:0,duration:.4,stagger:.045,clearProps:'all'});}
    $('#category-select').addEventListener('change',e=>{activeFilter=e.target.value;updateShop();});
    $$('#category-options input').forEach(el=>el.addEventListener('change',()=>{activeFilter=el.value;updateShop();}));
    $$('[data-shop-filter]').forEach(el=>el.addEventListener('change',()=>{shopState[el.dataset.shopFilter]=el.value;updateShop();}));
    $('#clear-filters').addEventListener('click',()=>{activeFilter='all';activeStyle=null;Object.assign(shopState,{color:'all',size:[],price:[],sort:'featured'});$$('[data-shop-filter]').forEach(el=>el.value=shopState[el.dataset.shopFilter]);updateShop();});
    $('#clear-filter-tags').addEventListener('click',()=>$('#clear-filters').click());
    $$('[data-size]').forEach(el=>el.addEventListener('click',()=>{const v=el.dataset.size;shopState.size=shopState.size.includes(v)?shopState.size.filter(x=>x!==v):[...shopState.size,v];updateShop();}));
    $$('[data-price]').forEach(el=>el.addEventListener('change',()=>{shopState.price=$$('[data-price]:checked').map(x=>x.dataset.price);updateShop();}));
    $('#active-filters').addEventListener('click',e=>{const el=e.target.closest('[data-remove-filter]');if(!el)return;const k=el.dataset.removeFilter;if(k==='category')activeFilter='all';else if(k==='style')activeStyle=null;else if(k==='color')shopState.color='all';else shopState[k]=shopState[k].filter(x=>x!==el.dataset.value);updateShop();});
    $('#pagination').addEventListener('click',e=>{const el=e.target.closest('[data-page]');if(el){shopState.page=Number(el.dataset.page);renderProducts();if(!$('#arrivals')){location.href='shop.html';return;}
      $('#arrivals').scrollIntoView();}});
  }

  function requestSpecifications(product) {
    if (product.category === 'patches') {
      return `<section class="detail-specifications" aria-label="Patch details"><dl><div><dt>Stock design</dt><dd>${escape(product.name)}</dd></div><div><dt>Specifications &amp; availability</dt><dd>Dimensions, backing and current availability are confirmed for your enquiry.</dd></div></dl></section>`;
    }
    return `<section class="detail-specifications" aria-label="Product specifications"><dl><div><dt>Reference size options</dt><dd>${escape(product.sizes.join(', '))}</dd></div><div><dt>Measurements</dt><dd>To be confirmed for your project.</dd></div><div><dt>Materials &amp; finish</dt><dd>Confirmed against the selected product, artwork and intended use.</dd></div></dl><p>Final measurements, construction and tolerances are confirmed before artwork approval and production.</p></section>`;
  }

  function showProduct(id, request = {}) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    const isPatchProduct = p.category === 'patches';
    const initialIntent = !isPatchProduct && request.intent === 'custom' ? 'custom' : 'stock';
    const requestMode = isPatchProduct ? '' : `<fieldset class="detail-request-mode"><legend>Request type</legend><label><input type="radio" name="detail-request-intent" value="stock" ${initialIntent === 'stock' ? 'checked' : ''}>Ready stock</label><label><input type="radio" name="detail-request-intent" value="custom" ${initialIntent === 'custom' ? 'checked' : ''}>Custom request</label></fieldset>`;
    const sizeOptionsMarkup = isPatchProduct ? '' : '<fieldset class="detail-sizes"><legend>Choose your size</legend><div class="size-options" id="detail-size-options"></div></fieldset>';
    const customFields = isPatchProduct ? '' : `<div class="detail-custom-fields" id="detail-custom-fields" ${initialIntent === 'custom' ? '' : 'hidden'}><fieldset class="detail-custom-options"><legend>What would you like to explore? <span>(optional)</span></legend><label><input type="checkbox" data-request-option value="logo">Add a logo</label><label><input type="checkbox" data-request-option value="material">Change color or material</label><label><input type="checkbox" data-request-option value="style">Develop a style</label></fieldset><label class="detail-notes-label" for="detail-request-notes">Project note <span>(optional)</span></label><textarea id="detail-request-notes" maxlength="500" rows="3" placeholder="Add a short note about your request"></textarea></div>`;
    const customizationHref = p.externalCustomizationHref || p.customizationHref;
    const stylesLinkLabel = isPatchProduct ? 'Need custom patches? Visit NetproPatches ↗' : 'View styles &amp; techniques ↗';
    $('#product-detail').innerHTML = `<div class="detail-layout"><div class="detail-gallery"><div class="gallery-thumbs" aria-label="Product images"></div><div class="detail-visual">${art(p)}</div></div><div class="detail-copy" tabindex="0" aria-label="Product details and request options"><span class="new-label" id="detail-request-badge">${initialIntent === 'custom' ? 'CUSTOM REQUEST' : (isPatchProduct ? 'READY-MADE PATCHES' : 'READY STOCK')}</span><h2>${escape(p.name)}</h2><div class="detail-price">Request Pricing</div><p>${escape(p.description)}</p><p class="product-color"><span class="color-dot" style="--swatch:${escape(p.swatch)}"></span>${escape(p.color)}</p>${requestMode}${sizeOptionsMarkup}<div class="detail-quantity"><label for="detail-quantity">Quantity</label><div><button id="quantity-less" aria-label="Decrease quantity">−</button><input id="detail-quantity" type="number" min="1" max="100000" value="1" aria-label="Requested quantity"><button id="quantity-more" aria-label="Increase quantity">+</button></div></div>${customFields}<button id="add-to-bag" class="button primary">Add to Enquiry ${arrow}</button><a id="detail-styles-link" class="text-link detail-styles-link" href="${escape(customizationHref)}" ${isPatchProduct || initialIntent === 'custom' ? '' : 'hidden'}>${stylesLinkLabel}</a>${requestSpecifications(p)}</div></div>`;
    const detailDescription = $('.detail-copy > p:not(.product-color)');
    detailDescription.id = 'detail-description';
    const detailColor = $('.detail-copy .product-color');
    const colorSwatch = $('.color-dot', detailColor);
    const colorLabel = document.createElement('span');
    colorLabel.id = 'detail-color-value';
    colorLabel.textContent = `${initialIntent === 'custom' ? 'Reference color: ' : ''}${p.color}`;
    detailColor.replaceChildren(colorSwatch, colorLabel);
    if (initialIntent === 'custom') {
      detailDescription.textContent = 'Use this style as a starting point. Share your preferred colors, materials and artwork; final specifications are confirmed with your quote.';
    }
    const gallery=[{name:'Product view',html:art(p)},...(p.id==='hoodie'?[{name:'On-model illustration',html:'<div class="story-art story-art-0" role="img" aria-label="Sky blue hoodie on model"></div>'},{name:'Stitching illustration',html:'<div class="story-art story-art-1" role="img" aria-label="Hoodie stitching detail"></div>'},{name:'Fabric illustration',html:'<div class="story-art story-art-2" role="img" aria-label="Blue fabric close-up"></div>'}]:[{name:'Detail zoom',html:art(p,'gallery-zoom')}])];
    $('.gallery-thumbs').innerHTML=gallery.map((item,i)=>`<button class="gallery-thumb" aria-label="${item.name}" aria-pressed="${i===0}" data-gallery="${i}">${item.html}</button>`).join('');
    $$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{const item=gallery[Number(button.dataset.gallery)];$('.detail-visual').innerHTML=item.html;$$('[data-gallery]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));}));
    const productDialog = $('#product-dialog');
    productDialog.classList.toggle('is-custom-request', initialIntent === 'custom');
    productDialog.classList.toggle('is-patch-stock', isPatchProduct);
    let intent = initialIntent;
    let selectedSize = isPatchProduct ? 'Not specified' : intent === 'custom' ? 'To be confirmed' : p.sizes[0];
    let quantity=1;
    const sizeOptions = $('#detail-size-options');
    function renderSizeOptions() {
      if (isPatchProduct) return;
      const values = intent === 'custom' ? [...p.sizes, 'To be confirmed'] : p.sizes;
      if (!values.includes(selectedSize)) selectedSize = intent === 'custom' ? 'To be confirmed' : p.sizes[0];
      sizeOptions.innerHTML = values.map(size => `<button type="button" data-detail-size="${escape(size)}" aria-pressed="${size === selectedSize}">${escape(size)}</button>`).join('');
      $$('[data-detail-size]', sizeOptions).forEach(button => button.addEventListener('click', () => {
        selectedSize = button.dataset.detailSize;
        $$('[data-detail-size]', sizeOptions).forEach(el => el.setAttribute('aria-pressed', String(el === button)));
      }));
    }
    function setIntent(nextIntent) {
      const previousIntent = intent;
      intent = nextIntent === 'custom' ? 'custom' : 'stock';
      if (intent === 'stock' && !p.sizes.includes(selectedSize)) selectedSize = p.sizes[0];
      if (previousIntent === 'custom' && intent === 'stock') {
        $$('[data-request-option]').forEach(input => { input.checked = false; });
        $('#detail-request-notes').value = '';
      }
      $('#detail-description').textContent = intent === 'custom'
        ? 'Use this style as a starting point. Share your preferred colors, materials and artwork; final specifications are confirmed with your quote.'
        : p.description;
      $('#detail-color-value').textContent = `${intent === 'custom' ? 'Reference color: ' : ''}${p.color}`;
      $('#detail-custom-fields').hidden = intent !== 'custom';
      $('#detail-styles-link').hidden = !isPatchProduct && intent !== 'custom';
      $('#detail-request-badge').textContent = intent === 'custom' ? 'CUSTOM REQUEST' : (p.category === 'patches' ? 'READY-MADE PATCHES' : 'READY STOCK');
      productDialog.classList.toggle('is-custom-request', intent === 'custom');
      renderSizeOptions();
    }
    $$('[name="detail-request-intent"]').forEach(input => input.addEventListener('change', () => setIntent(input.value)));
    renderSizeOptions();
    $('#quantity-less').addEventListener('click',()=>{$('#detail-quantity').value=quantity=Math.max(1,quantity-1);});
    $('#quantity-more').addEventListener('click',()=>{$('#detail-quantity').value=quantity=Math.min(100000,quantity+1);});
    $('#detail-quantity').addEventListener('change', e => { quantity=Math.max(1,Math.min(100000,Math.floor(Number(e.target.value)||1)));e.target.value=quantity; });
    const dialog = openDialog('product-dialog');
    $('#add-to-bag').addEventListener('click', () => {
      if (window.NETPRO_QUOTE_SUBMITTING) return notify('Your enquiry is being submitted. Please wait before adding another request.');
      const customization = intent === 'custom' ? $$('[data-request-option]:checked').map(input => input.value) : [];
      const notes = intent === 'custom' ? $('#detail-request-notes').value.slice(0, 500) : '';
      const result = enquiryState.add({ id: p.id, size: selectedSize, quantity, intent, customization, notes }, products);
      if (!result.ok) return notify(result.reason === 'item-limit'
        ? 'Your enquiry list can hold up to 50 request lines. Remove a line to add another.'
        : result.reason === 'quantity-limit'
          ? 'This matching request is already at the 100,000 unit limit.'
          : 'This request could not be added. Please check its size and options.');
      bag = result.items;
      updateBagCount();
      dialog.close();
      renderBag();
      openDialog('bag-dialog');
      notify(`${p.name} ${intent === 'custom' ? 'custom request' : 'request'} added to your enquiry list`);
    });
  }
  const customizationLabels = { logo: 'Add a logo', material: 'Change color or material', style: 'Develop a style' };
  let suppressBagRefresh = false;
  function identityAt(index) {
    const item = bag[Number(index)];
    return item ? enquiryState.identityKey(item) : '';
  }
  function captureBagInteraction() {
    const root = $('#bag-items');
    const active = document.activeElement;
    const openEditor = $('.bag-request-editor[open]', root);
    const focusKey = root.contains(active) ? active.dataset.editorFocus : '';
    let selectionStart = null;
    let selectionEnd = null;
    try {
      if (typeof active?.selectionStart === 'number') {
        selectionStart = active.selectionStart;
        selectionEnd = active.selectionEnd;
      }
    } catch { /* Number inputs and other controls do not expose text selections. */ }
    return {
      openIndex: openEditor?.dataset.editorIndex ?? '',
      openIdentity: openEditor ? identityAt(openEditor.dataset.editorIndex) : '',
      focusIndex: focusKey ? active.dataset.editorIndex : '',
      focusIdentity: focusKey ? identityAt(active.dataset.editorIndex) : '',
      focusKey,
      selectionStart,
      selectionEnd
    };
  }
  function restoreBagInteraction(interaction) {
    if (!interaction) return;
    const root = $('#bag-items');
    const openByIdentity = interaction.openIdentity ? bag.findIndex(item => enquiryState.identityKey(item) === interaction.openIdentity) : -1;
    const openIndex = openByIdentity >= 0 ? openByIdentity : interaction.openIndex !== '' ? Number(interaction.openIndex) : -1;
    if (Number.isInteger(openIndex) && openIndex >= 0) {
      const editor = $(`.bag-request-editor[data-editor-index="${openIndex}"]`, root);
      if (editor) editor.open = true;
    }
    const focusByIdentity = interaction.focusIdentity ? bag.findIndex(item => enquiryState.identityKey(item) === interaction.focusIdentity) : -1;
    const focusIndex = focusByIdentity >= 0 ? focusByIdentity : interaction.focusIndex !== '' ? Number(interaction.focusIndex) : -1;
    if (interaction.focusKey && Number.isInteger(focusIndex) && focusIndex >= 0) {
      const focus = $(`[data-editor-index="${focusIndex}"][data-editor-focus="${interaction.focusKey}"]`, root);
      if (focus) {
        focus.focus({ preventScroll: true });
        if (interaction.selectionStart !== null && typeof focus.setSelectionRange === 'function') {
          try { focus.setSelectionRange(interaction.selectionStart, interaction.selectionEnd); } catch { /* Some input types do not support text selections. */ }
        }
      }
    }
  }
  function lineRequestSummary(item) {
    const label = item.intent === 'custom' ? 'Custom request' : 'Ready stock';
    const options = item.customization.map(value => customizationLabels[value]).filter(Boolean);
    return `${label}${options.length ? ` · ${options.join(', ')}` : ''}${item.notes ? ` · ${item.notes}` : ''}`;
  }
  function lineRequestEditor(item, index, product) {
    return `<details class="bag-request-editor" data-editor-index="${index}"><summary>Edit request</summary><div class="bag-request-fields"><label>Request type<select data-bag-intent="${index}" data-editor-index="${index}" data-editor-focus="intent"><option value="stock" ${item.intent === 'stock' ? 'selected' : ''}>Ready stock</option><option value="custom" ${item.intent === 'custom' ? 'selected' : ''}>Custom request</option></select></label><fieldset data-bag-customization="${index}" ${item.intent === 'custom' ? '' : 'hidden'}><legend>Custom options <span>(optional)</span></legend>${Object.entries(customizationLabels).map(([value, label]) => `<label><input type="checkbox" data-bag-option="${index}" data-editor-index="${index}" data-editor-focus="option-${value}" value="${value}" ${item.customization.includes(value) ? 'checked' : ''}>${label}</label>`).join('')}<label class="bag-notes-label">Project note <textarea data-bag-notes="${index}" data-editor-index="${index}" data-editor-focus="notes" maxlength="500" rows="2">${escape(item.notes)}</textarea></label></fieldset><a class="text-link" href="${escape(product.customizationHref)}">View styles &amp; techniques ↗</a></div></details>`;
  }
  function updateBagItem(index, patch) {
    const interaction = captureBagInteraction();
    const previous = bag[index];
    suppressBagRefresh = true;
    const result = enquiryState.update(index, patch, products);
    suppressBagRefresh = false;
    if (!result.ok) {
      notify(result.reason === 'quantity-limit' ? 'A matching request cannot exceed 100,000 units.' : 'This request could not be updated.');
      return;
    }
    bag = result.items;
    const updated = { ...previous, ...patch };
    const intent = updated.intent === 'custom' ? 'custom' : 'stock';
    const identity = enquiryState.identityKey({
      id: updated.id,
      size: updated.size,
      intent,
      customization: intent === 'custom' ? enquiryState.OPTION_ORDER.filter(value => (updated.customization || []).includes(value)) : [],
      notes: intent === 'custom' && typeof updated.notes === 'string' ? updated.notes.slice(0, 500) : ''
    });
    const nextIndex = bag.findIndex(item => enquiryState.identityKey(item) === identity);
    if (nextIndex >= 0) {
      if (interaction.openIndex !== '') {
        interaction.openIndex = String(nextIndex);
        interaction.openIdentity = identity;
      }
      if (interaction.focusKey) {
        interaction.focusIndex = String(nextIndex);
        interaction.focusIdentity = identity;
      }
      interaction.openIdentity = identity;
      interaction.focusIdentity = identity;
    }
    renderBag(interaction);
  }
  function updateBagCount() {
    const count = bag.reduce((sum, item) => sum + item.quantity, 0);
    $('.bag-count').textContent = count;
    $('.bag-count').hidden = !count;
    $('.bag-button').setAttribute('aria-label', `Open enquiry list, ${count} ${count === 1 ? 'item' : 'items'}`);
    $('#bag-total-count').textContent = count;
  }
  function renderBag(interaction = null) {
    updateBagCount();
    if (window.NETPRO_PRODUCTS_LOAD_FAILED) {
      $('#bag-items').innerHTML = '<p class="empty-bag">Product details could not load. Your saved enquiry list is still stored in this browser. Refresh this page to try again.</p>';
      $('#bag-summary').innerHTML = '<p class="cart-empty-summary">You can return to the Shop after refreshing to review your saved products.</p>';
      return;
    }
    if (!bag.length) {
      $('#bag-items').innerHTML = `<div class="empty-bag"><svg aria-hidden="true"><use href="#i-bag"/></svg><h3>${pageHeading('A little room for something new.', 'A Little Room For Something New.')}</h3><p>Add products to build your enquiry.</p><button class="button primary bag-continue">Explore products ${arrow}</button></div>`;
      $('#bag-summary').innerHTML = '<p class="cart-empty-summary">You can also request a quote without selecting products.</p>';
    } else {
      $('#bag-items').innerHTML = bag.map((item, i) => {
        const p = products.find(p => p.id === item.id);
        const itemDetails = item.size === 'Not specified' ? p.color : `${p.color} · ${item.size}`;
        return `<article class="bag-item">${art(p)}<div class="cart-item-name"><small>${escape(p.category)}</small><h3>${escape(p.name)}</h3><p>${escape(itemDetails)}</p><p class="bag-request-summary">${escape(lineRequestSummary(item))}</p></div><div class="quantity"><button type="button" data-quantity="${i}" data-delta="-1" data-editor-index="${i}" data-editor-focus="quantity-minus" aria-label="Decrease ${escape(p.name)} quantity">−</button><span>${item.quantity}</span><button type="button" data-quantity="${i}" data-delta="1" data-editor-index="${i}" data-editor-focus="quantity-plus" aria-label="Increase ${escape(p.name)} quantity" ${item.quantity >= 100000 ? 'disabled' : ''}>+</button></div><button type="button" class="remove-item" data-remove="${i}" aria-label="Remove ${escape(p.name)}">×</button></article>`;
      }).join('');
      $('#bag-summary').innerHTML = `<div class="subtotal"><span>Requested Units</span><span>${bag.reduce((n,item)=>n+item.quantity,0)}</span></div><p class="cart-tax-note">Indicative quantities only. Artwork approval, minimum quantities, unit pricing and delivery will be confirmed in your quotation.</p><a class="button primary cart-checkout" href="quote.html">Request a Quote →</a><p class="bag-note">Add your company and project details on the next page. This is an enquiry, not an order.</p>`;
    }
    $$('.bag-continue').forEach(button => button.addEventListener('click', () => {
      $('#bag-dialog').close();
      activeFilter = 'all'; renderProducts();
      if(!$('#arrivals')){location.href='shop.html';return;}
      $('#arrivals').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }));
    restoreBagInteraction(interaction);
  }
  $('#bag-dialog').addEventListener('click', e => {
    const quantity = e.target.closest('[data-quantity]');
    const remove = e.target.closest('[data-remove]');
    if (quantity) {
      const i = Number(quantity.dataset.quantity);
      updateBagItem(i, { quantity: Math.min(100000, Math.max(1, bag[i].quantity + Number(quantity.dataset.delta))) });
    } else if (remove) {
      bag = enquiryState.remove(Number(remove.dataset.remove), products);
    } else return;
  });
  $('#bag-dialog').addEventListener('change', e => {
    const intent = e.target.closest('[data-bag-intent]');
    const notes = e.target.closest('[data-bag-notes]');
    const option = e.target.closest('[data-bag-option]');
    if (intent) {
      const index = Number(intent.dataset.bagIntent);
      const item = bag[index];
      const product = products.find(p => p.id === item?.id);
      if (!item || !product) return;
      const custom = intent.value === 'custom';
      updateBagItem(index, {
        intent: custom ? 'custom' : 'stock',
        size: !custom && !product.sizes.includes(item.size) ? product.sizes[0] : item.size,
        customization: custom ? item.customization : [],
        notes: custom ? item.notes : ''
      });
    } else if (notes) {
      updateBagItem(Number(notes.dataset.bagNotes), { notes: notes.value.slice(0, 500) });
    } else if (option) {
      const index = Number(option.dataset.bagOption);
      const fieldset = option.closest('[data-bag-customization]');
      const customization = $$('[data-bag-option]:checked', fieldset).map(input => input.value);
      updateBagItem(index, { customization });
    }
  });
  updateBagCount();
  window.addEventListener('enquiry-updated',()=>{
    const interaction=$('#bag-dialog').open&&!suppressBagRefresh?captureBagInteraction():null;
    bag=enquiryState.get();
    updateBagCount();
    if(interaction)renderBag(interaction);
  });

  function searchProducts() {
    const q = $('#search-input').value.trim().toLowerCase();
    const aliases = { sock: 'socks', hats: 'cap', hat: 'cap', sweatshirt: 'hoodie' };
    const query = aliases[q] || q;
    const results = products.filter(p => `${p.name} ${p.category} ${p.color}`.toLowerCase().includes(query));
    $('#search-results').innerHTML = results.length ? results.map(p => `<button class="result-item" data-detail="${p.id}">${art(p)}<span><strong>${p.name}</strong><small>${p.color}</small></span><span>Request pricing</span></button>`).join('') : '<p class="search-empty">No matches yet. Try “hoodie”, “cap” or “patch”.</p>';
  }
  $('#search-input').addEventListener('input', searchProducts);
  $$('[data-open]').forEach(button => button.addEventListener('click', () => {
    closeMenu();
    if (button.dataset.open === 'search') { openDialog('search-dialog'); searchProducts(); $('#search-input').focus(); }
    if (button.dataset.open === 'bag') { renderBag(); openDialog('bag-dialog'); }
  }));
  const info = {
    shipping: [pageHeading('Shipping information', 'Shipping Information'), 'We’re preparing the store for launch. Delivery destinations, rates and estimated times will be published here before online ordering opens.'],
    returns: [pageHeading('Returns & exchanges', 'Returns & Exchanges'), 'The returns and exchanges policy is being prepared. Eligibility, timeframes and instructions will be available before the store accepts orders.'],
    sizes: [pageHeading('Find your everyday fit', 'Find Your Everyday Fit'), 'Product-specific measurements will be added with the final collection. Confirm measurements and tolerances before ordering.'],
    contact: ['Contact Netpro', 'Email: info@netpropatches.com. Sales Manager: Stanley Poon. Address: Room 1202, Block A, Wanda Plaza, Shiji Road, Meiling Street, Jinjiang, Quanzhou 362200, China.'],
    privacy: ['Privacy Policy', 'Submitted contact and project details are used to respond to your request. Your enquiry list is stored in this browser.'],
    terms: [pageHeading('Terms of Service', 'Terms Of Service'), 'This catalogue accepts enquiries. Orders require a separately agreed quotation and commercial terms.']
  };
  $$('[data-info]').forEach(button => button.addEventListener('click', () => {
    const [title, body] = info[button.dataset.info];
    $('#info-title').textContent = title;
    $('#info-content').innerHTML = `<p>${body}</p>` + (button.dataset.info === 'contact' ? `<a class="button primary" href="${PATCHES_URL}" target="_blank" rel="noopener noreferrer">Visit Netpro Patches ↗</a>` : '');
    openDialog('info-dialog');
  }));

  let ticking = false;
  let directionReferenceY = window.scrollY;
  function updateScroll() {
    const scrollPosition = window.scrollY;
    header.classList.toggle('is-pinned', isHome && scrollPosition > 70);
    header.classList.toggle('is-scrolled', isHome ? scrollPosition > 2 : scrollPosition > 70);
    if (isHome) {
      const keepHeaderVisible = header.classList.contains('menu-is-open')
        || navGroups.some(group => $('.nav-trigger', group).getAttribute('aria-expanded') === 'true')
        || Boolean($('dialog[open]'))
        || (header.contains(document.activeElement) && document.activeElement.matches(':focus-visible'));
      if (scrollPosition <= 70 || keepHeaderVisible) {
        header.classList.remove('is-hidden');
        directionReferenceY = scrollPosition;
      } else if (scrollPosition > directionReferenceY + 6) {
        header.classList.add('is-hidden');
        directionReferenceY = scrollPosition;
      } else if (scrollPosition < directionReferenceY - 6) {
        header.classList.remove('is-hidden');
        directionReferenceY = scrollPosition;
      }
    }
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.scroll-progress').style.transform = `scaleX(${max > 0 ? Math.min(1, scrollPosition / max) : 0})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateScroll); ticking = true; } }, { passive: true });

  if (shouldResetHomeReload) {
    let homeReloadFinalized = false;
    const finalizeHomeReload = () => {
      if (homeReloadFinalized) return;
      homeReloadFinalized = true;
      window.ScrollTrigger?.clearScrollMemory?.();
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      updateScroll();
      try { history.scrollRestoration = previousScrollRestoration; } catch { /* Ignore unsupported history controls. */ }
    };
    const resetHomeReload = event => {
      if (event?.persisted) return;
      requestAnimationFrame(() => requestAnimationFrame(finalizeHomeReload));
    };
    window.addEventListener('pageshow', resetHomeReload, { once: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  updateScroll();

  if (isHome) {
    const processSection = $('.home-process');
    const processReveals = processSection ? $$('.process-reveal', processSection) : [];
    const reduceProcessMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (processSection && processReveals.length) {
      if (reduceProcessMotion || !('IntersectionObserver' in window)) {
        processReveals.forEach(element => element.classList.add('process-reveal--visible'));
      } else {
        const processObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('process-reveal--visible');
            processObserver.unobserve(entry.target);
          });
        }, { rootMargin: '0px', threshold: 0.1 });

        processReveals.forEach(element => processObserver.observe(element));
        processSection.classList.add('process-motion-ready');
      }
    }
  }

  // Local GSAP files allow scroll animations to work offline as well as over HTTP.
  if(isShop && window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    gsap.registerPlugin(ScrollTrigger);
    gsap.fromTo('.shop-banner-photo',{opacity:0},{opacity:1,duration:.8,overwrite:true});
    gsap.from('.shop-banner>div:first-child>*',{y:22,opacity:0,duration:.7,stagger:.12,clearProps:'all'});

    gsap.from('.shop-layout',{y:24,opacity:0,duration:.7,delay:.2,clearProps:'all'});
  }
  if (isHome && window.gsap && window.ScrollTrigger && $('.hero')) {
    gsap.registerPlugin(ScrollTrigger);
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      const slides = $$('.hero-photo');
      let slideTimeline;
      const syncSlidePlayback = () => {
        if (!slideTimeline) return;
        if (document.hidden) slideTimeline.pause();
        else slideTimeline.resume();
      };

      if (slides.length > 1) {
        gsap.set(slides, { opacity: 0, x: 0, xPercent: 100, scale: 1.005 });
        gsap.set(slides[0], { opacity: 1, xPercent: 0, scale: 1.005 });
        slideTimeline = gsap.timeline({ repeat: -1, paused: document.hidden });
        slides.slice(1).forEach((slide, index) => {
          const previous = slides[index];
          slideTimeline.to(slide, { opacity: 1, xPercent: 0, duration: 1.1, ease: 'power2.out' }, '+=4.5');
          slideTimeline.to(previous, { opacity: 0, xPercent: -100, duration: 1.1, ease: 'power2.out' }, '<');
          slideTimeline.set(previous, { xPercent: 100 });
        });
        const lastSlide = slides[slides.length - 1];
        slideTimeline.to(slides[0], { opacity: 1, xPercent: 0, duration: 1.1, ease: 'power2.out' }, '+=4.5');
        slideTimeline.to(lastSlide, { opacity: 0, xPercent: -100, duration: 1.1, ease: 'power2.out' }, '<');
        slideTimeline.set(lastSlide, { xPercent: 100 });
        document.addEventListener('visibilitychange', syncSlidePlayback);
      }

      gsap.from('.hero-copy h1 span', {
        y: 24,
        opacity: 0,
        duration: .95,
        stagger: .2,
        delay: .12,
        ease: 'power2.out',
        clearProps: 'transform,opacity'
      });
      gsap.from('.hero-copy > p, .hero-actions', {
        y: 24,
        opacity: 0,
        duration: .95,
        stagger: .2,
        delay: .32,
        ease: 'power2.out',
        clearProps: 'transform,opacity'
      });
      $$('.home-page .reveal').forEach(el => gsap.from(el, {
        y: 24,
        opacity: 0,
        duration: .95,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 91%', once: true },
        clearProps: 'transform,opacity'
      }));
      const chapter = $('.home-story');
      const chapterPinStage = chapter && chapter.closest('.home-story-pin-stage');
      const chapterAccordion = chapter && chapter.querySelector('.accordion');
      const chapterAccordionStage = chapter && chapter.querySelector('.home-story-accordion-stage');
      const chapterWipe = chapter && chapter.querySelector('.home-story-wipe');
      const processSection = $('.home-process');
      const chapterMotion = gsap.matchMedia();

      if (chapterAccordion && chapterWipe) {
        const categoriesInChapter = $$('.category', chapterAccordion);
        const copy = chapter.querySelector('.home-story-copy');

        const makeVisualClone = (source, className) => {
          if (!source) return null;
          const content = source.cloneNode(true);
          const clone = document.createElement('div');
          clone.className = className;
          clone.setAttribute('aria-hidden', 'true');
          clone.setAttribute('inert', '');
          content.removeAttribute('id');
          content.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
          content.querySelectorAll('a').forEach(link => {
            const visualLink = document.createElement('span');
            visualLink.className = link.className;
            visualLink.innerHTML = link.innerHTML;
            visualLink.setAttribute('aria-hidden', 'true');
            link.replaceWith(visualLink);
          });
          while (content.firstChild) clone.appendChild(content.firstChild);
          source.appendChild(clone);
          return clone;
        };

        const createDesktopChapterTimeline = () => {
          const copyOverlay = makeVisualClone(copy, 'home-story-copy-overlay');
          const chapterEntranceOffsets = [0, .10, .04, .15];
          const chapterStageOffsets = [0, .22, .10, .32];
          const entranceDuration = 1.5;
          const entranceEnd = Math.max(...chapterStageOffsets.map(offset => offset + entranceDuration));
          const alignedHold = .25;
          const wipeDuration = 1.2;
          const wipeStart = entranceEnd + alignedHold;
          const wipeEnd = wipeStart + wipeDuration;
          const releaseHold = .2;
          const chapterTimelineDuration = wipeEnd + releaseHold;
          const chapterScrollDistance = () => Math.round(innerHeight * 1.8);
          const chapterWheelHoldDuration = 650;
          const chapterWheelReleaseThreshold = .999;
          const chapterWheelRearmThreshold = .95;
          const chapterWheelBoundaryTolerance = 2;
          const chapterDarkSurface = getComputedStyle(chapter).getPropertyValue('--home-charcoal').trim() || '#2d2d2d';

          chapter.classList.remove('is-dark');
          gsap.set(chapterWipe, { scaleY: 0 });

          const chapterAccordionTop = () => chapterAccordionStage
            ? chapterAccordionStage.offsetTop
            : chapterAccordion.offsetTop;
          const initialCategoryY = index => Math.max(0, innerHeight - chapterAccordionTop())
            + innerHeight * .08
            + (chapterEntranceOffsets[index] || 0) * innerHeight;
          const updateChapterOverlays = () => {
            const scaleY = gsap.utils.clamp(0, 1, Number(gsap.getProperty(chapterWipe, 'scaleY')) || 0);
            const chapterRect = chapter.getBoundingClientRect();
            const boundaryY = (1 - scaleY) * chapterRect.height;
            [[copy, copyOverlay]].forEach(([source, overlay]) => {
              if (!source || !overlay) return;
              const sourceRect = source.getBoundingClientRect();
              const sourceTop = sourceRect.top - chapterRect.top;
              const clipTop = gsap.utils.clamp(0, sourceRect.height, boundaryY - sourceTop);
              overlay.style.clipPath = `inset(${clipTop}px 0 0 0)`;
            });
          };

          let chapterTimeline;
          chapterTimeline = gsap.timeline({
            onUpdate: updateChapterOverlays,
            scrollTrigger: {
              trigger: chapterPinStage || chapter,
              start: 'top top',
              end: () => `+=${chapterScrollDistance()}`,
              scrub: 1,
              invalidateOnRefresh: true,
              onRefresh: updateChapterOverlays,
              onLeave: self => {
                self.getTween?.()?.progress(1);
                chapterTimeline?.progress(1);
                updateChapterOverlays();
              },
              onLeaveBack: self => {
                self.getTween?.()?.progress(0);
                chapterTimeline?.progress(0);
                updateChapterOverlays();
              }
            }
          });

          let chapterWipeTimeline;
          let chapterWheelHoldTimer = 0;
          let chapterWheelHoldStartedAt = 0;
          let chapterWheelReleased = false;
          const clearChapterWheelHoldTimer = () => {
            if (!chapterWheelHoldTimer) return;
            window.clearTimeout(chapterWheelHoldTimer);
            chapterWheelHoldTimer = 0;
          };
          const rearmChapterWheelHold = () => {
            clearChapterWheelHoldTimer();
            chapterWheelHoldStartedAt = 0;
            chapterWheelReleased = false;
          };
          const releaseChapterWheelHold = () => {
            clearChapterWheelHoldTimer();
            chapterWheelHoldStartedAt = 0;
            chapterWheelReleased = true;
          };
          const getChapterWipeScale = () => gsap.utils.clamp(0, 1, Number(gsap.getProperty(chapterWipe, 'scaleY')) || 0);
          const completeChapterWheelHold = () => {
            if (!chapterWheelHoldStartedAt || performance.now() - chapterWheelHoldStartedAt < chapterWheelHoldDuration) return;
            const chapterTrigger = chapterTimeline.scrollTrigger;
            if (!chapterTrigger) return;
            const scrollY = window.scrollY;
            const atBoundary = scrollY >= chapterTrigger.end - chapterWheelBoundaryTolerance
              && scrollY <= chapterTrigger.end + chapterWheelBoundaryTolerance;
            const wipeComplete = getChapterWipeScale() >= chapterWheelReleaseThreshold;
            if (scrollY > chapterTrigger.end + chapterWheelBoundaryTolerance) {
              releaseChapterWheelHold();
              return;
            }
            if (!atBoundary || !wipeComplete) {
              if (!atBoundary || getChapterWipeScale() < chapterWheelRearmThreshold) rearmChapterWheelHold();
              return;
            }
            releaseChapterWheelHold();
          };
          const syncChapterWheelHold = () => {
            const chapterTrigger = chapterTimeline.scrollTrigger;
            if (!chapterTrigger) return;
            const scrollY = window.scrollY;
            const wipeScale = getChapterWipeScale();
            if (scrollY > chapterTrigger.end + chapterWheelBoundaryTolerance) {
              releaseChapterWheelHold();
              return;
            }
            if (scrollY < chapterTrigger.end - chapterWheelBoundaryTolerance || wipeScale < chapterWheelRearmThreshold) {
              rearmChapterWheelHold();
              return;
            }
            if (chapterWheelReleased || wipeScale < chapterWheelReleaseThreshold) return;
            if (chapterWheelHoldStartedAt) {
              completeChapterWheelHold();
              return;
            }
            chapterWheelHoldStartedAt = performance.now();
            chapterWheelHoldTimer = window.setTimeout(completeChapterWheelHold, chapterWheelHoldDuration);
          };
          const updateChapterWipe = () => {
            updateChapterOverlays();
            syncChapterWheelHold();
          };

          let processOverlapTween;
          let processOverlapTrigger;
          let processCoverTail;
          let clearProcessOverlapVisuals = () => {};

          if (processSection && chapterAccordion) {
            chapter.classList.add('process-sticky-ready');
            chapterPinStage?.classList.add('process-sticky-ready');
            processSection.classList.add('process-sticky-ready');
            processCoverTail = document.createElement('div');
            processCoverTail.className = 'home-process-cover-tail';
            processCoverTail.setAttribute('aria-hidden', 'true');
            processCoverTail.setAttribute('inert', '');
            processSection.appendChild(processCoverTail);
            gsap.set(processCoverTail, { scaleY: 0 });
            const overlapProxy = { progress: 0 };
            let rawProgress = 0;
            let overlapViewportHeight = innerHeight;
            let overlapLayerActive = false;
            let overlapRefreshInProgress = false;
            const setProcessY = gsap.quickSetter(processSection, 'y', 'px');
            const setProcessCoverTailScale = gsap.quickSetter(processCoverTail, 'scaleY');
            const setProcessOverlapLayer = active => {
              if (overlapLayerActive === active) return;
              overlapLayerActive = active;
              processSection.classList.toggle('process-overlap-layer', active);
            };
            clearProcessOverlapVisuals = () => {
              setProcessY(0);
              setProcessCoverTailScale(0);
              gsap.set(processSection, { clearProps: 'transform' });
              setProcessOverlapLayer(false);
            };

            const updateOverlapPositions = () => {
              if (overlapRefreshInProgress) return;
              const raw = gsap.utils.clamp(0, 1, rawProgress);
              const smoothed = gsap.utils.clamp(0, 1, overlapProxy.progress);
              const settledAtStart = raw <= .0001 && smoothed <= .0001;
              const settledAtEnd = raw >= .9999 && smoothed >= .9999;

              if (!processOverlapTrigger?.isActive && (settledAtStart || settledAtEnd)) {
                clearProcessOverlapVisuals();
                return;
              }

              setProcessOverlapLayer(true);
              const offset = (raw - smoothed) * overlapViewportHeight;
              setProcessY(offset);
              setProcessCoverTailScale(gsap.utils.clamp(0, 1, -offset / overlapViewportHeight));
            };
            const syncOverlapScroll = self => {
              rawProgress = self.progress;
              updateOverlapPositions();
            };

            processOverlapTween = gsap.fromTo(overlapProxy,
              { progress: 0 },
              {
                progress: 1,
                ease: 'none',
                immediateRender: false,
                onUpdate: updateOverlapPositions,
                scrollTrigger: {
                  trigger: processSection,
                  start: 'top bottom',
                  end: 'top top',
                  scrub: .65,
                  invalidateOnRefresh: true,
                  onRefreshInit: () => {
                    overlapRefreshInProgress = true;
                    setProcessY(0);
                    setProcessCoverTailScale(0);
                    gsap.set(processSection, { clearProps: 'transform' });
                  },
                  onRefresh: self => {
                    overlapViewportHeight = innerHeight;
                    overlapRefreshInProgress = false;
                    syncOverlapScroll(self);
                  },
                  onUpdate: syncOverlapScroll,
                  onEnter: syncOverlapScroll,
                  onEnterBack: syncOverlapScroll,
                  onLeave: syncOverlapScroll,
                  onLeaveBack: syncOverlapScroll
                }
              }
            );
            processOverlapTrigger = processOverlapTween.scrollTrigger;
            rawProgress = processOverlapTrigger?.progress ?? 0;
            updateOverlapPositions();
          }

          const entranceTweens = categoriesInChapter.map((category, index) => {
            chapterTimeline.fromTo(category,
              { y: () => initialCategoryY(index) },
              { y: 0, duration: entranceDuration, ease: 'none' },
              chapterStageOffsets[index] || 0
            );
            const entranceTween = chapterTimeline
              .getChildren(false, true, false)
              .find(tween => tween.targets()[0] === category);
            const cancelEntrance = () => {
              entranceTween?.kill();
              gsap.set(category, { clearProps: 'transform' });
              category.removeEventListener('pointerdown', cancelEntrance);
              category.removeEventListener('focusin', cancelEntrance);
            };
            category.addEventListener('pointerdown', cancelEntrance);
            category.addEventListener('focusin', cancelEntrance);
            if (entranceTween) entranceTween._chapterCancel = cancelEntrance;
            return entranceTween;
          });

          chapterTimeline.addLabel('aligned', entranceEnd);
          const chapterWipeProxy = { progress: 0 };
          chapterTimeline.to(chapterWipeProxy, { progress: 1, duration: wipeDuration, ease: 'none' }, wipeStart);
          chapterTimeline.to(chapterWipeProxy, { progress: 1, duration: releaseHold, ease: 'none' }, wipeEnd);

          chapterWipeTimeline = gsap.timeline({
            onUpdate: updateChapterWipe,
            scrollTrigger: {
              trigger: chapterPinStage || chapter,
              start: () => {
                const chapterTrigger = chapterTimeline.scrollTrigger;
                return chapterTrigger.start + chapterScrollDistance() * (wipeStart / chapterTimelineDuration);
              },
              end: () => {
                const chapterTrigger = chapterTimeline.scrollTrigger;
                return chapterTrigger.start + chapterScrollDistance();
              },
              scrub: 1.6,
              invalidateOnRefresh: true,
              onRefresh: updateChapterWipe
            }
          });
          chapterWipeTimeline.fromTo(chapterWipe,
            { scaleY: 0 },
            { scaleY: 1, duration: wipeDuration, ease: 'none' },
            0
          );
          chapterWipeTimeline.to(chapterWipe, { scaleY: 1, duration: releaseHold, ease: 'none' }, wipeDuration);
          chapterWipeTimeline.set(chapterAccordion, { backgroundColor: chapterDarkSurface }, wipeDuration);
          updateChapterOverlays();

          const isChapterWheelIgnored = event => {
            if (document.body.classList.contains('modal-open')) return true;
            const target = event.target instanceof Element ? event.target : null;
            if (!target) return false;
            if (target.closest('dialog[open], input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-open="search"], [data-open="bag"]')) return true;
            for (let node = target; node && node !== document.body; node = node.parentElement) {
              const style = getComputedStyle(node);
              if (['auto', 'scroll', 'overlay'].includes(style.overflowY) && node.scrollHeight > node.clientHeight + 1) return true;
            }
            return false;
          };
          const getChapterWheelDeltaY = event => {
            const deltaY = Number(event.deltaY) || 0;
            if (event.deltaMode === 1) return deltaY * (parseFloat(getComputedStyle(document.documentElement).lineHeight) || 16);
            if (event.deltaMode === 2) return deltaY * innerHeight;
            return deltaY;
          };
          const handleChapterWheel = event => {
            if (!event.cancelable || event.defaultPrevented || event.ctrlKey) return;
            const deltaY = getChapterWheelDeltaY(event);
            if (!deltaY || (event.deltaX && Math.abs(event.deltaX) >= Math.abs(deltaY))) return;
            const chapterTrigger = chapterTimeline.scrollTrigger;
            if (!chapterTrigger) return;
            if (deltaY < 0) {
              rearmChapterWheelHold();
              return;
            }
            completeChapterWheelHold();
            const currentY = window.scrollY;
            if (currentY > chapterTrigger.end + chapterWheelBoundaryTolerance) {
              releaseChapterWheelHold();
              return;
            }
            if (currentY + deltaY <= chapterTrigger.end || chapterWheelReleased) return;
            if (isChapterWheelIgnored(event)) return;
            event.preventDefault();
            window.scrollTo({ top: Math.max(0, Math.round(chapterTrigger.end - 1)), left: window.scrollX, behavior: 'instant' });
            syncChapterWheelHold();
          };
          window.addEventListener('wheel', handleChapterWheel, { passive: false });

          return () => {
            window.removeEventListener('wheel', handleChapterWheel);
            clearChapterWheelHoldTimer();
            chapterWheelHoldStartedAt = 0;
            chapterWheelReleased = false;
            processOverlapTween?.scrollTrigger?.kill();
            processOverlapTween?.kill();
            clearProcessOverlapVisuals();
            processCoverTail?.remove();
            processCoverTail = null;
            chapter.classList.remove('process-sticky-ready');
            chapterPinStage?.classList.remove('process-sticky-ready');
            processSection?.classList.remove('process-sticky-ready');
            entranceTweens.forEach((entranceTween, index) => {
              const cancelEntrance = entranceTween?._chapterCancel;
              const category = categoriesInChapter[index];
              if (cancelEntrance) cancelEntrance();
              category.removeEventListener('pointerdown', cancelEntrance);
              category.removeEventListener('focusin', cancelEntrance);
            });
            chapterWipeTimeline.scrollTrigger?.kill(true);
            chapterWipeTimeline.kill();
            chapterTimeline.scrollTrigger?.kill(true);
            chapterTimeline.kill();
            chapterAccordion.style.removeProperty('background-color');
            copyOverlay?.remove();
            chapter.classList.remove('is-dark');
            gsap.set(categoriesInChapter, { clearProps: 'transform' });
            gsap.set(chapterWipe, { clearProps: 'transform' });
          };
        };

        const createMobileChapterMotion = () => {
          const chapterEntrance = gsap.from(categoriesInChapter, {
            y: 18,
            opacity: 0,
            duration: .55,
            stagger: .08,
            ease: 'power2.out',
            clearProps: 'transform,opacity',
            scrollTrigger: {
              trigger: chapterAccordion,
              start: 'top 84%',
              once: true
            }
          });
          const chapterTheme = ScrollTrigger.create({
            trigger: chapterAccordion,
            start: 'top 62%',
            onEnter: () => chapter.classList.add('is-dark'),
            onEnterBack: () => chapter.classList.add('is-dark'),
            onLeaveBack: () => chapter.classList.remove('is-dark')
          });
          return () => {
            chapterEntrance.scrollTrigger?.kill(true);
            chapterEntrance.kill();
            chapterTheme.kill();
            chapter.classList.remove('is-dark');
            gsap.set(categoriesInChapter, { clearProps: 'transform,opacity' });
          };
        };

        chapterMotion.add('(min-width: 900px)', createDesktopChapterTimeline);
        chapterMotion.add('(max-width: 899px)', createMobileChapterMotion);
      }
      gsap.from('.home-starting-points .service-grid .process-visual img', {
        yPercent: 12,
        opacity: 0,
        scale: 1.035,
        duration: 1,
        stagger: .16,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.home-starting-points .service-grid', start: 'top 84%', once: true },
        clearProps: 'transform,opacity'
      });
      gsap.from('.home-starting-points .service-grid .process-copy', {
        y: 24,
        opacity: 0,
        duration: .95,
        stagger: .2,
        delay: .18,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.home-starting-points .service-grid', start: 'top 88%', once: true },
        clearProps: 'transform,opacity'
      });
      const productGrid = $('.product-grid');
      if (productGrid) {
        gsap.from('.product-card', {
          y: 24,
          opacity: 0,
          duration: .95,
          stagger: .2,
          ease: 'power2.out',
          scrollTrigger: { trigger: productGrid, start: 'top 88%', once: true },
          clearProps: 'transform,opacity'
        });
      }
      gsap.from('.footer-main > *', {
        y: 24,
        opacity: 0,
        duration: .95,
        stagger: .08,
        ease: 'power2.out',
        scrollTrigger: { trigger: '.footer', start: 'top 88%', once: true },
        clearProps: 'transform,opacity'
      });
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());

      return () => {
        document.removeEventListener('visibilitychange', syncSlidePlayback);
        if (slideTimeline) slideTimeline.kill();
        chapterMotion.revert();
      };
    });

    motion.add('(prefers-reduced-motion: reduce)', () => {
      const chapter = $('.home-story');
      const chapterAccordion = chapter && chapter.querySelector('.accordion');
      if (!chapterAccordion) return;

      const themeTrigger = ScrollTrigger.create({
        trigger: chapterAccordion,
        start: 'top 55%',
        onEnter: () => chapter.classList.add('is-dark'),
        onEnterBack: () => chapter.classList.add('is-dark'),
        onLeaveBack: () => chapter.classList.remove('is-dark')
      });

      return () => {
        themeTrigger.kill();
        chapter.classList.remove('is-dark');
      };
    });
  }
  };
  initWhatsAppWidget();
  if (Array.isArray(window.NETPRO_PRODUCTS)) start();
  else {
    const productScript = document.createElement('script');
    productScript.src = 'products.js?v=20261014-patch-stock1';
    productScript.onload = start;
    productScript.onerror = () => {
      console.error('Netpro product catalogue could not be loaded.');
      window.NETPRO_PRODUCTS_LOAD_FAILED = true;
      window.NETPRO_PRODUCTS = [];
      start();
    };
    document.head.appendChild(productScript);
  }
})();
