(()=>{
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

  const motionKey='netpro-b2b-navigation-motion';
  const restoreKey='netpro-b2b-restore-shopping-scroll';
  const restoreShopping=read(restoreKey)==='1'||read(motionKey)==='shopping';
  try{sessionStorage.removeItem(motionKey);sessionStorage.removeItem('netpro-b2b-shopping-return');}catch{}
  if(!isCheckout&&restoreShopping){
    try{sessionStorage.removeItem(restoreKey)}catch{}
    const y=Number(read('netpro-b2b-shopping-scroll'));
    if(Number.isFinite(y))requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'}));
  }

  // Preserve the return destination and scroll position while leaving checkout immediate.
  document.addEventListener('click',e=>{
    const a=e.target.closest('a[href]');
    if(!a||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||a.target==='_blank')return;
    const u=new URL(a.href,location.href);
    if(u.origin!==location.origin)return;
    if(/\/(checkout|quote)\.html$/.test(u.pathname)&&!isCheckout){
      write('netpro-b2b-return:'+u.pathname,location.href);
      write('netpro-b2b-shopping-scroll',String(scrollY));
    }
    if(isCheckout&&a.classList.contains('continue-shopping'))write(restoreKey,'1');
  },true);
})();
