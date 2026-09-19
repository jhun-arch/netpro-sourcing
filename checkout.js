const products=[{"id": "tee-white", "name": "Essential White Tee", "category": "clothing", "price": 24, "color": "White", "swatch": "#f0f0eb", "sizes": ["S", "M", "L", "XL"], "art": "catalog-0", "isNew": true, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "tee-navy", "name": "Essential Navy Tee", "category": "clothing", "price": 24, "color": "Navy", "swatch": "#1d304c", "sizes": ["S", "M", "L", "XL"], "art": "catalog-1", "isNew": false, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "sweatshirt", "name": "Classic Crewneck", "category": "clothing", "price": 48, "color": "Oatmeal", "swatch": "#d9ceba", "sizes": ["S", "M", "L", "XL"], "art": "catalog-2", "isNew": true, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "hoodie", "name": "Basic Hoodie", "category": "clothing", "price": 68, "color": "Sky blue", "swatch": "#a4c6df", "sizes": ["S", "M", "L", "XL"], "art": "catalog-3", "isNew": false, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "socks", "name": "Basic Crew Socks", "category": "socks", "price": 12, "color": "White", "swatch": "#f0f0eb", "sizes": ["S/M", "L/XL"], "art": "catalog-4", "isNew": true, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "socks-black", "name": "Black Crew Socks", "category": "socks", "price": 12, "color": "Black", "swatch": "#252525", "sizes": ["S/M", "L/XL"], "art": "catalog-5", "isNew": false, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "cap", "name": "Basic Blue Cap", "category": "headwear", "price": 32, "color": "Cobalt blue", "swatch": "#285cad", "sizes": ["One size"], "art": "catalog-6", "isNew": false, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "cap-beige", "name": "Basic Beige Cap", "category": "headwear", "price": 32, "color": "Beige", "swatch": "#d6c5a8", "sizes": ["One size"], "art": "catalog-7", "isNew": true, "description": "A clean, everyday basic with no added logo or print. Choose the ready-made style or email us to discuss your custom design, quantities and pricing."}, {"id": "patch", "name": "Blank Shape Patches", "category": "patches", "price": 8, "color": "Mixed blues", "swatch": "#3d608e", "sizes": ["One size"], "art": "catalog-8", "isNew": false, "description": "Simple embroidered patch shapes, ready for your own creative touch. Contact us to discuss a custom patch design."}];

(()=>{
const $=s=>document.querySelector(s),money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n);
let bag=[];try{bag=JSON.parse(localStorage.getItem('netpro-b2b-purchase')||'[]').filter(x=>products.some(p=>p.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=100000)}catch{}
const total=bag.reduce((n,x)=>n+products.find(p=>p.id===x.id).price*x.quantity,0);
$('#checkout-items').innerHTML=bag.length?bag.map(x=>{const p=products.find(p=>p.id===x.id);return `<article class="checkout-item"><div class="product-art art-${p.art}" role="img" aria-label="${p.name}"></div><div><strong>${p.name}</strong><p>${p.color} · ${p.sizes.includes(x.size)?x.size:''}<br>Qty: ${x.quantity}</p></div><span>${money(p.price*x.quantity)}</span></article>`}).join(''):'<p>Your cart is empty. <a href="shop.html">Explore the collection ↗</a></p>';
$$('.order-amount').forEach(el=>el.textContent=money(total));
function $$(s){return [...document.querySelectorAll(s)]}
let unlocked=0;
function openStep(i){$$('.checkout-step').forEach((el,j)=>{el.classList.toggle('current',i===j);el.querySelector('.step-content').hidden=i!==j;el.querySelector('.step-title').setAttribute('aria-expanded',String(i===j));el.querySelector('.step-title').disabled=j>unlocked;});}
$$('.step-title').forEach((el,i)=>el.addEventListener('click',()=>openStep(i)));
$$('.step-form').forEach((form,i)=>form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return;unlocked=Math.max(unlocked,i+1);if(i===2){$('#review-name').textContent=$('#first-name').value+' '+$('#last-name').value;$('#review-email').textContent=$('#email').value;$('#review-address').textContent=[$('#address').value,$('#city').value,$('#region').value,$('#postal').value,$('#country').value].filter(Boolean).join(', ');$('#review-payment').textContent=document.querySelector('[name=payment]:checked').value;}openStep(i+1);}));
if(!bag.length){$$('.step-form button[type=submit]').forEach(el=>el.disabled=true);}
openStep(0);
})();
 document.querySelector('#send-purchase-enquiry')?.addEventListener('click',async()=>{
 const button=document.querySelector('#send-purchase-enquiry'),status=document.querySelector('#purchase-enquiry-status');
 let items=[];try{items=JSON.parse(localStorage.getItem('netpro-b2b-purchase')||'[]').filter(x=>products.some(p=>p.id===x.id)&&Number.isInteger(x.quantity)&&x.quantity>0&&x.quantity<=100000).map(x=>{const p=products.find(p=>p.id===x.id);return {name:p.name,color:p.color,size:x.size,quantity:x.quantity};});}catch{}
 if(!items.length){status.textContent='Your cart is empty. Add products before sending a purchase enquiry.';return;}
 const subtotal=items.reduce((n,x)=>{const p=products.find(p=>p.name===x.name);return n+(p?p.price*x.quantity:0);},0);
 const payload={
  name:(document.querySelector('#first-name').value+' '+document.querySelector('#last-name').value).trim(),
  email:document.querySelector('#email').value,
  address:[document.querySelector('#address').value,document.querySelector('#city').value,document.querySelector('#region').value,document.querySelector('#postal').value,document.querySelector('#country').value].map(s=>s.trim()).filter(Boolean).join(', '),
  payment:document.querySelector('[name=payment]:checked')?.value||'',
  website:document.querySelector('#website')?.value||'',
  items,
  subtotal:new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(subtotal)
 };
 const originalLabel=button.textContent;button.disabled=true;button.textContent='Sending…';status.textContent='Sending your purchase enquiry…';
 try{
  const res=await fetch('/api/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if(!res.ok){const data=await res.json().catch(()=>null);throw new Error((data&&data.error)||'Request failed');}
  try{localStorage.removeItem('netpro-b2b-purchase');}catch{}
  status.textContent="Thank you. We've received your purchase enquiry and sent a confirmation to your email. No order or payment has been processed.";
 }catch(err){
  status.textContent=err.message&&err.message!=='Request failed'?err.message:'Sorry, your enquiry could not be sent right now. Please try again in a moment.';
 }finally{
  button.disabled=false;button.textContent=originalLabel;
 }
 });
