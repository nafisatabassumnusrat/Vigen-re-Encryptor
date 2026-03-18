/* ══ PARTICLES ══ */
(()=>{
  const cv=document.getElementById('pcvs'),ctx=cv.getContext('2d');
  let W,H,pts=[];
  const rsz=()=>{W=cv.width=window.innerWidth;H=cv.height=window.innerHeight;};
  rsz();window.addEventListener('resize',rsz);
  class P{
    constructor(){this.r();}
    r(){this.x=Math.random()*W;this.y=Math.random()*H;
      this.vx=(Math.random()-.5)*.35;this.vy=(Math.random()-.5)*.35;
      this.a=Math.random()*.45+.1;this.rad=Math.random()*1.6+.3;
      this.c=Math.random()>.5?'124,108,252':Math.random()>.5?'45,212,191':'244,114,182';}
    update(){this.x+=this.vx;this.y+=this.vy;
      if(this.x<0||this.x>W||this.y<0||this.y>H)this.r();}
    draw(){ctx.beginPath();ctx.arc(this.x,this.y,this.rad,0,Math.PI*2);
      ctx.fillStyle=`rgba(${this.c},${this.a})`;ctx.fill();}
  }
  for(let i=0;i<80;i++)pts.push(new P());
  const loop=()=>{
    ctx.clearRect(0,0,W,H);
    for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){
      const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
      if(d<95){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
        ctx.strokeStyle=`rgba(124,108,252,${.07*(1-d/95)})`;ctx.lineWidth=.5;ctx.stroke();}
    }
    pts.forEach(p=>{p.update();p.draw();});
    requestAnimationFrame(loop);
  };
  loop();
})();

/* ══ CURSOR GLOW ══ */
const cg=document.getElementById('cglow');
document.addEventListener('mousemove',e=>{cg.style.left=e.clientX+'px';cg.style.top=e.clientY+'px';});

/* ══ RIPPLE ══ */
document.addEventListener('click',e=>{
  const btn=e.target.closest('.ripple-btn');
  if(!btn)return;
  const r=document.createElement('span');r.className='ripple';
  const rc=btn.getBoundingClientRect(),sz=Math.max(rc.width,rc.height)*2;
  r.style.cssText=`width:${sz}px;height:${sz}px;left:${e.clientX-rc.left-sz/2}px;top:${e.clientY-rc.top-sz/2}px;`;
  btn.appendChild(r);setTimeout(()=>r.remove(),600);
});

/* ══ STATE ══ */
let cipherMode='vigenere';
let hist=JSON.parse(localStorage.getItem('cf_hist')||'[]');
let liveT=null;

/* ══ INIT ══ */
window.addEventListener('DOMContentLoaded',()=>{
  const sk=localStorage.getItem('cf_key'),sm=localStorage.getItem('cf_msg');
  if(sk){document.getElementById('keyInput').value=sk;updateKeyUI();}
  if(sm){document.getElementById('inputText').value=sm;document.getElementById('ccIn').textContent=sm.length+' characters';}
  renderHist();initFreq();initDrop();

  document.getElementById('inputText').addEventListener('input',()=>{
    const t=document.getElementById('inputText').value;
    document.getElementById('ccIn').textContent=t.length+' characters';
    localStorage.setItem('cf_msg',t);
    clearTimeout(liveT);liveT=setTimeout(()=>{if(t)doEncrypt(true);},280);
  });
  document.getElementById('keyInput').addEventListener('input',()=>{
    validateKey();updateKeyUI();
    localStorage.setItem('cf_key',document.getElementById('keyInput').value);
    clearTimeout(liveT);liveT=setTimeout(()=>{if(document.getElementById('inputText').value)doEncrypt(true);},280);
  });
  document.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.shiftKey&&e.key==='Enter'){e.preventDefault();doDecrypt();}
    else if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();doEncrypt();}
  });
  const th=localStorage.getItem('cf_theme')||'dark';
  document.documentElement.setAttribute('data-theme',th);
  document.getElementById('themeToggle').textContent=th==='dark'?'🌙':'☀️';
  document.getElementById('cipherMode').addEventListener('change',e=>{
    cipherMode=e.target.value;
    document.getElementById('modeBadge').textContent=cipherMode.toUpperCase();
    document.getElementById('caesarWrap').style.display=cipherMode==='caesar'?'':'none';
  });
});

/* ══ KEY UI ══ */
function updateKeyUI(){
  const k=document.getElementById('keyInput').value;
  document.getElementById('keyLen').textContent=k.length;
  const bars=['sb1','sb2','sb3','sb4','sb5'].map(id=>document.getElementById(id));
  const lbl=document.getElementById('sLabel');
  const len=k.replace(/[^a-zA-Z]/g,'').length;
  let s=0;if(len>=4)s=1;if(len>=7)s=2;if(len>=10)s=3;if(len>=14)s=4;if(len>=18)s=5;
  const cols=['','#f87171','#fbbf24','#fbbf24','#34d399','#2dd4bf'];
  const lbls=['—','Weak','Fair','Good','Strong','Excellent'];
  bars.forEach((b,i)=>b.style.background=i<s?cols[s]:'var(--border)');
  lbl.textContent=lbls[s];lbl.style.color=cols[s]||'var(--text3)';
}

/* ══ VIGENÈRE ══ */
function vigEnc(text,key){
  key=key.toUpperCase().replace(/[^A-Z]/g,'');
  if(!key)return{result:text,maps:[]};
  let r='',ki=0,maps=[];
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(/[a-zA-Z]/.test(c)){
      const up=c===c.toUpperCase(),base=up?65:97;
      const sh=key[ki%key.length].charCodeAt(0)-65;
      const enc=String.fromCharCode(((c.toUpperCase().charCodeAt(0)-65+sh)%26)+base);
      maps.push({p:c.toUpperCase(),k:key[ki%key.length],e:enc.toUpperCase(),s:sh});
      r+=enc;ki++;
    }else r+=c;
  }
  return{result:r,maps};
}
function vigDec(text,key){
  key=key.toUpperCase().replace(/[^A-Z]/g,'');
  if(!key)return text;
  let r='',ki=0;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(/[a-zA-Z]/.test(c)){
      const up=c===c.toUpperCase(),base=up?65:97;
      const sh=key[ki%key.length].charCodeAt(0)-65;
      r+=String.fromCharCode(((c.toUpperCase().charCodeAt(0)-65-sh+26)%26)+base);ki++;
    }else r+=c;
  }
  return r;
}
function caesarEnc(text,sh){
  sh=((sh%26)+26)%26;let r='',maps=[];
  for(const c of text){
    if(/[a-zA-Z]/.test(c)){
      const up=c===c.toUpperCase(),base=up?65:97;
      const enc=String.fromCharCode(((c.charCodeAt(0)-base+sh)%26)+base);
      maps.push({p:c.toUpperCase(),k:String(sh),e:enc.toUpperCase(),s:sh});r+=enc;
    }else r+=c;
  }
  return{result:r,maps};
}
function caesarDec(text,sh){return caesarEnc(text,26-((sh%26+26)%26)).result;}

/* ══ KEY UTILS ══ */
function getKey(){
  let k=document.getElementById('keyInput').value.trim();
  if(!k)k=generateKey(true);return k;
}
function generateKey(silent){
  const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const k=Array.from({length:Math.floor(Math.random()*8)+5},()=>a[Math.floor(Math.random()*26)]).join('');
  document.getElementById('keyInput').value=k;updateKeyUI();
  localStorage.setItem('cf_key',k);
  if(!silent)toast('Key generated: '+k,'info');
  return k;
}
function validateKey(){
  const k=document.getElementById('keyInput').value;
  const w=document.getElementById('keyWarn');
  if(k&&/[^a-zA-Z]/.test(k)){w.style.display='block';w.style.animation='shake .4s ease';return false;}
  w.style.display='none';return true;
}

/* ══ ENCRYPT / DECRYPT ══ */
function doEncrypt(live=false){
  if(!validateKey()){if(!live)toast('Fix the key first!','error');return;}
  const text=document.getElementById('inputText').value;
  if(!text){if(!live)toast('Enter some text!','error');return;}
  const key=getKey(),t0=performance.now();
  let result,maps;
  if(cipherMode==='caesar'){const sh=parseInt(document.getElementById('caesarShift').value)||3;({result,maps}=caesarEnc(text,sh));}
  else({result,maps}=vigEnc(text,key));
  const dt=(performance.now()-t0).toFixed(2);
  setOutput(result,live);updateStats(text,key,dt);renderCharMap(maps.slice(0,20));renderFreq(result);
  if(!live){addHist({key,input:text,output:result,mode:cipherMode,time:dt});toast('Encrypted! 🔒','success');}
}
function doDecrypt(){
  if(!validateKey()){toast('Fix the key first!','error');return;}
  const text=document.getElementById('inputText').value;
  if(!text){toast('Enter text to decrypt!','error');return;}
  const key=getKey(),t0=performance.now();
  let result;
  if(cipherMode==='caesar'){const sh=parseInt(document.getElementById('caesarShift').value)||3;result=caesarDec(text,sh);}
  else result=vigDec(text,key);
  const dt=(performance.now()-t0).toFixed(2);
  setOutput(result,false);updateStats(text,key,dt);renderFreq(result);
  const rd=result.split('').filter(c=>/[a-zA-Z ]/.test(c));
  if(rd.length/result.length<0.5)toast('⚠ Unusual result — check key?','info');
  else toast('Decrypted! 🔓','success');
  addHist({key,input:text,output:result,mode:cipherMode+' DEC',time:dt});
}

/* ══ OUTPUT ══ */
function setOutput(text,live){
  const el=document.getElementById('outputText');
  document.getElementById('ccOut').textContent=text.length+' characters';
  if(live){el.value=text;return;}
  el.value='';let i=0;
  const sp=Math.max(8,Math.min(32,900/text.length));
  const iv=setInterval(()=>{el.value+=text[i++];if(i>=text.length)clearInterval(iv);},sp);
}

/* ══ STATS ══ */
function updateStats(msg,key,time){
  const pv=(id,v)=>{const el=document.getElementById(id);el.classList.remove('pop');void el.offsetWidth;el.classList.add('pop');
    if(id==='sTime')el.innerHTML=v+'<span style="font-size:.72rem">ms</span>';else el.textContent=v;};
  pv('sMsg',msg.length);pv('sKey',key.length);pv('sTime',time);
  const al=msg.split('').filter(c=>/[a-zA-Z]/.test(c)).length;
  document.getElementById('sExtra').innerHTML=`<span style="color:var(--teal)">${al}</span> letters · <span style="color:var(--text2)">${msg.length-al}</span> symbols unchanged`;
}

/* ══ CHAR MAP ══ */
function renderCharMap(maps){
  const el=document.getElementById('charMap');
  if(!maps.length){el.innerHTML='<div style="color:var(--text3);font-size:.76rem;text-align:center;padding:22px;">No mappings.</div>';return;}
  el.innerHTML=maps.map((m,i)=>`
    <div class="char-row" style="animation-delay:${i*.038}s">
      <div class="cbox cp">${m.p}</div>
      <span class="cop">+</span>
      <div class="cbox ck">${m.k}</div>
      <span class="cop">→</span>
      <div class="cbox ce">${m.e}</div>
      <span class="cop" style="font-size:.64rem">(+${m.s})</span>
    </div>`).join('')+(maps.length===20?'<div style="color:var(--text3);font-size:.66rem;text-align:center;padding:5px 0">…first 20 shown</div>':'');
}

/* ══ FREQ ══ */
function initFreq(){
  document.getElementById('freqBars').innerHTML='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(l=>`
    <div class="fcol">
      <div class="fbar" id="fb_${l}" style="height:2px" data-count="0"></div>
      <div class="flbl">${l}</div>
    </div>`).join('');
}
function renderFreq(text){
  const cnt={};for(const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')cnt[c]=0;
  for(const c of text.toUpperCase())if(cnt[c]!==undefined)cnt[c]++;
  const mx=Math.max(...Object.values(cnt),1);
  for(const[c,n]of Object.entries(cnt)){
    const b=document.getElementById('fb_'+c);
    if(b){b.style.height=Math.max(2,Math.round(n/mx*100))+'px';
      b.setAttribute('data-count',n);
      b.style.background=n>0?'linear-gradient(to top,var(--accent),var(--teal))':'var(--surface2)';}
  }
}

/* ══ HISTORY ══ */
function addHist(e){e.ts=Date.now();hist.unshift(e);if(hist.length>5)hist.pop();localStorage.setItem('cf_hist',JSON.stringify(hist));renderHist();}
function renderHist(){
  const el=document.getElementById('histList');
  if(!hist.length){el.innerHTML='<div class="empty-hist">No history yet. Start encrypting! 🔐</div>';return;}
  el.innerHTML=hist.map((h,i)=>`
    <div class="hist-item" onclick="loadHist(${i})">
      <div class="hi-top"><span class="hi-key">🗝 ${h.key}</span><span class="hi-time">${new Date(h.ts).toLocaleTimeString()} · ${h.mode?.toUpperCase()} · ${h.time}ms</span></div>
      <div class="hi-msg"><span style="color:var(--text3)">IN:</span> ${h.input.slice(0,42)}${h.input.length>42?'…':''}</div>
      <div class="hi-msg hi-enc"><span style="color:var(--text3)">OUT:</span> ${h.output.slice(0,42)}${h.output.length>42?'…':''}</div>
    </div>`).join('');
}
function loadHist(i){
  const h=hist[i];
  document.getElementById('keyInput').value=h.key;
  document.getElementById('inputText').value=h.input;
  document.getElementById('outputText').value=h.output;
  document.getElementById('ccIn').textContent=h.input.length+' characters';
  document.getElementById('ccOut').textContent=h.output.length+' characters';
  updateKeyUI();updateStats(h.input,h.key,h.time);toast('History loaded!','info');
}
function clearHistory(){hist=[];localStorage.removeItem('cf_hist');renderHist();toast('History cleared','info');}

/* ══ ACTIONS ══ */
async function copyOutput(){
  const t=document.getElementById('outputText').value;
  if(!t){toast('Nothing to copy!','error');return;}
  await navigator.clipboard.writeText(t);toast('Copied! 📋','success');
}
function downloadOutput(){
  const t=document.getElementById('outputText').value;
  if(!t){toast('Nothing to download!','error');return;}
  const a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([t],{type:'text/plain'}));
  a.download='cipherforge_output.txt';a.click();toast('Downloaded! 💾','success');
}
function swapTexts(){
  const i=document.getElementById('inputText'),o=document.getElementById('outputText');
  const tmp=i.value;i.value=o.value;o.value=tmp;
  document.getElementById('ccIn').textContent=i.value.length+' characters';
  document.getElementById('ccOut').textContent=o.value.length+' characters';
  toast('Swapped! ⇄','info');
}
function useAsInput(){
  const o=document.getElementById('outputText').value;
  if(!o){toast('Output is empty!','error');return;}
  document.getElementById('inputText').value=o;
  document.getElementById('ccIn').textContent=o.length+' characters';
  toast('Moved to input!','info');
}
function clearAll(){
  document.getElementById('inputText').value='';
  document.getElementById('outputText').value='';
  document.getElementById('ccIn').textContent='0 characters';
  document.getElementById('ccOut').textContent='0 characters';
  initFreq();
  document.getElementById('charMap').innerHTML='<div style="color:var(--text3);font-size:.76rem;text-align:center;padding:22px;">Run encryption to see mappings…</div>';
  toast('Cleared!','info');
}
function loadFile(e){
  const f=e.target.files[0];if(!f)return;
  const r=new FileReader();r.onload=ev=>{document.getElementById('inputText').value=ev.target.result;toast('File loaded! 📁','success');};r.readAsText(f);
}
function initDrop(){
  const z=document.getElementById('dropZone');
  z.addEventListener('dragover',e=>{e.preventDefault();z.classList.add('drag-over');});
  z.addEventListener('dragleave',()=>z.classList.remove('drag-over'));
  z.addEventListener('drop',e=>{
    e.preventDefault();z.classList.remove('drag-over');
    const f=e.dataTransfer.files[0];
    if(!f||!f.name.endsWith('.txt')){toast('Only .txt files!','error');return;}
    const r=new FileReader();r.onload=ev=>{document.getElementById('inputText').value=ev.target.result;toast('File dropped!','success');};r.readAsText(f);
  });
  z.addEventListener('click',()=>{const inp=document.createElement('input');inp.type='file';inp.accept='.txt';inp.onchange=loadFile;inp.click();});
}

/* ══ THEME ══ */
document.getElementById('themeToggle').addEventListener('click',()=>{
  const cur=document.documentElement.getAttribute('data-theme');
  const next=cur==='dark'?'light':'dark';
  document.documentElement.setAttribute('data-theme',next);
  document.getElementById('themeToggle').textContent=next==='dark'?'🌙':'☀️';
  localStorage.setItem('cf_theme',next);
  toast(next==='dark'?'Dark mode 🌙':'Light mode ☀️','info');
});

/* ══ TOAST ══ */
function toast(msg,type='info'){
  const icons={success:'✅',error:'❌',info:'💡'};
  const el=document.createElement('div');el.className=`toast ${type}`;
  el.innerHTML=`${icons[type]} ${msg}`;
  document.getElementById('toast-ct').appendChild(el);
  setTimeout(()=>{el.classList.add('fade-out');setTimeout(()=>el.remove(),300);},2700);
}

/* ══ MODAL ══ */
function showModal(title,body){
  document.getElementById('mTitle').textContent=title;
  document.getElementById('mBody').textContent=body;
  document.getElementById('modalOv').classList.add('show');
}
function closeModal(){document.getElementById('modalOv').classList.remove('show');}
document.getElementById('modalOv').addEventListener('click',e=>{if(e.target===document.getElementById('modalOv'))closeModal();});