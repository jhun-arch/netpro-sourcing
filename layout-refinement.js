(()=>{
 const stage=document.querySelector('.testimonial-stage');
 if(stage){const quotes=[...stage.querySelectorAll('blockquote')];let index=0;const controls=document.createElement('div');controls.className='testimonial-controls';controls.innerHTML='<span class="testimonial-count" aria-live="polite"></span><button type="button" aria-label="Previous testimonial">←</button><button type="button" aria-label="Next testimonial">→</button>';stage.append(controls);const render=()=>{quotes.forEach((q,i)=>q.hidden=i!==index);controls.querySelector('span').textContent=`${index+1} / ${quotes.length}`;};controls.querySelectorAll('button').forEach((b,i)=>b.addEventListener('click',()=>{index=(index+(i?1:-1)+quotes.length)%quotes.length;render();}));render();}
 if(!window.gsap||!window.ScrollTrigger)return;gsap.registerPlugin(ScrollTrigger);
 const mm=gsap.matchMedia();mm.add('(min-width: 1100px) and (prefers-reduced-motion: no-preference)',()=>{
 const title=document.querySelector('.guide-faq-head'),list=document.querySelector('.guide-faq-list');
 if(title&&list)ScrollTrigger.create({trigger:title,start:'top 125px',end:()=>'+='+Math.max(0,list.offsetHeight-title.offsetHeight),pin:true,pinSpacing:false,invalidateOnRefresh:true});
 document.querySelectorAll('.editorial-lead').forEach(p=>{const words=p.textContent.trim().split(/\s+/);p.setAttribute('aria-label',p.textContent);p.innerHTML=words.map(w=>'<span aria-hidden="true">'+w+'</span>').join(' ');gsap.fromTo(p.children,{opacity:.25},{opacity:1,stagger:.08,ease:'none',scrollTrigger:{trigger:p,start:'top 90%',end:'top 60%',scrub:true}});});
 });document.querySelectorAll('.guide-faq details').forEach(d=>d.addEventListener('toggle',()=>ScrollTrigger.refresh()));
})();
