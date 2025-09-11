/* teleport.js
   Keep this file in the same folder as teleport.html and teleport.css.
   GSAP must be loaded before this file (HTML includes GSAP CDN).
*/
document.addEventListener('DOMContentLoaded', () => {
  /* =========================
     Utilities & Preferences
     ========================= */
  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const yearEl = document.getElementById('year'); yearEl && (yearEl.textContent = new Date().getFullYear());

  let currentTheme = localStorage.getItem('siteTheme') || 'land';
  let currentMode  = localStorage.getItem('siteMode')  || 'dark';
  let lowPower     = JSON.parse(localStorage.getItem('siteLowPower') || 'false'); // kept but not surfaced in UI

  const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
  const rnd = (a,b)=>Math.random()*(b-a)+a;

  /* Theme visuals (inline SVG backgrounds for parallax layers) */
  /* NOTE: 'space' replaced previous 'galaxy' key */
  const themeLayers = {
    land: {
      back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'>
               <rect width='1200' height='800' fill='#07130d'/>
               <g fill='#05110a' opacity='0.9'><path d='M0 700 C240 560 480 760 720 700 C960 640 1200 780 1200 700 L1200 800 L0 800 Z'/></g>
             </svg>`,
      mid: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'>
              <g fill='#0b1f12' opacity='0.7'>
                <path d='M0 640 C200 560 400 720 600 680 C800 640 1000 700 1200 660 L1200 760 L0 760 Z' />
              </g>
            </svg>`,
      front: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'>
               <g fill='#13321b' opacity='0.55'>
                 <path d='M0 700 C180 620 360 760 540 720 C720 680 900 760 1200 720 L1200 760 L0 760 Z'/>
               </g>
             </svg>`
    },
    water: {
      back: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'>
              <rect width='1200' height='800' fill='#00111b'/>
              <g fill='#001621' opacity='0.9'><path d='M0 700 C240 560 480 760 720 700 C960 640 1200 780 1200 700 L1200 800 L0 800 Z'/></g>
             </svg>`,
      mid:`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'><g fill='#012233' opacity='0.6'><path d='M0 640 C240 560 480 720 720 660 C960 600 1200 720 1200 720 L1200 800 L0 800 Z'/></g></svg>`,
      front:`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'><g fill='#03324a' opacity='0.42'><path d='M0 700 C180 620 360 760 540 720 C720 680 900 760 1200 720 L1200 760 L0 760 Z'/></g></svg>`
    },
    space: { /* replaced galaxy -> space */
      back:`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'>
              <rect width='1200' height='800' fill='#000b17'/>
              <defs>
                <radialGradient id='nebA' cx='30%' cy='40%'>
                  <stop offset='0%' stop-color='#5a2fff' stop-opacity='0.95'/>
                  <stop offset='35%' stop-color='#5a2fff' stop-opacity='0.28'/>
                  <stop offset='70%' stop-color='#2a0f66' stop-opacity='0.12'/>
                  <stop offset='100%' stop-color='#000b17' stop-opacity='1'/>
                </radialGradient>
                <radialGradient id='nebB' cx='75%' cy='70%'>
                  <stop offset='0%' stop-color='#ff88e7' stop-opacity='0.22'/>
                  <stop offset='40%' stop-color='#8b5cf6' stop-opacity='0.08'/>
                  <stop offset='100%' stop-color='#000b17' stop-opacity='0'/>
                </radialGradient>
              </defs>
              <rect width='1200' height='800' fill='url(#nebA)'/>
              <rect width='1200' height='800' fill='url(#nebB)' opacity='0.6'/>
             </svg>`,
      mid:`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'><g opacity='0.45'><circle cx='220' cy='140' r='320' fill='#101233'/></g></svg>`,
      front:`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 800' preserveAspectRatio='none'><g opacity='0.35'><circle cx='950' cy='240' r='180' fill='#101024'/></g></svg>`
    }
  };

  /* Parallax layers DOM references */
  const layerBack  = document.getElementById('layerBack');
  const layerMid   = document.getElementById('layerMid');
  const layerFront = document.getElementById('layerFront');
  const overlayTint = document.getElementById('overlayTint');
  const aura = document.getElementById('aura');
  const cursorCanvas = document.getElementById('cursorCanvas');
  const cursorCtx = cursorCanvas.getContext('2d');

  /* Set layer contents and aura style based on theme/mode
     Important: switching MODE must not rebuild/respawn objects (so positions remain).
  */
  function applyThemeMode() {
    document.body.classList.remove('theme-land','theme-water','theme-space','dark','light');
    document.body.classList.add(`theme-${currentTheme}`);
    document.body.classList.add(currentMode === 'light' ? 'light' : 'dark');

    layerBack.innerHTML = themeLayers[currentTheme].back;
    layerMid.innerHTML  = themeLayers[currentTheme].mid;
    layerFront.innerHTML = themeLayers[currentTheme].front;

    if(currentTheme === 'land'){
      aura.style.background = 'radial-gradient(circle at 40% 40%, rgba(96,255,157,0.22), transparent 30%), radial-gradient(circle at 60% 60%, rgba(120,255,180,0.12), transparent 40%)';
      aura.style.opacity = '0.9';
    } else if(currentTheme === 'water'){
      aura.style.background = 'radial-gradient(circle at 50% 40%, rgba(80,230,255,0.18), transparent 30%), radial-gradient(circle at 60% 60%, rgba(110,240,255,0.09), transparent 40%)';
      aura.style.opacity = '0.85';
    } else { // space
      aura.style.background = 'radial-gradient(circle at 50% 45%, rgba(138,85,255,0.22), transparent 30%), radial-gradient(circle at 70% 60%, rgba(255,255,255,0.06), transparent 40%)';
      aura.style.opacity = '0.95';
    }

    overlayTint.style.background = currentMode === 'dark' ? 'rgba(2,6,12,0.18)' : 'rgba(255,255,255,0.04)';
    if(window.gsap && !prefersReduced) {
      gsap.fromTo(overlayTint, {opacity: 0.95}, {opacity:0, duration:0.7, ease:'power2.out'});
    } else {
      overlayTint.style.opacity = 0;
    }

    // persist
    localStorage.setItem('siteTheme', currentTheme);
    localStorage.setItem('siteMode', currentMode);
    localStorage.setItem('siteLowPower', lowPower ? 'true' : 'false');

    // update BG systems:
    BG.setTheme(currentTheme); // rebuild only if theme changed
    BG.setMode(currentMode);   // update visuals without rebuilding
  }

  /* UI control wiring */
  const themeButtons = document.querySelectorAll('[data-theme]');
  const darkBtn = document.getElementById('darkBtn');
  const lightBtn = document.getElementById('lightBtn');

  themeButtons.forEach(btn => {
    btn.addEventListener('click', ()=> {
      themeButtons.forEach(b=>b.classList.remove('pressed')); btn.classList.add('pressed');
      currentTheme = btn.dataset.theme; applyThemeMode();
    });
  });
  darkBtn.addEventListener('click', ()=> { darkBtn.classList.add('pressed'); lightBtn.classList.remove('pressed'); currentMode='dark'; applyThemeMode(); });
  lightBtn.addEventListener('click', ()=> { lightBtn.classList.add('pressed'); darkBtn.classList.remove('pressed'); currentMode='light'; applyThemeMode(); });

  /* ================================
     Responsive canvas for sprites
     (leaves / jellyfish / bubbles / stars)
     ================================ */
  const canvas = document.getElementById('bgCanvas');
  const ctx = canvas.getContext('2d', { alpha: true });

  let DPR = Math.max(1, window.devicePixelRatio || 1);
  let W = innerWidth, H = innerHeight;
  let area = W * H;
  let BGobjects = [];
  let theme = currentTheme; // actual runtime theme used by BG system
  let mode = currentMode;   // runtime mode
  let raf = null;
  let lastTime = performance.now();

  function setCanvasSize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = innerWidth; H = innerHeight; area = Math.max(60000, W*H);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR,0,0,DPR,0,0);

    // cursor canvas same size
    cursorCanvas.width = Math.round(W * DPR);
    cursorCanvas.height = Math.round(H * DPR);
    cursorCanvas.style.width = W + 'px';
    cursorCanvas.style.height = H + 'px';
    cursorCtx.setTransform(DPR,0,0,DPR,0,0);
  }

  // compute counts — water: jellies & bubbles; others fallback to leaves/stars
  function counts() {
    if(theme === 'water'){
      const jellyCount = Math.round(rnd(8,14));
      const bubbleCount = clamp(Math.round(area / 25000), 40, 220); // scaled by area but capped
      return { leaves: 0, jellies: jellyCount, bubbles: bubbleCount, stars: 0 };
    }
    const factor = lowPower ? 1.8 : 1;
    return {
      leaves: clamp(Math.round(area / (150000 * factor)), 8, 320),
      jellies: 0,
      bubbles: 0,
      stars: clamp(Math.round(area / (38000 * factor)), 20, 1400)
    };
  }

  /* Leaf class */
  class Leaf {
    constructor(init=false){
      this.reset(init);
    }
    reset(init=false){
      const scale = Math.sqrt(area) / 900;
      this.size = (8 + Math.random()*28) * clamp(scale, 0.6, 2.4);
      this.x = Math.random()*W;
      this.y = init ? Math.random()*H : -this.size - Math.random()*H*0.06;
      this.vy = (0.5 + Math.random()*1.2) * clamp(Math.sqrt(area)/1200, 0.9, 1.8);
      this.angle = Math.random()*Math.PI*2;
      this.spin = (Math.random()-0.5)*0.05;
      this.sway = Math.random()*1.6;
      this.setColorByMode();
      this.alpha = 0.7 + Math.random()*0.3;
    }
    setColorByMode(){
      this.color = mode === 'dark' ? `hsl(${Math.random()*40+90},60%,${Math.random()*25+30}%)` : `hsl(${Math.random()*25+20},70%,${Math.random()*25+35}%)`;
    }
    disturb(mx,my,strength=1){
      const dx = this.x - mx; const dy = this.y - my;
      const d2 = dx*dx + dy*dy;
      const r = 120 * strength;
      if(d2 < r*r){
        this.x += dx * 0.02 * (1 + Math.random()*0.6);
        this.y -= Math.random()*2;
      }
    }
    update(dt){
      if(!prefersReduced){
        this.y += this.vy * dt * 0.06;
        this.x += Math.sin((performance.now()*0.001 + this.y)*0.01) * this.sway;
        this.angle += this.spin * dt * 0.06;
      } else {
        this.y += this.vy * dt * 0.02;
      }
      if(this.y - this.size > H + 80) this.reset();
    }
    draw(){
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      const s = this.size;
      ctx.beginPath();
      ctx.moveTo(0, -s*0.5);
      ctx.bezierCurveTo(s*0.45, -s*0.4, s*0.45, s*0.4, 0, s*0.5);
      ctx.bezierCurveTo(-s*0.45, s*0.4, -s*0.45, -s*0.4, 0, -s*0.5);
      ctx.fill();
      ctx.restore();
    }
  }

  /* Jellyfish class */
  class Jellyfish {
    constructor(init=false){
      this.reset(init);
    }
    reset(init=false){
      this.x = Math.random() * W;
      this.y = H - (40 + Math.random() * 160);
      this.size = 18 + Math.random()*26;
      this.speedY = 0.02 + Math.random()*0.08;
      this.speedX = (Math.random() - 0.5) * 0.02;
      this.phase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.0012 + Math.random() * 0.0011;
      const hue = 180 + Math.random()*60;
      this.colorMain = `hsla(${Math.round(hue)},80%,60%,`;
      this.alpha = 0.28 + Math.random()*0.5;
      this.tentacles = 3 + Math.floor(Math.random()*4);
      this.offset = (Math.random()-0.5) * 12;
      this.drift = (Math.random()-0.5) * 0.3;
      this.age = 0;
    }
    reactToMouse(mx, my){
      const dx = this.x - mx, dy = this.y - my;
      const d2 = dx*dx + dy*dy;
      if(d2 < 16000){
        this.x += dx * 0.01;
        this.y += dy * 0.006;
        this.speedX += (dx > 0 ? 0.0015 : -0.0015);
      }
    }
    update(dt){
      this.age += dt;
      this.x += this.speedX * dt * (0.06 + Math.sin(this.age*0.0004)*0.02);
      this.y -= this.speedY * dt * 0.02;
      this.x += Math.sin((performance.now()*0.0007) + this.phase) * 0.02;
      if(this.x < -60) this.x = W + 60;
      if(this.x > W + 60) this.x = -60;
      if(this.y < H*0.18) this.y = H - (60 + Math.random()*140);
    }
    draw(){
      ctx.save();
      ctx.globalAlpha = this.alpha;
      const t = performance.now();
      const pulse = 1 + Math.sin(t * this.pulseSpeed + this.phase) * 0.06;
      const r = this.size * pulse;
      const g = ctx.createRadialGradient(this.x, this.y - r*0.25, r*0.05, this.x, this.y, r*1.2);
      g.addColorStop(0, `${this.colorMain}0.95)`);
      g.addColorStop(0.45, `${this.colorMain}0.52)`);
      g.addColorStop(1, `${this.colorMain}0.02)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(this.x, this.y, r, r*0.7, 0, Math.PI, 2*Math.PI);
      ctx.fill();

      ctx.beginPath();
      ctx.strokeStyle = `${this.colorMain}0.18)`;
      ctx.lineWidth = Math.max(0.6, r*0.08);
      ctx.ellipse(this.x, this.y, r*0.98, r*0.68, 0, Math.PI, 2*Math.PI);
      ctx.stroke();

      ctx.lineWidth = Math.max(0.6, r*0.06);
      for(let i=0;i<this.tentacles;i++){
        const angOff = (i - (this.tentacles-1)/2) * 0.25;
        const startX = this.x + angOff * (r*0.6);
        const startY = this.y + r*0.1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        const segments = 6;
        let px = startX, py = startY;
        for(let s=1;s<=segments;s++){
          const ny = startY + s * (r*0.55);
          const sway = Math.sin((t*0.0008) + s*0.7 + this.phase + i) * (4 + s*1.2) + this.offset;
          const nx = startX + sway + angOff * (s*0.6);
          ctx.quadraticCurveTo(px + (nx-px)*0.45, (py + ny)/2 + sway*0.12, nx, ny);
          px = nx; py = ny;
        }
        ctx.strokeStyle = `${this.colorMain}0.28)`;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* Bubble class */
  class Bubble {
    constructor(init=false){
      this.reset(init);
    }
    reset(init=false){
      this.x = Math.random() * W;
      this.y = H - (8 + Math.random() * 80);
      this.r = 0.8 + Math.random()*3.2;
      this.vy = 0.2 + Math.random()*1.2;
      this.vx = (Math.random()-0.5) * 0.3;
      this.life = 60 + Math.random()*160;
      this.alpha = 0.14 + Math.random()*0.5;
    }
    update(dt){
      this.y -= this.vy * dt * 0.02;
      this.x += this.vx * dt * 0.02;
      this.life -= dt * 0.02;
      if(this.y < -20 || this.life <= 0){
        this.reset();
        this.y = H - (6 + Math.random()*40);
      }
    }
    draw(){
      ctx.save();
      ctx.globalAlpha = clamp(this.alpha, 0.02, 0.95);
      ctx.beginPath();
      ctx.fillStyle = 'rgba(220,240,255,0.85)';
      ctx.arc(this.x, this.y, this.r, 0, Math.PI*2);
      ctx.fill();
      ctx.beginPath();
      ctx.globalAlpha = clamp(this.alpha*0.75, 0.02, 0.9);
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.arc(this.x - this.r*0.4, this.y - this.r*0.4, this.r*0.4, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* Star class for space theme */
  class Star {
    constructor(init=false){
      this.reset(init);
    }
    reset(init=false){
      this.x = Math.random()*W;
      this.y = Math.random()*H;
      this.size = Math.random()*1.8 + 0.2;
      this.base = Math.random()*0.8 + 0.1;
      this.speed = Math.random()*0.02 + 0.002;
      this.alpha = this.base;
      this.twinkle = Math.random() < 0.7;
    }
    twinkleNow(){
      if(window.gsap) {
        gsap.to(this, {alpha: 1.2, duration: 0.12, yoyo:true, repeat:1, ease:'sine.inOut', onComplete:()=>{ this.alpha = this.base; }});
      } else {
        this.alpha = 1.2;
        setTimeout(()=>{ this.alpha = this.base; }, 160);
      }
    }
    update(dt){
      if(this.twinkle && !prefersReduced) this.alpha = this.base + Math.sin(performance.now()*0.002 + this.x*0.001)*0.4*this.base;
    }
    draw(){
      ctx.save();
      ctx.globalAlpha = clamp(this.alpha, 0.02, 1);
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();
    }
  }

  /* Pool build and management */
  function buildPools(){
    BGobjects = [];
    const c = counts();
    if(theme === 'land'){
      for(let i=0;i<c.leaves;i++) BGobjects.push(new Leaf(true));
    } else if(theme === 'water'){
      for(let i=0;i<c.bubbles;i++) BGobjects.push(new Bubble(true));
      for(let i=0;i<c.jellies;i++) BGobjects.push(new Jellyfish(true));
    } else { // space
      for(let i=0;i<c.stars;i++) BGobjects.push(new Star(true));
    }
  }

  /* Interaction helpers */
  let mouse = {x:-9999,y:-9999,down:false};
  window.addEventListener('mousemove', (e)=>{ mouse.x = e.clientX; mouse.y = e.clientY; });
  window.addEventListener('mouseleave', ()=>{ mouse.x = -9999; mouse.y = -9999; });
  window.addEventListener('mousedown', ()=>{ mouse.down = true; });
  window.addEventListener('mouseup', ()=>{ mouse.down = false; });

  /* Click handler: stars still twinkle if clicked */
  canvas.addEventListener('click', (e)=>{
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left);
    const my = (e.clientY - rect.top);
    let nearest = null, nd = Infinity;
    for(const o of BGobjects){
      const dx = o.x !== undefined ? o.x - mx : 0;
      const dy = o.y !== undefined ? o.y - my : 0;
      const d2 = dx*dx + dy*dy;
      if(d2 < nd){ nd = d2; nearest = o; }
    }
    if(nearest && nd < 2500){
      if(nearest instanceof Star){ nearest.twinkleNow(); if(window.gsap) gsap.to(nearest, {alpha:1.6, duration:0.12, yoyo:true, repeat:1}); }
    }
  });

  /* disturb leaves when mouse moves near */
  function disturbLeaves(){
    if(theme !== 'land') return;
    for(const leaf of BGobjects){
      if(leaf instanceof Leaf) leaf.disturb(mouse.x, mouse.y, 1.2);
    }
  }

  /* render loop */
  function renderLoop(now){
    if(!now) now = performance.now();
    const dt = now - lastTime; lastTime = now;
    ctx.clearRect(0,0,W,H);

    if(currentMode === 'dark'){ ctx.fillStyle = 'rgba(6,10,12,0.18)'; ctx.fillRect(0,0,W,H); }
    else { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(0,0,W,H); }

    // update
    for(const o of BGobjects) o.update(dt);

    // jellies react to mouse
    if(theme === 'water'){
      for(const o of BGobjects){ if(o instanceof Jellyfish) o.reactToMouse(mouse.x, mouse.y); }
    }

    // draw
    for(const o of BGobjects) o.draw();

    // interactions
    disturbLeaves();

    raf = requestAnimationFrame(renderLoop);
  }

  /* BG controller:
     - setTheme(th): only rebuilds when theme changes (keeps positions on mode toggles)
     - setMode(md): updates mode and existing objects' visuals where possible WITHOUT rebuilding positions
  */
  const BG = {
    setTheme: (th) => {
      const prev = theme;
      theme = th;
      // rebuild only if theme actually changed (keeps existing positions when toggling mode)
      if(prev !== th) {
        buildPools();
      }
      // adjust parallax opacities regardless
      if(theme === 'space'){ layerBack.style.opacity=1; layerMid.style.opacity=0.9; layerFront.style.opacity=0.7; }
      else if(theme === 'water'){ layerBack.style.opacity=0.98; layerMid.style.opacity=0.9; layerFront.style.opacity=0.6; }
      else { layerBack.style.opacity=1; layerMid.style.opacity=0.95; layerFront.style.opacity=0.7; }
    },
    setMode: (md) => {
      mode = md;
      // update colors on existing objects without rebuilding positions
      for(const o of BGobjects){
        if(o instanceof Leaf){
          // recolor leaves in-place (keeps position & other state)
          o.setColorByMode();
        }
        // jellyfish color is not mode-dependent here but could be updated similarly
      }
      // no pool rebuild here -> positions unchanged
    }
  };

  /* Resize handling */
  function onResize(){
    setCanvasSize();
    buildPools();
  }
  window.addEventListener('resize', ()=>{ setTimeout(onResize, 120); });

  /* Start BG rendering */
  setCanvasSize();
  buildPools();
  lastTime = performance.now();
  raf = requestAnimationFrame(renderLoop);

  /* ===========================
     Parallax movement (mouse + scroll)
     - Important: for the "space" theme we avoid mouse hover-driven X movement
       so the big wallpaper blobs stay visually fixed horizontally.
     - Scroll-based vertical offset still applies for depth.
     =========================== */
  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', (e)=>{ mouseX = (e.clientX / window.innerWidth - 0.5); mouseY = (e.clientY / window.innerHeight - 0.5); });

  window.addEventListener('scroll', ()=>{ requestAnimationFrame(()=>{ 
    const s = window.scrollY / (document.body.scrollHeight - window.innerHeight);
    const backY = -s * 30;

    // If theme is 'space', we remove the mouseX driven horizontal parallax (no hover movement)
    const xBack = (theme === 'space') ? 0 : mouseX * 6;
    const xMid  = (theme === 'space') ? 0 : mouseX * 12;
    const xFront= (theme === 'space') ? 0 : mouseX * 22;

    layerBack.style.transform = `translate3d(${xBack}px, ${backY + mouseY * 10}px, 0) scale(1.02)`;
    layerMid.style.transform  = `translate3d(${xMid}px, ${backY*1.5 + mouseY * 18}px, 0) scale(1.01)`;
    layerFront.style.transform = `translate3d(${xFront}px, ${backY*2 + mouseY * 28}px, 0) scale(1)`;
  });});

  /* run parallax smoother with GSAP ticker — skip mouse-driven moves for space theme */
  if(window.gsap && !prefersReduced){
    gsap.ticker.add(()=> {
      if(theme === 'space'){
        // For space theme, keep static horizontal positions (no hover movement).
        gsap.to(layerBack,  {duration:0.8, x: 0, y: mouseY*12, ease:'power3.out'});
        gsap.to(layerMid,   {duration:0.9, x: 0, y: mouseY*25, ease:'power3.out'});
        gsap.to(layerFront, {duration:1.0, x: 0, y: mouseY*36, ease:'power3.out'});
      } else {
        gsap.to(layerBack,  {duration:0.8, x: mouseX*10, y: mouseY*12, ease:'power3.out'});
        gsap.to(layerMid,   {duration:0.9, x: mouseX*20, y: mouseY*25, ease:'power3.out'});
        gsap.to(layerFront, {duration:1.0, x: mouseX*30, y: mouseY*36, ease:'power3.out'});
      }
    });
  }

  /* ===========================
     Cursor effects (trail / ripple / dust)
     - updated to use 'space' in conditionals
     =========================== */
  let cursorParticles = [];
  function cursorResize(){
    cursorCanvas.width = Math.round(window.innerWidth * DPR);
    cursorCanvas.height = Math.round(window.innerHeight * DPR);
    cursorCanvas.style.width = window.innerWidth + 'px';
    cursorCanvas.style.height = window.innerHeight + 'px';
    cursorCtx.setTransform(DPR,0,0,DPR,0,0);
  }
  cursorResize();
  window.addEventListener('resize', cursorResize);

  window.addEventListener('mousemove', (e)=>{
    if(prefersReduced) return;
    const p = { x: e.clientX, y: e.clientY, life: 120, vx: (Math.random()-0.5)*1.2, vy:(Math.random()-0.5)*1.2 };
    cursorParticles.push(p);
  });

  /* cursor draw loop */
  function drawCursor(){
    cursorCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
    for(let i = cursorParticles.length-1; i>=0; i--){
      const p = cursorParticles[i];
      p.life -= 2;
      p.x += p.vx; p.y += p.vy;
      if(currentTheme === 'space'){
        const alpha = p.life/120;
        cursorCtx.fillStyle = `rgba(160,200,255,${alpha})`;
        cursorCtx.beginPath(); cursorCtx.arc(p.x, p.y, 2 + (1-alpha)*2, 0, Math.PI*2); cursorCtx.fill();
      } else if(currentTheme === 'water'){
        const alpha = p.life/120;
        cursorCtx.fillStyle = `rgba(180,240,255,${alpha*0.6})`;
        cursorCtx.beginPath(); cursorCtx.arc(p.x, p.y, 2 + (1-alpha)*1.8, 0, Math.PI*2); cursorCtx.fill();
      } else {
        const alpha = p.life/120;
        cursorCtx.fillStyle = `rgba(150,240,140,${alpha})`;
        cursorCtx.beginPath(); cursorCtx.arc(p.x, p.y, 1 + (1-alpha)*2, 0, Math.PI*2); cursorCtx.fill();
      }
      if(p.life <= 0) cursorParticles.splice(i,1);
    }
    requestAnimationFrame(drawCursor);
  }
  requestAnimationFrame(drawCursor);

  /* ========================
     Initial apply (ensures BG setTheme/setMode usage)
     ======================== */
  applyThemeMode();
});
 