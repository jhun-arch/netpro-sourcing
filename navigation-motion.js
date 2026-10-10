(()=>{
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving=false;
  const isCheckout=document.body.classList.contains('checkout-page');
  function read(key){try{return sessionStorage.getItem(key)}catch{return null}}
  function write(key,value){try{sessionStorage.setItem(key,value)}catch{}}
  function remove(key){try{sessionStorage.removeItem(key)}catch{}}
  const returnLink=document.querySelector('.continue-shopping');
  const returnKey='netpro-b2b-return:'+location.pathname;
  const pairedPath=location.pathname.replace(/(checkout|quote)\.html\/?$/i,match=>match.toLowerCase()==='quote.html'?'checkout.html':'quote.html');
  const pairedKey=pairedPath===location.pathname?null:'netpro-b2b-return:'+pairedPath;
  const pendingKey='netpro-b2b-return-pending:'+location.pathname;
  const pairedPendingKey=pairedPath===location.pathname?null:'netpro-b2b-return-pending:'+pairedPath;
  function parseUrl(value){if(typeof value!=='string'||!value.trim())return null;try{return new URL(value,location.href)}catch{return null}}
  function isCheckoutPath(path){return /(?:^|\/)(?:checkout|quote)\.html\/?$/i.test(path)}
  function validReturn(value){const u=parseUrl(value);return u&&u.origin===location.origin&&!isCheckoutPath(u.pathname)?u.href:null}
  function sameRoute(a,b){const first=parseUrl(a),second=parseUrl(b);return !!first&&!!second&&first.origin===second.origin&&first.pathname===second.pathname&&first.search===second.search}
  const referrerUrl=parseUrl(document.referrer);
  const referrerDestination=validReturn(document.referrer);
  const storedValue=read(returnKey)||(pairedKey&&read(pairedKey));
  const storedDestination=validReturn(storedValue);
  const pendingValue=read(pendingKey)||(pairedPendingKey&&read(pairedPendingKey));
  const pendingDestination=validReturn(pendingValue);
  const navigationType=performance.getEntriesByType?.('navigation')?.[0]?.type;
  const storedMatchesReferrer=storedDestination&&referrerUrl&&referrerUrl.origin===location.origin&&(isCheckoutPath(referrerUrl.pathname)||isCheckoutPath(location.pathname)&&referrerUrl.pathname===location.pathname||sameRoute(storedDestination,document.referrer));
  const useStoredDestination=storedDestination&&(pendingDestination||storedMatchesReferrer||navigationType==='reload');
  const destination=useStoredDestination?storedDestination:referrerDestination;
  let historyReturn=false;
  if(returnLink){
    if(destination){
      returnLink.href=destination;
      if(!sameRoute(destination,storedDestination||'')){
        write(returnKey,destination);
        if(pairedKey)remove(pairedKey);
      }
      historyReturn=!!referrerDestination&&history.length>1&&sameRoute(destination,document.referrer);
    }else{
      remove(returnKey);
      if(pairedKey)remove(pairedKey);
    }
    remove(pendingKey);
    if(pairedPendingKey)remove(pairedPendingKey);
  }
  // Record every entry point, including header, product and content links.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank')return;
    const u=new URL(a.href,location.href);
    if(u.origin===location.origin&&/\/(checkout|quote)\.html$/.test(u.pathname)&&!isCheckout){
      write('netpro-b2b-return:'+u.pathname,location.href);
      write('netpro-b2b-return-pending:'+u.pathname,location.href);
      write('netpro-b2b-shopping-scroll',String(scrollY));
    }
  },true);
  const entering=read('netpro-b2b-navigation-motion');
  try{sessionStorage.removeItem('netpro-b2b-navigation-motion')}catch{}
  if(!reduced()&&entering){document.body.classList.add(entering==='checkout'?'checkout-entering':'shopping-entering');setTimeout(()=>document.body.classList.remove('checkout-entering','shopping-entering'),650);}
  if(!isCheckout&&entering==='shopping'){const y=Number(read('netpro-b2b-shopping-scroll'));if(Number.isFinite(y))requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));}
  document.addEventListener('click',async e=>{
    const link=e.target.closest('.cart-checkout,.continue-shopping');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    e.preventDefault();if(leaving)return;leaving=true;
    const forward=link.classList.contains('cart-checkout');
    const destination=link.href;
    const returnViaHistory=!forward&&historyReturn&&history.length>1;
    if(forward){write('netpro-b2b-shopping-return',location.href);write('netpro-b2b-shopping-scroll',String(scrollY));}
    else{
      remove(returnKey);
      if(pairedKey)remove(pairedKey);
      remove(pendingKey);
      if(pairedPendingKey)remove(pairedPendingKey);
      remove('netpro-b2b-shopping-return');
    }
    if(returnViaHistory)remove('netpro-b2b-navigation-motion');
    else write('netpro-b2b-navigation-motion',forward?'checkout':'shopping');
    if(!reduced()){
      document.body.classList.add(forward?'checkout-departing':'shopping-departing');
      const el=forward?link.closest('dialog'):document.querySelector('.checkout-shell');
      if(el&&el.animate){
        const animation=forward?el.animate([{width:getComputedStyle(el).width},{width:'100%'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}):el.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(100%)',opacity:.4}],{duration:420,easing:'cubic-bezier(.55,0,.8,.4)',fill:'forwards'});
        try{await animation.finished}catch{}
      }
    }
    if(returnViaHistory)history.back();else location.assign(destination);
  });
  window.addEventListener('pageshow',e=>{if(e.persisted){leaving=false;document.body.classList.remove('checkout-departing','shopping-departing');document.getAnimations().forEach(a=>{if(a.effect?.target?.matches?.('#bag-dialog,#purchase-dialog,.checkout-shell'))a.cancel();});}});
})();
