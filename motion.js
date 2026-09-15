(()=>{
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced()){
 const observer=new IntersectionObserver(entries=>entries.forEach(({isIntersecting,target})=>{if(isIntersecting){target.classList.add('motion-visible');observer.unobserve(target);}}),{threshold:.08});
 document.querySelectorAll('.b2b-section,.contact-manifesto,.quote-next').forEach(el=>observer.observe(el));
 }
 // Native cross-document transitions handle capable browsers; older ones retain normal links.
 window.addEventListener('pageswap',e=>{if(e.viewTransition&&(document.body.classList.contains('checkout-departing')||document.body.classList.contains('shopping-departing')))e.viewTransition.skipTransition();});
})();
