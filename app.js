(() => {
  'use strict';

  // Change this URL when Netpro Patches moves to its final production domain.
  const PATCHES_URL = 'customization.html#patches';
  const products = [{"id": "tee-white", "name": "Essential White Tee", "category": "clothing", "color": "White", "swatch": "#f0f0eb", "sizes": ["S", "M", "L", "XL"], "art": "catalog-0", "isNew": true, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "tee-navy", "name": "Essential Navy Tee", "category": "clothing", "color": "Navy", "swatch": "#1d304c", "sizes": ["S", "M", "L", "XL"], "art": "catalog-1", "isNew": false, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "sweatshirt", "name": "Classic Crewneck", "category": "clothing", "color": "Oatmeal", "swatch": "#d9ceba", "sizes": ["S", "M", "L", "XL"], "art": "catalog-2", "isNew": true, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "hoodie", "name": "Basic Hoodie", "category": "clothing", "color": "Sky blue", "swatch": "#a4c6df", "sizes": ["S", "M", "L", "XL"], "art": "catalog-3", "isNew": false, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "socks", "name": "Basic Crew Socks", "category": "socks", "color": "White", "swatch": "#f0f0eb", "sizes": ["S/M", "L/XL"], "art": "catalog-4", "isNew": true, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "socks-black", "name": "Black Crew Socks", "category": "socks", "color": "Black", "swatch": "#252525", "sizes": ["S/M", "L/XL"], "art": "catalog-5", "isNew": false, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "cap", "name": "Basic Blue Cap", "category": "headwear", "color": "Cobalt blue", "swatch": "#285cad", "sizes": ["One size"], "art": "catalog-6", "isNew": false, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "cap-beige", "name": "Basic Beige Cap", "category": "headwear", "color": "Beige", "swatch": "#d6c5a8", "sizes": ["One size"], "art": "catalog-7", "isNew": true, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}, {"id": "patch", "name": "Blank Shape Patches", "category": "patches", "color": "Mixed blues", "swatch": "#3d608e", "sizes": ["One size"], "art": "catalog-8", "isNew": false, "description": "Use this style as a starting point. Share quantities, sizes and decoration requirements for a project-specific quotation."}];
  const isShop = document.body.classList.contains("shop-page");
  const shopState = {color:"all",size:[],sort:"featured",page:1};
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const money = value => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  const arrow = '<svg aria-hidden="true"><use href="#i-arrow"/></svg>';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  let activeFilter = isShop ? (new URLSearchParams(location.search).get('category') || 'all') : 'all';
  if (!['all','new','clothing','socks','headwear','patches'].includes(activeFilter)) activeFilter = 'all';
  let toastTimer;
  let bag = [];
  try {
    const saved = JSON.parse(localStorage.getItem('netpro-b2b-enquiry') || '[]');
    if (Array.isArray(saved)) bag = saved.filter(item => {
      const p = products.find(p => p.id === item.id);
      return p && p.sizes.includes(item.size) && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 100000;
    }).map(({ id, size, quantity }) => ({ id, size, quantity }));
  } catch { /* Private mode or blocked storage: the bag still works for this visit. */ }

  function art(p, extra = '') {
    return `<div class="product-art art-${p.art} ${extra}" role="img" aria-label="${escape(p.color + ' ' + p.name)}"></div>`;
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
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('cancel',event=>{event.preventDefault();dismissDialog(dialog);});
    $('.close-dialog', dialog)?.addEventListener('click', () => dismissDialog(dialog));
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismissDialog(dialog);
    });
  });

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
  $$('#mobile-nav a').forEach(a => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  document.addEventListener('click', e => { if (!header.contains(e.target)) closeMenu(); });
  const mobileQuery = matchMedia('(max-width: 1100px)');
  mobileQuery.addEventListener('change', closeMenu);

  // Pointer and keyboard users share one dropdown state.
  const navGroups = $$('.nav-group');
  function setDropdown(group, open) {
    $('.nav-trigger', group).setAttribute('aria-expanded', String(open));
    $('.nav-dropdown', group).hidden = !open;
  }
  function closeDropdowns() { navGroups.forEach(group => setDropdown(group, false)); }
  navGroups.forEach(group => {
    const trigger = $('.nav-trigger', group);
    const open = () => { closeDropdowns(); setDropdown(group, true); };
    group.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(); });
    group.addEventListener('pointerleave', () => { if (!group.contains(document.activeElement)) setDropdown(group, false); });
    if (trigger.tagName === 'BUTTON') trigger.addEventListener('click', () => { const expanded = trigger.getAttribute('aria-expanded') === 'true'; closeDropdowns(); setDropdown(group, !expanded); });
    group.addEventListener('focusout', e => { if (!group.contains(e.relatedTarget)) setDropdown(group, false); });
    group.addEventListener('keydown', e => {
      if (e.key === 'Escape') { trigger.focus(); closeDropdowns(); }
      if (e.key === 'ArrowDown' && e.target === trigger) { e.preventDefault(); open(); $('a', group).focus(); }
    });
    $$('a', group).forEach(a => a.addEventListener('click', closeDropdowns));
  });
  document.addEventListener('click', e => { if (!e.target.closest('.nav-group')) closeDropdowns(); });
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
    category.addEventListener('pointerenter', e => {
      if (e.pointerType === 'mouse' && !mobileQuery.matches) activateCategory(i);
    });
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

  function renderProducts() {
    if(!document.querySelector('#product-grid'))return;
    let items = products.filter(p => activeFilter === 'all' || (activeFilter === 'new' ? p.isNew : p.category === activeFilter));
    if (isShop) {
      items = items.filter(p => (shopState.color === 'all' || p.color === shopState.color) && (!shopState.size.length || shopState.size.some(size=>p.sizes.includes(size))));
      if (shopState.sort === 'name') items.sort((a,b)=>a.name.localeCompare(b.name));
      const total=items.length, pages=Math.max(1,Math.ceil(total/6)); shopState.page=Math.min(shopState.page,pages);
      $('#shop-count').textContent = total ? `Showing ${(shopState.page-1)*6+1}–${Math.min(shopState.page*6,total)} of ${total} products` : 'No products match your filters';
      $('#pagination').innerHTML = pages>1 ? Array.from({length:pages},(_,i)=>`<button data-page="${i+1}" aria-label="Page ${i+1}" ${i+1===shopState.page?'aria-current="page"':''}>${i+1}</button>`).join('') : '';
      const label={all:'All Products',new:'New Arrivals',clothing:'Clothing',socks:'Socks',headwear:'Headwear',patches:'Ready-Made Patches'}[activeFilter];
      $('#shop-title').textContent=label; $('#breadcrumb-current').textContent=label;
      const banner=$('.shop-banner-photo');
      const bannerImages={all:'banner-new.png',new:'banner-new.png',clothing:'banner-clothing.png',socks:'banner-socks.png',headwear:'banner-headwear.png',patches:'banner-patches.png'};
      const bannerAlts={all:'Blue, white and cream everyday basics',new:'Discover the latest everyday basics',clothing:'Plain everyday clothing in blue, white and cream',socks:'Basic ribbed crew socks in coordinated colors',headwear:'Plain baseball caps in blue, navy and cream',patches:'A collection of custom patch styles in blue and cream'};
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
      const priceLabels={'0':'Under $10','10':'$10 – $49.99','50':'$50 – $99.99','100':'$100 – $199.99','200':'$200 +'};
      const tags=[...(activeFilter!=='all'?[['category',activeFilter,label]]:[]),...(shopState.color!=='all'?[['color',shopState.color,shopState.color]]:[]),...shopState.size.map(v=>['size',v,v]),...shopState.price.map(v=>['price',v,priceLabels[v]])];
      $('#active-filters').innerHTML=tags.length?tags.map(([kind,value,text])=>`<button class="filter-tag" data-remove-filter="${kind}" data-value="${value}" aria-label="Remove ${text} filter">${text}<span aria-hidden="true">×</span></button>`).join(''):'<span class="no-filters">All products</span>';
      $('#clear-filter-tags').hidden=!tags.length;
      $$('[data-size]').forEach(el=>el.setAttribute('aria-pressed',String(shopState.size.includes(el.dataset.size))));
      $$('[data-price]').forEach(el=>el.checked=shopState.price.includes(el.dataset.price));
      $$('[data-shop-filter]').forEach(el=>el.value=shopState[el.dataset.shopFilter]);
      items=items.slice((shopState.page-1)*6,shopState.page*6);
    } else items=activeFilter==='all' ? ['hoodie','socks','cap','patch'].map(id=>products.find(p=>p.id===id)) : items.slice(0,4);
    $('#product-grid').innerHTML = items.map(p => `<article class="product-card" data-product="${p.id}">
      <button class="product-image" data-detail="${p.id}" aria-label="View ${p.name}">${art(p)}<span class="product-model model-${p.art}" role="img" aria-label="${escape(p.name)} ${p.category==='patches'?'in use':'on model'}"></span></button>
      <div class="product-meta"><span class="new-label">${p.category === 'patches' ? 'PATCHES' : 'BASIC · CUSTOMIZABLE'}</span><h3><button class="product-name" data-detail="${p.id}">${p.name}</button></h3><p class="product-price">Request Pricing <small>· Custom quote available</small></p><p class="product-color"><span class="color-dot" style="--swatch:${p.swatch}"></span>${p.color}</p></div>
    </article>`).join('') || '<p class="empty-results">Try another category or clear your filters to explore more basics.</p>';
    $$('.filters button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter)));
  }
  document.addEventListener('click', e => {
    const filter = e.target.closest('[data-filter]');
    if (filter) {
      activeFilter = filter.dataset.filter; shopState.page=1;
      renderProducts();
      if (window.gsap && !matchMedia('(prefers-reduced-motion: reduce)').matches) gsap.from('.product-card', { opacity: 0, y: 20, duration: .45, stagger: .06, clearProps: 'all' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    }
    const detail = e.target.closest('[data-detail]');
    if (detail) showProduct(detail.dataset.detail);
  });
  renderProducts();
  if(isShop){
    function updateShop(){shopState.page=1;const url=new URL(location.href);url.searchParams.set('category',activeFilter);history.replaceState(null,'',url);renderProducts();if(window.gsap&&!matchMedia('(prefers-reduced-motion: reduce)').matches)gsap.fromTo('.product-card',{opacity:0,y:14},{opacity:1,y:0,duration:.4,stagger:.045,clearProps:'all'});}
    $('#category-select').addEventListener('change',e=>{activeFilter=e.target.value;updateShop();});
    $$('#category-options input').forEach(el=>el.addEventListener('change',()=>{activeFilter=el.value;updateShop();}));
    $$('[data-shop-filter]').forEach(el=>el.addEventListener('change',()=>{shopState[el.dataset.shopFilter]=el.value;updateShop();}));
    $('#clear-filters').addEventListener('click',()=>{activeFilter='all';Object.assign(shopState,{color:'all',size:[],price:[],sort:'featured'});$$('[data-shop-filter]').forEach(el=>el.value=shopState[el.dataset.shopFilter]);updateShop();});
    $('#clear-filter-tags').addEventListener('click',()=>$('#clear-filters').click());
    $$('[data-size]').forEach(el=>el.addEventListener('click',()=>{const v=el.dataset.size;shopState.size=shopState.size.includes(v)?shopState.size.filter(x=>x!==v):[...shopState.size,v];updateShop();}));
    $$('[data-price]').forEach(el=>el.addEventListener('change',()=>{shopState.price=$$('[data-price]:checked').map(x=>x.dataset.price);updateShop();}));
    $('#active-filters').addEventListener('click',e=>{const el=e.target.closest('[data-remove-filter]');if(!el)return;const k=el.dataset.removeFilter;if(k==='category')activeFilter='all';else if(k==='color')shopState.color='all';else shopState[k]=shopState[k].filter(x=>x!==el.dataset.value);updateShop();});
    $('#pagination').addEventListener('click',e=>{const el=e.target.closest('[data-page]');if(el){shopState.page=Number(el.dataset.page);renderProducts();if(!$('#arrivals')){location.href='shop.html';return;}
      $('#arrivals').scrollIntoView();}});
  }

  function showProduct(id) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    $('#product-detail').innerHTML = `<div class="detail-layout"><div class="detail-gallery"><div class="gallery-thumbs" aria-label="Product images"></div><div class="detail-visual">${art(p)}</div></div><div class="detail-copy"><span class="new-label">BULK & CUSTOM</span><h2>${p.name}</h2><div class="detail-price">Request Pricing</div><p>${p.description}</p><p class="product-color"><span class="color-dot" style="--swatch:${p.swatch}"></span>${p.color}</p><fieldset class="detail-sizes"><legend>Choose your size</legend><div class="size-options">${p.sizes.map((size,i)=>`<button type="button" data-detail-size="${size}" aria-pressed="${i===0}">${size}</button>`).join('')}</div></fieldset><div class="detail-quantity"><span>Quantity</span><div><button id="quantity-less" aria-label="Decrease quantity">−</button><input id="detail-quantity" type="number" min="1" max="100000" value="1" aria-label="Requested quantity"><button id="quantity-more" aria-label="Increase quantity">+</button></div></div><button id="add-to-bag" class="button primary">Add to Enquiry ${arrow}</button><p class="detail-note">MOQ, material specifications, sample availability and lead time are confirmed for each project.</p></div></div>`;
    const gallery=[{name:'Product view',html:art(p)},...(p.id==='hoodie'?[{name:'On-model illustration',html:'<div class="story-art story-art-0" role="img" aria-label="Sky blue hoodie on model"></div>'},{name:'Stitching illustration',html:'<div class="story-art story-art-1" role="img" aria-label="Hoodie stitching detail"></div>'},{name:'Fabric illustration',html:'<div class="story-art story-art-2" role="img" aria-label="Blue fabric close-up"></div>'}]:[{name:'Detail zoom',html:art(p,'gallery-zoom')}])];
    $('.gallery-thumbs').innerHTML=gallery.map((item,i)=>`<button class="gallery-thumb" aria-label="${item.name}" aria-pressed="${i===0}" data-gallery="${i}">${item.html}</button>`).join('');
    $$('[data-gallery]').forEach(button=>button.addEventListener('click',()=>{const item=gallery[Number(button.dataset.gallery)];$('.detail-visual').innerHTML=item.html;$$('[data-gallery]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));}));
    if(p.category==='clothing') $('#product-detail').insertAdjacentHTML('beforeend',`<section class="custom-examples"><div class="module-heading"><p class="eyebrow">MAKE IT YOURS</p><h3>One basic. Your signature.</h3><p>Explore embroidery and print treatments. Hoodie illustrations show the technique; your design is confirmed before production.</p></div><div class="custom-example-grid"><figure><div class="story-art story-art-3" role="img" aria-label="White embroidery on blue hoodie"></div><figcaption><strong>Embroidery</strong><span>Dimensional stitching with a tactile finish.</span></figcaption></figure><figure><div class="story-art story-art-4" role="img" aria-label="White printed motif on blue hoodie"></div><figcaption><strong>Print</strong><span>A smooth graphic finish for your artwork.</span></figcaption></figure></div><a class="text-link" href="mailto:info@netpropatches.com?subject=${encodeURIComponent('Customization enquiry: '+p.name)}">Discuss your custom design ↗</a></section><section class="product-information"><div class="info-tabs" role="tablist" aria-label="Product information"><button role="tab" id="tab-description" aria-controls="product-info-panel" aria-selected="true" data-product-tab="description">Product details</button><button role="tab" id="tab-size" aria-controls="product-info-panel" aria-selected="false" data-product-tab="size" tabindex="-1">Size guide</button><button role="tab" id="tab-material" aria-controls="product-info-panel" aria-selected="false" data-product-tab="material" tabindex="-1">Materials & care</button><button role="tab" id="tab-environment" aria-controls="product-info-panel" aria-selected="false" data-product-tab="environment" tabindex="-1">Environmental standards</button></div><div id="product-info-panel" role="tabpanel" aria-labelledby="tab-description" tabindex="0"></div></section>`);
    const spec=p.category==='clothing'?'Fiber composition, fabric weight, chest width, body length and sleeve length':p.category==='socks'?'Fiber blend, foot length, cuff height and knitting details':p.category==='headwear'?'Fabric, circumference, closure and decoration area':'Dimensions, edge finish, backing and colors';
    $('#product-detail').insertAdjacentHTML('beforeend',`<section class="product-information"><h3>Before you order</h3><p>Reference: ${p.id.toUpperCase()} · ${p.color} · ${p.sizes.join(', ')}</p><p>Specification checklist: ${spec}.</p><p>Confirm stock and final specifications for standard styles. MOQ, sample costs, production time and delivery for custom work are quoted for your brief.</p><a class="text-link" href="buying-guide.html">Buying guide & FAQ ↗</a></section>`);
    const information={description:`<h4>${p.name}</h4><p>${p.description}</p><p>Color: ${p.color}. Product photography and customization visuals are illustrative. Final artwork, placement and production specifications are confirmed with your quote.</p>`,size:`<h4>Find your fit</h4><p>Available size options: ${p.sizes.join(', ')}.</p><p>${p.category==='clothing'?'Compare chest width, body length and sleeve length with a garment you already own.':p.category==='socks'?'Compare foot length and preferred cuff height with your usual socks.':p.category==='headwear'?'Measure around your head above the eyebrows.':'Confirm the patch width, height and placement for your project.'}</p><p>Exact measurements and tolerances are awaiting confirmation. Email us for the size chart before ordering.</p>`,material:'<h4>Materials & care</h4><p>Fiber composition, fabric weight and care instructions will be confirmed for the selected product and production batch. Close-up images illustrate texture and do not verify material composition.</p><p>Custom printing and embroidery may require different care. Follow the final garment care label.</p>',environment:'<h4>Environmental standards</h4><p>Environmental certifications and recycled or organic content have not yet been verified for this product. Request product-specific documentation.</p><p>If your project requires a specific standard, tell us before requesting a quote. Applicable documentation and product scope must be confirmed before production.</p>'};
    function selectInfo(button){$$('[data-product-tab]').forEach(el=>{el.setAttribute('aria-selected',String(el===button));el.tabIndex=el===button?0:-1;});$('#product-info-panel').innerHTML=information[button.dataset.productTab];$('#product-info-panel').setAttribute('aria-labelledby',button.id);}
    const tabs=$$('[data-product-tab]');tabs.forEach((button,i)=>{button.addEventListener('click',()=>selectInfo(button));button.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:(i+(e.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;selectInfo(tabs[next]);tabs[next].focus();}});});selectInfo(tabs[0]);
    let selectedSize=p.sizes[0], quantity=1;
    $$('[data-detail-size]').forEach(button=>button.addEventListener('click',()=>{selectedSize=button.dataset.detailSize;$$('[data-detail-size]').forEach(el=>el.setAttribute('aria-pressed',String(el===button)));}));
    $('#quantity-less').addEventListener('click',()=>{$('#detail-quantity').value=quantity=Math.max(1,quantity-1);});
    $('#quantity-more').addEventListener('click',()=>{$('#detail-quantity').value=quantity=Math.min(100000,quantity+1);});
    $('#detail-quantity').addEventListener('change', e => { quantity=Math.max(1,Math.min(100000,Math.floor(Number(e.target.value)||1)));e.target.value=quantity; });
    const dialog = openDialog('product-dialog');
    $('#add-to-bag').addEventListener('click', () => {
      const size = selectedSize;
      const item = bag.find(item => item.id === p.id && item.size === size);
      if (item) { if (item.quantity + quantity > 100000) return notify('For more than 100,000 units, include the quantity in your project notes.'); item.quantity+=quantity; }
      else bag.push({ id: p.id, size, quantity });
      saveBag();
      dialog.close();
      renderBag();
      openDialog('bag-dialog');
      notify(`${p.name} added to your enquiry list`);
    });
  }
  function saveBag() {
    try { localStorage.setItem('netpro-b2b-enquiry', JSON.stringify(bag)); } catch { /* Keep this session's bag in memory. */ }
    updateBagCount();
  }
  function updateBagCount() {
    const count = bag.reduce((sum, item) => sum + item.quantity, 0);
    $('.bag-count').textContent = count;
    $('.bag-count').hidden = !count;
    $('.bag-button').setAttribute('aria-label', `Open enquiry list, ${count} ${count === 1 ? 'item' : 'items'}`);
    $('#bag-total-count').textContent = count;
  }
  function renderBag() {
    updateBagCount();
    if (!bag.length) {
      $('#bag-items').innerHTML = `<div class="empty-bag"><svg aria-hidden="true"><use href="#i-bag"/></svg><h3>A little room for something new.</h3><p>Add products to build your enquiry.</p><button class="button primary bag-continue">Explore new arrivals ${arrow}</button></div>`;
      $('#bag-summary').innerHTML = '<p class="cart-empty-summary">You can also request a quote without selecting products.</p>';
    } else {
      $('#bag-items').innerHTML = bag.map((item, i) => {
        const p = products.find(p => p.id === item.id);
        return `<div class="bag-item">${art(p)}<div class="cart-item-name"><small>${p.category}</small><h3>${p.name}</h3><p>${p.color} · ${item.size}</p></div><div class="quantity"><button data-quantity="${i}" data-delta="-1" aria-label="Decrease ${p.name} quantity">−</button><span>${item.quantity}</span><button data-quantity="${i}" data-delta="1" aria-label="Increase ${p.name} quantity" ${item.quantity >= 100000 ? 'disabled' : ''}>+</button></div><span class="bag-item-price">Quote</span><button class="remove-item" data-remove="${i}" aria-label="Remove ${p.name}">×</button></div>`;
      }).join('');
      $('#bag-summary').innerHTML = `<div class="subtotal"><span>Requested units</span><span>${bag.reduce((n,item)=>n+item.quantity,0)}</span></div><p class="cart-tax-note">Indicative quantities only. Minimum quantities, unit pricing, samples and delivery will be confirmed in your quotation.</p><a class="button primary cart-checkout" href="quote.html">Request a quote →</a><p class="bag-note">Add your company and project details on the next page. This is an enquiry, not an order.</p>`;
    }
    $$('.bag-continue').forEach(button => button.addEventListener('click', () => {
      $('#bag-dialog').close();
      activeFilter = 'all'; renderProducts();
      if(!$('#arrivals')){location.href='shop.html';return;}
      $('#arrivals').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
    }));
  }
  $('#bag-dialog').addEventListener('click', e => {
    const quantity = e.target.closest('[data-quantity]');
    const remove = e.target.closest('[data-remove]');
    if (quantity) {
      const i = Number(quantity.dataset.quantity);
      bag[i].quantity += Number(quantity.dataset.delta);
      if (bag[i].quantity <= 0) bag.splice(i, 1);
    } else if (remove) bag.splice(Number(remove.dataset.remove), 1);
    else return;
    saveBag(); renderBag();
  });
  updateBagCount();
  window.addEventListener('enquiry-updated',()=>{try{bag=JSON.parse(localStorage.getItem('netpro-b2b-enquiry')||'[]');updateBagCount();}catch{}});

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
    shipping: ['Shipping information', 'We’re preparing the store for launch. Delivery destinations, rates and estimated times will be published here before online ordering opens.'],
    returns: ['Returns & exchanges', 'The returns and exchanges policy is being prepared. Eligibility, timeframes and instructions will be available before the store accepts orders.'],
    sizes: ['Find your everyday fit', 'Product-specific measurements will be added with the final collection. Confirm measurements and tolerances before ordering.'],
    contact: ['Contact Netpro', 'Email: info@netpropatches.com. Sales Manager: Stanley Poon. Address: Room 1202, Block A, Wanda Plaza, Shiji Road, Meiling Street, Jinjiang, Quanzhou 362200, China.'],
    privacy: ['Privacy Policy', 'Submitted contact and project details are used to respond to your request. Your enquiry list is stored in this browser.'],
    terms: ['Terms of Service', 'This catalogue accepts enquiries. Orders require a separately agreed quotation and commercial terms.']
  };
  $$('[data-info]').forEach(button => button.addEventListener('click', () => {
    const [title, body] = info[button.dataset.info];
    $('#info-title').textContent = title;
    $('#info-content').innerHTML = `<p>${body}</p>` + (button.dataset.info === 'contact' ? `<a class="button primary" href="${PATCHES_URL}" target="_blank" rel="noopener noreferrer">Visit Netpro Patches ↗</a>` : '');
    openDialog('info-dialog');
  }));

  let ticking = false;
  function updateScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 70);
    const max = document.documentElement.scrollHeight - innerHeight;
    $('.scroll-progress').style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
    ticking = false;
  }
  window.addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(updateScroll); ticking = true; } }, { passive: true });
  updateScroll();

  // Local GSAP files allow scroll animations to work offline as well as over HTTP.
  if(isShop && window.gsap && window.ScrollTrigger && !matchMedia('(prefers-reduced-motion: reduce)').matches){
    gsap.registerPlugin(ScrollTrigger);
    gsap.fromTo('.shop-banner-photo',{opacity:0},{opacity:1,duration:.8,overwrite:true});
    gsap.from('.shop-banner>div:first-child>*',{y:22,opacity:0,duration:.7,stagger:.12,clearProps:'all'});

    gsap.from('.shop-layout',{y:24,opacity:0,duration:.7,delay:.2,clearProps:'all'});
  }
  if (window.gsap && window.ScrollTrigger && !isShop && !document.body.matches('.contact-page, .about-page')) {
    gsap.registerPlugin(ScrollTrigger);
    const motion = gsap.matchMedia();
    motion.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.hero-photo', { scale: 1.045, duration: 1.7, ease: 'power2.out' });
      gsap.from('.hero-copy h1 span', { y: 28, opacity: 0, duration: 1, stagger: .12, delay: .18, ease: 'power3.out' });
      gsap.from('.hero-copy>p, .hero-actions', { y: 20, opacity: 0, duration: .9, stagger: .12, delay: .5, ease: 'power3.out' });
      gsap.to('.hero-photo', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: .8 } });
      $$('.reveal').forEach(el => gsap.from(el, { y: 35, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 91%', once: true }, clearProps: 'transform,opacity' }));
      gsap.from('.accordion', { y: 35, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.accordion', start: 'top 88%', once: true }, clearProps: 'transform,opacity' });
      gsap.from('.product-card', { y: 30, opacity: 0, duration: .8, stagger: .1, scrollTrigger: { trigger: '.product-grid', start: 'top 88%', once: true }, clearProps: 'transform,opacity' });
      gsap.fromTo('.custom-visual>img', { scale: 1.12 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.custom-section', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      gsap.fromTo('.story-visual img', { scale: 1.06 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.story-section', start: 'top bottom', end: 'bottom top', scrub: 1 } });
      const story = $('.story-reveal');
      const original = story.textContent;
      story.setAttribute('aria-label', original);
      story.innerHTML = original.split(' ').map(word => `<span class="story-word" aria-hidden="true">${escape(word)}</span>`).join(' ');
      gsap.from('.story-word', { opacity: .25, stagger: .08, scrollTrigger: { trigger: story, start: 'top 86%', end: 'bottom 48%', scrub: .6 } });
      gsap.from('.footer-brand', { y: 22, opacity: 0, duration: .8, scrollTrigger: { trigger: '.footer', start: 'top 90%', once: true }, clearProps: 'all' });
      return () => { story.textContent = original; story.removeAttribute('aria-label'); };
    });
    window.addEventListener('load', () => ScrollTrigger.refresh());
    if (document.fonts) document.fonts.ready.then(() => ScrollTrigger.refresh());
  }
})();
