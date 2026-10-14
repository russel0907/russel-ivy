/* =========================================================
   Russel & Ivy — Pertunangan · Burgundy · Cream · Matcha
   Lightweight CSS scene changes + CSS-Scroll-Tunnel.
   ========================================================= */

/* ---- später eintragen ---- */
const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbyNxRgT1vJ87enQDoDZbpwGTvOgtcM0CraGphFwF3q7iaZWG2VBRP2-x190aKeEIw/exec";
const PHOTO_FORM_URL = "";          // Google-Formular für Foto-Upload
const WEDDING_DATE   = new Date("2026-12-12T14:00:00");

// #hd / #reset → eine frühere „zu zäh"-Messung für den Ring vergessen.
try{ if(/reset|neu|test|voll|fullhd|(^|#)hd/i.test(location.hash)) localStorage.removeItem("cw_gpu_weak"); }catch(e){}

/* Entdecker-Zähler „X/8": Scroll-Stationen zählen beim Ansehen,
   die 2 Unterseiten (unterkunft, fotos) zählen beim BESUCHEN (markiert sub.js
   in denselben localStorage-Key). So sind 8/8 = ganze Reise + beide Unterseiten. */
const TASKS = ["start","cincin","programme","location","attire","food","rsvp"];
const VIEW_TASKS = new Set(TASKS);
const STORE_KEY = "cw_progress_v2";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Fortschritt speichern ---------- */
function loadDone(){ try{ return new Set(JSON.parse(localStorage.getItem(STORE_KEY)||"[]")); }catch{ return new Set(); } }
function saveDone(set){ try{ localStorage.setItem(STORE_KEY, JSON.stringify([...set])); }catch{} }
let done = loadDone();

function markDone(task){
  if(!task || done.has(task)) return;
  done.add(task); saveDone(done); updateProgress();
  const card = document.querySelector(`[data-task="${task}"] .card`);
  if(card) card.classList.add("done");
}
function updateProgress(){
  const n = TASKS.filter(t=>done.has(t)).length;
  const fill = document.getElementById("progressFill");
  const count = document.getElementById("progressCount");
  if(fill) fill.style.width = (n/TASKS.length*100)+"%";
  if(count) count.textContent = `${n}/${TASKS.length} ditemui`;
  const goal = document.getElementById("goalCard");
  if(goal && n>=TASKS.length) goal.classList.add("complete");
}

/* ---------- Countdown ---------- */
function renderCountdown(){
  const el = document.getElementById("countdown"); if(!el) return;
  const unit=(n,l)=>`<div class="unit"><div class="num">${n}</div><div class="lbl">${l}</div></div>`;
  (function tick(){
    let d=Math.max(0,WEDDING_DATE-new Date());
    const dd=Math.floor(d/864e5); d-=dd*864e5;
    const hh=Math.floor(d/36e5);  d-=hh*36e5;
    const mm=Math.floor(d/6e4);   d-=mm*6e4;
    const ss=Math.floor(d/1e3);
    el.innerHTML=unit(dd,"hari")+unit(hh,"jam")+unit(mm,"minit")+unit(ss,"saat");
    setTimeout(tick,1000);
  })();
}

/* ---------- Hintergrund: ECHTES Scroll-Video ----------
   scrolly-video wählt pro Gerät die beste Technik:
   • Handy/Safari → currentTime-Scrubbing (leicht, mit All-Keyframe-Video butterweich)
   • Desktop      → currentTime ebenfalls (kein WebCodecs → kein RAM-Risiko bei 605 Frames)
   Wir treiben sie selbst per Scroll-Prozent; Ring-Licht liest dasselbe Prozent.    */
function setupStageLegacy(){
  const stage=document.getElementById("stage"); if(!stage) return;
  const box=document.createElement("div");
  box.className="bg-video";
  stage.prepend(box);
  document.documentElement.classList.add("has-video");

  /* Fallback: nur ohne Library oder bei reduzierter Bewegung → simples Loop-Video.
     (Alle echten Browser inkl. iOS Chrome scrubben über die ScrollyVideo-Schiene.) */
  if(reduce || typeof ScrollyVideo==="undefined"){
    const v=document.createElement("video");
    v.src=bgSrc(); v.muted=true; v.defaultMuted=true; v.loop=!reduce; v.playsInline=true; v.preload="auto";
    v.setAttribute("muted",""); v.setAttribute("playsinline",""); v.setAttribute("webkit-playsinline","");
    v.style.cssText="position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
    box.appendChild(v);
    v.addEventListener("canplay",()=>{ window.__videoReady=true; }, {once:true});
    v.addEventListener("error", ()=>{ window.__videoReady=true; }, {once:true});
    if(!reduce){
      const tryPlay=()=>{ v.play().catch(()=>{}); };
      v.autoplay=true; tryPlay();
      ["touchstart","pointerdown","click"].forEach(ev=> addEventListener(ev, tryPlay, {passive:true}));
      window.__unlockBgVideo = tryPlay;   // Passwort-Submit stößt es auch an
    }
    return;
  }

  const isTouch = matchMedia("(pointer:coarse)").matches || innerWidth<820;

  /* Streaming + FRÜH öffnen: das Siegel geht auf, sobald das Video abspielbar ist (canplay),
     nicht erst nach dem kompletten Download. Der Browser puffert weiter im Hintergrund und holt
     beim Scrubben gezielt die gebrauchten Stellen per Range-Request nach (R2 kann Ranges). */
  window.__videoDL = 0;
  const streamUrl = bgSrc();

  function startScrolly(SRC){
  let sv;
  try{
    sv=new ScrollyVideo({
      scrollyVideoContainer: box,
      src: SRC,
      useWebCodecs: false,      // currentTime überall → leicht für den Hauptthread
      trackScroll: false,       // wir treiben selbst (unser Layout ist fix)
      lockScroll: false,        // NIEMALS das Seiten-Scrollen sperren
      sticky: false, full: false, cover: true,
      transitionSpeed: isTouch ? 6 : 10,
      frameThreshold: 0.05,
      onReady: ()=>{ window.__videoReady=true; }
    });
  }catch(e){ console.warn("ScrollyVideo init fehlgeschlagen:", e); window.__videoReady=true; return; }
  window.__scrollyVideo = sv;
  setTimeout(()=>{ window.__videoReady=true; }, 6000);   // Sicherheitsnetz, falls onReady ausbleibt
  // Früh-öffnen: sobald das Video abspielbar ist → „ready". Gepufferte Menge füttert den Ladebalken.
  try{
    const _v=sv.video;
    if(_v){
      _v.preload="auto";
      ["loadeddata","canplay","canplaythrough"].forEach(ev=> _v.addEventListener(ev, ()=>{ window.__videoReady=true; }));
      _v.addEventListener("progress", ()=>{
        try{ if(_v.buffered && _v.buffered.length && _v.duration){ window.__videoDL = Math.min(1, _v.buffered.end(_v.buffered.length-1)/_v.duration); } }catch(e){}
      });
    }
  }catch(e){}

  /* Scroll → Video-Prozent, ANKER-basiert (rAF-gedrosselt, passiv)
     9 Sektionen = 9 Frames (0..8) = 8 Übergänge. Jede Station wird auf IHREN Frame
     verankert; zwischen zwei Stationen scrubbt das Video genau den Übergang dazwischen.
     So rastet jede Station auf ihrem Standbild ein und das Timing stimmt, obwohl die
     Clips unterschiedlich lang sind (4 s / 5 s). */
  // Frame-Grenzen im Video (kumulierte Frames / 872 gesamt). Clips: 121,121,97,97,97,97,121,121
  const FRAME_PCT = (HAS_LANDSCAPE && isWide()) ? FRAME_PCT_LANDSCAPE : FRAME_PCT_PORTRAIT;
  // Sektionen in Frame-Reihenfolge 0..8 (ziel = letztes Bild, Frame 8)
  const STATION_SEL = ['[data-station="0"]','[data-station="1"]','[data-station="2"]',
    '[data-station="3"]','[data-station="4"]','[data-station="5"]','[data-station="6"]',
    '[data-station="7"]','[data-station="ziel"]'];
  let anchors=[];   // [{pos, pct}] = Scrollposition (Station zentriert) → Video-Prozent
  function buildAnchors(){
    const sy=scrollY||0;
    anchors=[];
    STATION_SEL.forEach((sel,i)=>{
      const el=document.querySelector(sel); if(!el) return;
      const r=el.getBoundingClientRect();
      anchors.push({ pos: sy + r.top + r.height/2 - innerHeight/2, pct: FRAME_PCT[i] });
    });
    anchors.sort((a,b)=>a.pos-b.pos);
  }
  let queued=false, lastVP=-1;
  function update(){
    queued=false;
    if(!anchors.length) buildAnchors();
    if(!anchors.length) return;
    const sp=scrollY||0;
    let vp;
    if(sp<=anchors[0].pos) vp=anchors[0].pct;                       // vor Station 0 → Frame 0
    else if(sp>=anchors[anchors.length-1].pos) vp=anchors[anchors.length-1].pct;  // ab Ziel → Frame 8
    else for(let i=0;i<anchors.length-1;i++){                       // dazwischen → interpolieren
      const a=anchors[i], b=anchors[i+1];
      if(sp>=a.pos && sp<=b.pos){ const t=(sp-a.pos)/Math.max(1,b.pos-a.pos); vp=a.pct+t*(b.pct-a.pct); break; }
    }
    if(vp==null) vp = lastVP<0?0:lastVP;
    window.__scrollProg = vp;                       // ring3d liest das fürs Licht
    if(Math.abs(vp-lastVP) < 0.0008) return;
    const goingBack = vp < lastVP;
    lastVP=vp;
    // Handy: direkt exakt auf den Ziel-Frame springen (vor & zurück). Die native Seek-Pipeline
    // des Browsers fasst schnelle currentTime-Sprünge selbst sauber zusammen — eigenes Drosseln
    // (Warten auf 'seeked') hat es nur langsamer & ruckeliger gemacht. Desktop: weiches Gleiten.
    try{ sv.setVideoPercentage(vp, (isTouch || goingBack) ? {jump:true} : {}); }catch(e){}
  }
  // Beim Tippen den Hintergrund einfrieren: Tastatur (Höhenänderung) UND Auto-Scrollen
  // ins Eingabefeld sollen das Video nicht verspringen lassen.
  let typing=false, lastW=innerWidth, bgWide=isWide(), switchT;
  function onScroll(){ if(typing) return; if(!queued){ queued=true; requestAnimationFrame(update); } }
  function onResize(){
    if(innerWidth===lastW) return;     // nur echte Breitenänderung (Drehen/Desktop) – Tastatur ändert nur die Höhe
    lastW=innerWidth; buildAnchors(); if(!typing) onScroll();
    if(HAS_LANDSCAPE && isWide()!==bgWide){   // Hoch-/Querformat gewechselt → passendes Video laden
      clearTimeout(switchT);
      switchT=setTimeout(()=>{ if(isWide()!==bgWide) location.reload(); }, 400);
    }
  }
  addEventListener("scroll", onScroll, {passive:true});
  addEventListener("resize", onResize, {passive:true});
  addEventListener("focusin", e=>{ if(e.target&&e.target.matches&&e.target.matches("input,textarea,select")) typing=true; }, true);
  addEventListener("focusout", e=>{ if(e.target&&e.target.matches&&e.target.matches("input,textarea,select")){ typing=false; lastW=innerWidth; setTimeout(()=>{ buildAnchors(); update(); }, 120); } }, true);
  buildAnchors(); update();
  // Anker IMMER neu ziehen, wenn sich die Dokumenthöhe ändert. Bilder/Fonts (und das Öffnen
  // des Tors) lassen Sektionen wachsen → sonst sitzt die LETZTE Station viel zu weit oben und
  // das Video ist schon am Ende, bevor man unten bei „Zusage" ankommt. (Das war der Timing-Bug:
  // weil das Video jetzt erst nach dem Download startet, ist das alte load-Event längst vorbei.)
  let lastDocH=0;
  function reanchor(){
    const h=document.documentElement.scrollHeight;
    if(h===lastDocH) return;        // nur bei echter Höhenänderung neu rechnen
    lastDocH=h; buildAnchors(); update();
  }
  reanchor();
  if(document.readyState!=="complete") addEventListener("load", reanchor);
  if("ResizeObserver" in window){ try{ new ResizeObserver(reanchor).observe(document.body); }catch(e){} }
  // Tor öffnet sich → echte Seite aktiv → Anker frisch ziehen und beim Nachsetzen dranbleiben
  addEventListener("cw-reveal", ()=>{ buildAnchors(); update(); [120,400,900,1700].forEach(ms=>setTimeout(reanchor, ms)); });
  [600,1500,3000].forEach(ms=>setTimeout(reanchor, ms));

  /* ---- iOS-Entsperrung ----
     iOS Safari malt per-currentTime gescrubbte Frames erst ins Canvas, NACHDEM das
     Video einmal per Nutzer-Geste play→pause „entsperrt" wurde. Sonst bleibt's schwarz.
     Darum bei der ersten Berührung/Klick einmal play/pause + Frame neu malen. */
  const iv = sv.video;
  if(iv){
    iv.muted=true; iv.defaultMuted=true; iv.playsInline=true;
    iv.setAttribute("muted",""); iv.setAttribute("playsinline",""); iv.setAttribute("webkit-playsinline","");
  }
  let unlocked=false;
  function unlockVideo(){
    if(unlocked) return;
    const v=sv.video; if(!v) return;
    try{
      const p=v.play();
      const done=()=>{ try{ v.pause(); }catch(e){} unlocked=true; lastVP=-1; update(); };
      if(p && p.then) p.then(done).catch(()=>{ /* erneut bei nächster Geste */ });
      else done();
    }catch(e){}
  }
  ["touchstart","pointerdown","click"].forEach(ev=>
    addEventListener(ev, unlockVideo, {passive:true}));
  window.__unlockBgVideo = unlockVideo;   // Gate-Submit kann es auch auslösen
  }   // ── Ende startScrolly ──

  // Direkt streamen (kein Warten auf kompletten Download) → Seite öffnet früh.
  startScrolly(streamUrl);
}

/* ---------- Background: CSS design per section ----------
   The current station fades in its own background. The interpolated scroll
   percentage remains available to the 3D ring for its motion and lighting. */
function setupStage(){
  const stage=document.getElementById("stage"); if(!stage) return;
  const selectors=['[data-station="0"]','[data-station="1"]','[data-station="2"]',
    '[data-station="3"]','[data-station="5"]','[data-station="6"]',
    '[data-station="7"]','[data-station="ziel"]'];
  let anchors=[];
  function buildAnchors(){
    const sy=scrollY||0;
    anchors=selectors.map((selector,index)=>{
      const el=document.querySelector(selector); if(!el) return null;
      const rect=el.getBoundingClientRect();
      return {pos:sy+rect.top+rect.height/2-innerHeight/2,pct:index/(selectors.length-1)};
    }).filter(Boolean);
  }
  let queued=false, lastVP=-1, activeScene=-1;
  function update(){
    queued=false;
    if(!anchors.length) buildAnchors();
    if(!anchors.length) return;
    const scroll=scrollY||0;
    let pct;
    if(scroll<=anchors[0].pos) pct=anchors[0].pct;
    else if(scroll>=anchors[anchors.length-1].pos) pct=anchors[anchors.length-1].pct;
    else for(let i=0;i<anchors.length-1;i++){
      const a=anchors[i], b=anchors[i+1];
      if(scroll>=a.pos && scroll<=b.pos){ pct=a.pct+(scroll-a.pos)/Math.max(1,b.pos-a.pos)*(b.pct-a.pct); break; }
    }
    if(pct==null) pct=lastVP<0?0:lastVP;
    window.__scrollProg=pct;
    const nextScene=Math.max(0,Math.min(anchors.length-1,Math.round(pct*(anchors.length-1))));
    if(nextScene!==activeScene){ activeScene=nextScene; stage.dataset.scene=String(nextScene); }
    lastVP=pct;
  }
  function onScroll(){ if(!queued){ queued=true; requestAnimationFrame(update); } }
  let lastWidth=innerWidth;
  function onResize(){ if(innerWidth!==lastWidth){ lastWidth=innerWidth; buildAnchors(); onScroll(); } }
  addEventListener("scroll",onScroll,{passive:true});
  addEventListener("resize",onResize,{passive:true});
  buildAnchors(); update();
  let lastHeight=0;
  function reanchor(){
    const height=document.documentElement.scrollHeight;
    if(height===lastHeight) return;
    lastHeight=height; buildAnchors(); update();
  }
  if(document.readyState!=="complete") addEventListener("load",reanchor);
  if("ResizeObserver" in window){ try{ new ResizeObserver(reanchor).observe(document.body); }catch(e){} }
  addEventListener("cw-reveal",()=>{ buildAnchors(); update(); [120,400,900].forEach(ms=>setTimeout(reanchor,ms)); });
  window.__stageReady=true;
}

/* ---------- Ladescreen: Ring dreht auf Weiß, % zählt hoch, dann Reveal ---------- */
function initLoader(){
  const loader=document.getElementById("loader"); if(!loader){ window.dispatchEvent(new Event("cw-reveal")); return; }
  if(/noload/.test(location.hash)){ document.documentElement.classList.remove("loading"); loader.style.display="none"; window.dispatchEvent(new Event("cw-reveal")); return; }
  // Test-/Reset-Link: cressina-wanja.de/#reset → gespeichertes Passwort vergessen, Tor wieder zeigen
  if(/reset|neu|test/i.test(location.hash)){
    try{ localStorage.removeItem("cw_gate_ok_v1"); sessionStorage.removeItem("cw_loader_seen"); }catch(e){}
  }
  // Tor schon in dieser Sitzung gesehen + freigeschaltet? (z.B. zurück von einer Unterseite)
  // Ring lies in the cache → skip the envelope when returning in this session.
  try{
    if(false){ // Every visit waits for the user to open the invitation.
      document.documentElement.classList.remove("loading"); loader.style.display="none";
      window.dispatchEvent(new Event("cw-reveal")); return;
    }
  }catch(e){}
  const ringEl=document.querySelector(".seal-ring");   // setzt --thread, beide Ellipsen erben es
  const pctEl=document.getElementById("loaderPct");
  const started=Date.now(); let revealed=false, readyToOpen=false;

  // ---- Passwort-Gate direkt im Siegel ----
  // PORTFOLIO-DEMO: Tor automatisch entsperrt — die Umschlag-Öffnungs-Animation
  // bleibt erhalten, aber es wird kein Passwort abgefragt (kein privates Gate).
  const GATE_KEY="cw_gate_ok_v1", GATE_PASS="demo";
  let authed=true;           // Demo: immer freigeschaltet (kein Passwort-Eingabefeld)
  let passwordOK = true;     // Demo: Türen öffnen automatisch, sobald die Bühne bereit ist
  const seal=document.querySelector(".inv-seal");
  const passInp=document.getElementById("sealPass");
  const gateForm=document.getElementById("sealGate");
  const gateErr=document.getElementById("sealErr");
  const openBtn=document.getElementById("sealOpen");
  // Passwort-Modus: nur den „Öffnen"-Button zeigen; das Datum bleibt immer sichtbar
  function showGateUI(locked){
    if(openBtn) openBtn.hidden=!locked;
  }
  if(seal){
    seal.setAttribute("role","button");
    seal.setAttribute("tabindex","0");
    seal.setAttribute("aria-label","Buka jemputan");
    seal.setAttribute("aria-disabled","true");
    seal.addEventListener("keydown",ev=>{
      if(ev.key==="Enter" || ev.key===" "){ ev.preventDefault(); if(readyToOpen) reveal(); }
    });
    seal.classList.add(authed ? "authed" : "locked");   // C&W vs. Passwort-Eingabe
    if(!authed) setTimeout(()=>{ try{ passInp.focus(); }catch(e){} }, 250);
  }
  showGateUI(!authed);

  function setProgress(p){
    if(ringEl) ringEl.style.setProperty("--thread", (100-p));   // Glow dreht sich um den Siegelrand
    if(pctEl) pctEl.textContent = Math.round(p)+"%";
  }
  function barReady(){
    const elapsed=Date.now()-started;
    // The background is ready without loading any 3D assets.
    return window.__stageReady || elapsed>15000;
  }
  function playInvitationMusic(){
    const music=document.getElementById("invitationMusic");
    if(music) music.play().catch(()=>{}); // Retry from the seal click if autoplay is blocked.
  }
  function reveal(){
    if(revealed) return; revealed=true;
    playInvitationMusic();
    try{ sessionStorage.setItem("cw_loader_seen","1"); }catch(e){}   // beim nächsten Zurück nicht wieder zeigen
    setProgress(100);                                  // Rand glüht ganz herum, bevor die Türen aufgehen
    loader.classList.add("opening");                   // Türen klappen nach links & rechts auf
    document.documentElement.classList.remove("loading");
    window.dispatchEvent(new Event("cw-reveal"));       // Ring → Scroll-Modus (hinter den Türen = die Seite)
    setTimeout(()=>{ loader.classList.add("done"); }, 1050);   // nach dem Öffnen fadet der Rest weg
    setTimeout(()=>{ loader.style.display="none"; }, 1750);
  }

  // Eine Stelle fürs Freischalten — egal ob Enter, „Öffnen"-Button oder Klick aufs Siegel
  function tryUnlock(){
    const v=(passInp.value||"").trim().toLowerCase();
    if(v===GATE_PASS){
      passwordOK=true;
      try{ localStorage.setItem(GATE_KEY,"1"); }catch(e){}
      if(seal){ seal.classList.remove("locked"); seal.classList.add("authed"); }  // C&W erscheint kurz
      showGateUI(false);                               // Button/Hinweis weg, Datum erscheint
      if(barReady()) reveal();                         // schon geladen → sofort öffnen, sonst macht's tick()
    } else {
      if(gateErr) gateErr.textContent="tidak betul";
      if(seal){ seal.classList.remove("shake"); void seal.offsetWidth; seal.classList.add("shake"); }
      passInp.value=""; try{ passInp.focus(); }catch(e){}
    }
  }
  if(gateForm) gateForm.addEventListener("submit", function(ev){ ev.preventDefault(); tryUnlock(); });
  if(openBtn)  openBtn.addEventListener("click", tryUnlock);
  // Klick aufs Siegel öffnet ebenfalls — außer man tippt gerade ins Eingabefeld
  if(seal) seal.addEventListener("click", function(ev){
    if(readyToOpen){ reveal(); return; }
    if(!seal.classList.contains("locked")) return;
    if(ev.target===passInp || (ev.target.closest && ev.target.closest(".seal-pass"))) return;
    tryUnlock();
  });

  (function tick(){
    const elapsed=Date.now()-started;
    // Count up for three seconds, then wait for the user's seal click.
    const shown = Math.min(elapsed/3000*100, 99);
    setProgress(shown);
    if(elapsed>=3000 && barReady() && passwordOK){
      setProgress(100);
      readyToOpen=true;
      playInvitationMusic();
      loader.classList.add("ready");
      if(seal){ seal.setAttribute("aria-disabled","false"); seal.style.cursor="pointer"; }
      return;
    }
    requestAnimationFrame(tick);
  })();
}

/* ---------- Stationen sichtbar machen + Ansehen abhaken ---------- */
function initStations(){
  const io=new IntersectionObserver(ents=>ents.forEach(e=>{
    if(!e.isIntersecting) return;
    e.target.classList.add("in");                // Fallback-Reveal (wenn keine CSS-Scroll-Animation)
    const task=e.target.dataset.task;
    if(task && VIEW_TASKS.has(task)) markDone(task);
    if(e.target.querySelector("#goalCard")) onGoal();
  }), {threshold:0.35});
  document.querySelectorAll(".station").forEach(s=>io.observe(s));
}

/* ---------- Formulare → Google Sheet ---------- */
function showStatus(el,kind,msg){ if(!el) return; el.className="form-status show "+kind; el.textContent=msg; }
function initForms(){
  document.querySelectorAll("form[data-sheet]").forEach(form=>{
    const status=form.querySelector(".form-status");
    form.addEventListener("submit", async e=>{
      e.preventDefault();
      const btn=form.querySelector("button[type=submit]");
      const data=Object.fromEntries(new FormData(form).entries());
      data._form=form.dataset.sheet; data._time=new Date().toISOString();
      showStatus(status,"ok","Sebentar…"); if(btn) btn.disabled=true;
      // Portfolio-Demo: keine Anbindung an private Backends (Airtable/Sheet entfernt)
      let toAirtable=false;
      if(false){
      }
      if(false){
      }
      try{
        if(!SHEET_ENDPOINT){ await new Promise(r=>setTimeout(r,450));
          showStatus(status,"ok",(form.dataset.success||"Tersimpan!")+(toAirtable?"":" (demo, belum disambungkan)"));
        }else{
          const response=await fetch(SHEET_ENDPOINT,{method:"POST",body:JSON.stringify(data),headers:{"Content-Type":"text/plain;charset=utf-8"}});
          if(!response.ok) throw new Error("RSVP request failed");
          const result=await response.json();
          if(result.ok!==true) throw new Error(result.error||"RSVP was not saved");
          showStatus(status,"ok",form.dataset.success||"Maklumat kehadiran anda telah disimpan. Terima kasih!");
        }
        markDone(form.closest("[data-task]")?.dataset.task);
        if(form.hasAttribute("data-final")) celebrate();
      }catch{ showStatus(status,"err","Itu tidak berjaya, sila cuba lagi."); }
      finally{ if(btn) btn.disabled=false; }
    });
  });
  document.querySelectorAll("[data-photo-form]").forEach(b=>{
    if(PHOTO_FORM_URL){ b.href=PHOTO_FORM_URL; b.target="_blank"; b.rel="noopener"; }
    else b.addEventListener("click",e=>{ e.preventDefault(); alert("Muat naik foto sedang disediakan, sebentar lagi! 📸"); });
  });
}

/* ---------- Fortschritts-Pille → zur nächsten offenen Station ---------- */
function initPill(){
  const pill=document.getElementById("progressPill"); if(!pill) return;
  pill.addEventListener("click",()=>{
    const next=TASKS.find(t=>!done.has(t));
    const target = next ? document.querySelector(`[data-task="${next}"]`)
                        : document.getElementById("goalCard")?.closest(".station");
    target?.scrollIntoView({behavior: reduce?"auto":"smooth", block:"center"});
  });
}

/* ---------- Ziel + Konfetti ---------- */
let goalFired=false;
function onGoal(){
  if(goalFired) return; goalFired=true;
  if(TASKS.filter(t=>done.has(t)).length>=TASKS.length) celebrate();
}
function celebrate(){
  if(reduce) return;
  const cv=document.getElementById("confetti"); if(!cv) return;
  cv.classList.add("go"); const ctx=cv.getContext("2d");
  const dpr=Math.min(devicePixelRatio,2); cv.width=innerWidth*dpr; cv.height=innerHeight*dpr; ctx.scale(dpr,dpr);
  const cols=["#7a1f3d","#a3bf7d","#f5efe3","#8a9a5f","#b0574a","#c65a3c"];
  const P=Array.from({length:160},(_,i)=>({
    x:innerWidth/2+(i%2?80:-80)*Math.random(), y:innerHeight*0.5,
    vx:(Math.random()-0.5)*9, vy:-(6+Math.random()*9),
    s:5+Math.random()*7, r:Math.random()*6, vr:(Math.random()-0.5)*0.5,
    c:cols[i%cols.length]
  }));
  let t=0;
  (function loop(){
    t++; ctx.clearRect(0,0,innerWidth,innerHeight);
    P.forEach(p=>{ p.vy+=0.22; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.fillStyle=p.c;
      ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s*0.6); ctx.restore(); });
    if(t<240) requestAnimationFrame(loop); else cv.classList.remove("go");
  })();
}

/* ---------- Dev-Hook: #p=0.4 springt zu Scroll-Position ---------- */
function applyHash(){
  const m=/p=([0-9.]+)/.exec(location.hash); if(!m) return;
  const p=Math.max(0,Math.min(1,parseFloat(m[1])));
  scrollTo(0, p*(document.documentElement.scrollHeight-innerHeight));
}

/* ---------- Start ---------- */
document.documentElement.classList.add("js");
document.documentElement.classList.add("loading");   // Ladescreen aktiv
/* CSS Scroll-Driven Animations unterstützt? → Tunnel läuft komplett auf dem Compositor */
if(window.CSS && CSS.supports && CSS.supports("animation-timeline: view()")) document.documentElement.classList.add("svd");

document.addEventListener("DOMContentLoaded", ()=>{
  done.forEach(t=>{ const c=document.querySelector(`[data-task="${t}"] .card`); if(c) c.classList.add("done"); });
  setupStage(); initLoader();
  renderCountdown(); initStations(); initForms(); initPill(); updateProgress();
  setTimeout(applyHash, 60);
  addEventListener("hashchange", applyHash);
});
