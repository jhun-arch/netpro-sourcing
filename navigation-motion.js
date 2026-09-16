(()=>{
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving=false;
  const isCheckout=document.body.classList.contains('checkout-page');
  function read(key){try{return sessionStorage.getItem(key)}catch{return null}}
  function write(key,value){try{sessionStorage.setItem(key,value)}catch{}}
  const returnLink=document.querySelector('.continue-shopping');
  const returnKey='netpro-b2b-return:'+location.pathname;
  function validReturn(value){try{const u=new URL(value,location.href);return u.origin===location.origin&&u.pathname.startsWith('/netpro-b2b/')&&!/\/(checkout|quote)\.html$/.test(u.pathname)?u.href:null}catch{return null}}
  if(returnLink){
    const destination=validReturn(read(returnKey))||validReturn(document.referrer);
    if(destination)returnLink.href=destination;
  }
  // Record every entry point, including header, product and content links.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank')return;
    const u=new URL(a.href,location.href);
    if(u.origin===location.origin&&/\/(checkout|quote)\.html$/.test(u.pathname)&&!isCheckout){
      write('netpro-b2b-return:'+u.pathname,location.href);
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
    if(forward){write('netpro-b2b-shopping-return',location.href);write('netpro-b2b-shopping-scroll',String(scrollY));}
    write('netpro-b2b-navigation-motion',forward?'checkout':'shopping');
    if(!reduced()){
      document.body.classList.add(forward?'checkout-departing':'shopping-departing');
      const el=forward?link.closest('dialog'):document.querySelector('.checkout-shell');
      if(el&&el.animate){
        const animation=forward?el.animate([{width:getComputedStyle(el).width},{width:'100%'}],{duration:420,easing:'cubic-bezier(.22,1,.36,1)',fill:'forwards'}):el.animate([{transform:'translateX(0)',opacity:1},{transform:'translateX(100%)',opacity:.4}],{duration:420,easing:'cubic-bezier(.55,0,.8,.4)',fill:'forwards'});
        try{await animation.finished}catch{}
      }
    }
    location.assign(link.href);
  });
  window.addEventListener('pageshow',e=>{if(e.persisted){leaving=false;document.body.classList.remove('checkout-departing','shopping-departing');document.getAnimations().forEach(a=>{if(a.effect?.target?.matches?.('#bag-dialog,#purchase-dialog,.checkout-shell'))a.cancel();});}});
})();
