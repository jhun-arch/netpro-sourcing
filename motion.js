(()=>{
  const root=document.documentElement;
  const reduceQuery=matchMedia('(prefers-reduced-motion: reduce)');
  const finePointerQuery=matchMedia('(hover: hover) and (pointer: fine)');
  const activeAnimations=new Map();
  const revealed=new WeakSet();
  let revealObserver=null;
  let heroPlayed=false;
  root.dataset.motionInput='pointer';

  function modeFor(event){
    if(!finePointerQuery.matches||root.dataset.motionInput!=='pointer'||(event?.type==='click'&&event.detail===0))return 'instant';
    return reduceQuery.matches?'reduced':'full';
  }
  function visualState(element){
    const style=getComputedStyle(element);
    return {opacity:style.opacity,transform:style.transform==='none'?'none':style.transform};
  }
  function cancelRecord(element,record){
    if(activeAnimations.get(element)===record)activeAnimations.delete(element);
    record.done=true;
    record.animation.onfinish=null;
    try{record.animation.cancel()}catch{}
  }
  function finishRecord(element,record){
    if(record.done||activeAnimations.get(element)!==record)return;
    activeAnimations.delete(element);
    record.done=true;
    record.animation.onfinish=null;
    try{record.animation.cancel()}catch{}
    record.onFinish?.();
  }
  function play(element,frames,{duration,delay=0,easing,onFinish,kind}){
    if(typeof element.animate!=='function'){onFinish?.();return null;}
    const prior=activeAnimations.get(element);
    if(prior)cancelRecord(element,prior);
    const animation=element.animate(frames,{duration,delay,easing,fill:'both'});
    const record={animation,onFinish,kind,done:false};
    activeAnimations.set(element,record);
    animation.onfinish=()=>finishRecord(element,record);
    return record;
  }
  function finishAll(){
    for(const [element,record] of [...activeAnimations]){
      try{record.animation.finish()}catch{}
      finishRecord(element,record);
    }
  }
  function handleNativeClose(dialog){
    const record=activeAnimations.get(dialog);
    if(record&&!dialog.open)cancelRecord(dialog,record);
  }
  function ease(name,fallback){return getComputedStyle(root).getPropertyValue(name).trim()||fallback}
  function allowsMotion(event){return modeFor(event)==='full'}

  function openDialog(dialog,event){
    if(!dialog)return;
    const wasOpen=dialog.open;
    const prior=activeAnimations.get(dialog);
    if(wasOpen&&!prior)return;
    if(wasOpen&&prior?.kind==='dialog-open')return;
    const current=wasOpen?visualState(dialog):null;
    if(prior)cancelRecord(dialog,prior);
    if(!wasOpen)dialog.showModal();
    const mode=modeFor(event);
    if(mode==='instant')return;
    const isDrawer=dialog.id==='bag-dialog';
    const start=current||(isDrawer?{opacity:'0',transform:'translateX(100%)'}:{opacity:'0',transform:'translateY(8px) scale(.97)'});
    if(mode==='reduced'){
      play(dialog,[{opacity:current?.opacity||0},{opacity:1}],{duration:80,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'dialog-open'});
      return;
    }
    play(dialog,[start,{opacity:1,transform:'none'}],{duration:isDrawer?260:220,easing:isDrawer?ease('--motion-ease-drawer','cubic-bezier(0.32,0.72,0,1)'):ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'dialog-open'});
  }
  function closeDialog(dialog,event,options={}){
    if(!dialog?.open)return;
    const prior=activeAnimations.get(dialog);
    const mode=options.immediate?'instant':modeFor(event);
    if(prior?.kind==='dialog-close'&&mode==='full')return;
    const current=visualState(dialog);
    if(prior)cancelRecord(dialog,prior);
    if(mode==='instant'){dialog.close();return;}
    const isDrawer=dialog.id==='bag-dialog';
    const finish=()=>{if(dialog.open)dialog.close()};
    if(mode==='reduced'){
      play(dialog,[{opacity:current.opacity},{opacity:0}],{duration:80,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),onFinish:finish,kind:'dialog-close'});
      return;
    }
    const destination=isDrawer?{opacity:1,transform:'translateX(100%)'}:{opacity:0,transform:'translateY(8px) scale(.97)'};
    play(dialog,[current,destination],{duration:isDrawer?180:160,easing:isDrawer?ease('--motion-ease-drawer','cubic-bezier(0.32,0.72,0,1)'):ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),onFinish:finish,kind:'dialog-close'});
  }
  function setMenu(menu,open,event){
    if(!menu)return;
    const prior=activeAnimations.get(menu);
    const wasVisible=!menu.hidden;
    if(open&&wasVisible&&(!prior||prior.kind==='menu-open'))return;
    if(!open&&!wasVisible&&!prior)return;
    const current=wasVisible?visualState(menu):{opacity:'0',transform:'translateY(4px) scale(.98)'};
    if(prior)cancelRecord(menu,prior);
    const mode=modeFor(event);
    if(open){
      menu.hidden=false;
      menu.inert=false;
      menu.setAttribute('aria-hidden','false');
      if(mode==='instant')return;
      if(mode==='reduced'){
        play(menu,[{opacity:current.opacity},{opacity:1}],{duration:80,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'menu-open'});
        return;
      }
      play(menu,[current,{opacity:1,transform:'none'}],{duration:180,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'menu-open'});
      return;
    }
    menu.inert=true;
    menu.setAttribute('aria-hidden','true');
    const hide=()=>{menu.hidden=true};
    if(mode==='instant'){hide();return;}
    if(mode==='reduced'){
      play(menu,[{opacity:current.opacity},{opacity:0}],{duration:80,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),onFinish:hide,kind:'menu-close'});
      return;
    }
    play(menu,[current,{opacity:0,transform:'translateY(4px) scale(.98)'}],{duration:120,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),onFinish:hide,kind:'menu-close'});
  }
  function feedbackGrid(grid,event){
    const mode=modeFor(event);
    if(!grid||mode==='instant')return;
    const current=visualState(grid).opacity;
    const from=Math.min(Number(current)||1,.88);
    play(grid,[{opacity:from},{opacity:1}],{duration:mode==='reduced'?80:140,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'grid-feedback'});
  }
  function reveal(element){
    if(revealed.has(element))return;
    revealed.add(element);
    if(modeFor()!=='full'||typeof element.animate!=='function')return;
    play(element,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:320,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'section-reveal'});
  }
  function refreshReveals(){
    revealObserver?.disconnect();
    revealObserver=null;
    if(modeFor()!=='full'||!('IntersectionObserver'in window))return;
    const selector='.reveal,.b2b-section,.contact-manifesto,.service-section:not(.legal-content)';
    const targets=[...document.querySelectorAll(selector)].filter(element=>!element.closest('.legal-content,form,.checkout-shell,.contact-layout'));
    const topLevel=targets.filter(element=>!targets.some(parent=>parent!==element&&parent.contains(element)&&parent.matches('.b2b-section,.service-section:not(.legal-content)')));
    const observer=new IntersectionObserver(entries=>entries.forEach(({isIntersecting,target})=>{
      if(!isIntersecting)return;
      observer.unobserve(target);
      reveal(target);
    }),{threshold:.08});
    revealObserver=observer;
    topLevel.forEach(element=>{
      if(revealed.has(element))return;
      const bounds=element.getBoundingClientRect();
      if(bounds.top<innerHeight&&bounds.bottom>0){revealed.add(element);return;}
      revealObserver.observe(element);
    });
  }
  function playHeroEntrance(){
    if(heroPlayed||modeFor()!=='full')return;
    const hero=document.querySelector('.hero');
    if(!hero||hero.getBoundingClientRect().top>=innerHeight)return;
    heroPlayed=true;
    const items=[hero.querySelector('h1'),hero.querySelector('.hero-copy>p'),hero.querySelector('.hero-actions')].filter(Boolean);
    items.forEach((element,index)=>play(element,[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:400,delay:index*20,easing:ease('--motion-ease-out','cubic-bezier(0.23,1,0.32,1)'),kind:'hero-entrance'}));
  }

  document.addEventListener('pointerdown',()=>{root.dataset.motionInput='pointer'},true);
  document.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'||event.pointerType==='pen')root.dataset.motionInput='pointer'},true);
  document.addEventListener('wheel',()=>{if(finePointerQuery.matches)root.dataset.motionInput='pointer'},true);
  document.addEventListener('keydown',()=>{root.dataset.motionInput='keyboard';finishAll()},true);
  const policyChanged=()=>{finishAll();refreshReveals()};
  reduceQuery.addEventListener?.('change',policyChanged);
  finePointerQuery.addEventListener?.('change',policyChanged);

  window.NetproMotion=Object.freeze({allowsMotion,openDialog,closeDialog,handleNativeClose,setMenu,feedbackGrid,refreshReveals});
  playHeroEntrance();
  refreshReveals();
})();
