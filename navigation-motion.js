(()=>{
  const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
  let leaving=false;
  const isCheckout=document.body.classList.contains('checkout-page');
  function read(key){try{return sessionStorage.getItem(key)}catch{return null}}
  function write(key,value){try{sessionStorage.setItem(key,value)}catch{}}
  const returnLink=document.querySelector('.continue-shopping');
  if(returnLink){const saved=read('netpro-b2b-shopping-return');if(saved){try{const url=new URL(saved,location.href);if(url.origin===location.origin&&/\/(shop|index)\.html$/.test(url.pathname))returnLink.href=url.href;}catch{}}}
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
