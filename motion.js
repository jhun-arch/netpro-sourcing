(()=>{
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!reduced()){
 const observer=new IntersectionObserver(entries=>entries.forEach(({isIntersecting,target})=>{if(isIntersecting){target.classList.add('motion-visible');observer.unobserve(target);}}),{threshold:.08});
 document.querySelectorAll('.b2b-section,.contact-manifesto,.quote-next').forEach(el=>observer.observe(el));
 }
})();
