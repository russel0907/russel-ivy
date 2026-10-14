/* =========================================================
   Russel & Ivy — cincin 3D (Three.js, klasik/global)
   • Licht aus vorberechneten Szenen-Daten (window.SCENE_DATA) → Kontrast + Szenenfarbe + Disco
   • rendert auch in den Ladescreen (mittig drehend), danach scroll-gekoppelt
   • Perf: DPR gekappt, ~30 fps am Handy, KEIN getImageData
   ========================================================= */
(function(){
  function clamp01(v){ return v<0?0:v>1?1:v; }
  if (typeof THREE === "undefined" || !THREE.GLTFLoader){
    console.warn("Three.js nicht geladen — Ring übersprungen.");
    window.__ringReady = true; return;
  }
  var isMobile = matchMedia("(pointer:coarse)").matches || innerWidth < 820;
  var UA = navigator.userAgent || "";
  // iOS meldet keine deviceMemory → früher fälschlich als „schwach" eingestuft → Ring sah mies aus. Fix:
  var isIOS = /iPhone|iPad|iPod/.test(UA) || (/Macintosh/.test(UA) && (navigator.maxTouchPoints||0) > 1);
  var hash  = (location.hash||"").toLowerCase();
  var forceLite = /\blite\b|spar/.test(hash);
  var forceFull = /voll|fullhd|(^|#)hd|reset|neu|test/.test(hash);   // #hd / #reset → Messung vergessen, Ring zurück
  if(forceFull){ try{ localStorage.removeItem("cw_gpu_weak"); }catch(e){} }
  var prevWeak = false; try{ prevWeak = !forceFull && localStorage.getItem("cw_gpu_weak")==="1"; }catch(e){}
  var mem = navigator.deviceMemory, cores = navigator.hardwareConcurrency || 8;
  // Ring komplett weg, wenn: vorher gemessen zäh (prevWeak, gilt auch fürs alte iPhone), per #lite
  // erzwungen, ODER (nur Nicht-iOS) wirklich belegt wenig RAM/Kerne. Spec-Raten bleibt für iOS aus.
  var lowGfx = isMobile && ( prevWeak || forceLite || (!isIOS && ((mem && mem<=3) || cores<=4)) );
  // Auf schwachen Geräten Ring KOMPLETT weg → die ganze GPU bleibt fürs Video (vom Nutzer so gewünscht).
  if(lowGfx){
    document.documentElement.classList.add("has3d");   // CSS-Platzhalter-Ring ausblenden, kein WebGL
    window.__ringReady = true;
    return;
  }

  // Schärfe: iPhone & starke Geräte hoch auflösen (1.3 sah grob aus), Desktop 1.6, sonst 1.5.
  var dprCap = isIOS ? 2.0 : (isMobile ? 1.5 : 1.6);
  var renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:"high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, dprCap));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = "ring3d";
  document.body.appendChild(renderer.domElement);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(34, innerWidth/innerHeight, 0.1, 100);
  camera.position.set(0, 0, 13);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;

  var fill = new THREE.DirectionalLight(0xffe9c8, 0.4);  fill.position.set(0, 2, 9);  scene.add(fill);
  var sun  = new THREE.DirectionalLight(0xffd9a0, 5.0);  sun.position.set(0, 5, -9);  scene.add(sun);   // Gegenlicht (= Sonne)
  var amb  = new THREE.AmbientLight(0xffffff, 0.14); scene.add(amb);
  var disco1 = new THREE.PointLight(0x7a1f3d, 0, 60); disco1.position.set(5, 3, 4);  scene.add(disco1);  // festive (burgundy)
  var disco2 = new THREE.PointLight(0xa3bf7d, 0, 60); disco2.position.set(-5,-2, 3);  scene.add(disco2);  // (matcha)
  var disco3 = new THREE.PointLight(0xffe0c0, 0, 60); disco3.position.set(0, 0, 5);   scene.add(disco3);  // (cream)

  var group = new THREE.Group(); scene.add(group);
  var loaded = false;
  var ringMats = [];   // Material-Referenzen (nur für Opacity beim Wegfliegen)

  // ----- Beleuchtung je Station (Wanjas Vorgabe), dazwischen wandert die Sonne auf einem Pfad -----
  function lerp(a,b,u){ return a+(b-a)*u; }
  var sunColA = new THREE.Color(), sunColB = new THREE.Color();
  var LVP = [0,121,242,339,436,533,630,751,872].map(function(f){ return f/872; });  // vp je Station
  // je Station: [sonneX, sonneY, sonneZ(hinten=negativ), intensität, sonnenfarbe, discoAnteil, kerzenAnteil]
  var LK = [
    [ 6.0, 1.0, -7, 4.2, 0xffdca0, 0, 0],  // 0 Wiese    — Sonne mittig rechts
    [ 0.5, 6.0, -6, 3.4, 0xffd49a, 0, 0],  // 1 Fest     — Sonne oben (unten dunkel)
    [ 0.0, 2.5, -7, 2.4, 0xffd29a, 0, 0],  // 2 Zelt     — Sonne mittig, gedimmt
    [ 5.0, 5.5, -7, 3.6, 0xffd9a0, 0, 0],  // 3 Haus     — Sonne oberes Drittel rechts
    [ 0.0, 6.0, -7, 3.8, 0xffdca0, 0, 0],  // 4 Burg     — Sonne oberes Drittel mitte
    [-4.0, 5.0, -3, 0.5, 0xfff0e0, 1, 0],  // 5 DJ       — Disco oben + links
    [ 0.0, 1.0, -5, 1.8, 0xff9d50, 0, 1],  // 6 Torte    — viele kleine warme Kerzen/Lampen
    [ 0.0, 1.0, -5, 1.8, 0xff9d50, 0, 1],  // 7 Torbogen — viele kleine warme Kerzen/Lampen
    [ 6.0, 1.0, -7, 4.2, 0xffdca0, 0, 0],  // 8 Paar     — Licht mittig rechts
  ];

  function onLoaded(g){
    var ring = g.scene;
    ring.traverse(function(o){ if(o.isMesh){
      o.geometry.computeVertexNormals();
      // niedrige Rauheit = harte, helle Glanzlichter + dunkle Flächen = viel Kontrast
      // immer voll metallisch (keine Reflexions-/Metall-Änderung je Szene); env minimal = Front fast schwarz
      o.material = new THREE.MeshStandardMaterial({ color:0xdca23a, metalness:1.0, roughness:0.15, envMapIntensity:0.15, transparent:true });
      ringMats.push(o.material);
    }});
    var box = new THREE.Box3().setFromObject(ring);
    var sph = box.getBoundingSphere(new THREE.Sphere());
    ring.scale.setScalar(1.52 / sph.radius);   // 20% kleiner als vorher (1.9)
    box = new THREE.Box3().setFromObject(ring);
    ring.position.sub(box.getCenter(new THREE.Vector3()));
    group.add(ring);
    loaded = true;
    document.documentElement.classList.add("has3d");
    window.__ringReady = true;
    window.dispatchEvent(new Event("cw-asset"));
  }
  function onErr(e){ console.warn("Ring-Modell konnte nicht geladen werden:", e); window.__ringReady = true; window.dispatchEvent(new Event("cw-asset")); }

  var loader = new THREE.GLTFLoader();
  if (window.RING_GLB_B64){
    var raw = atob(window.RING_GLB_B64), arr = new Uint8Array(raw.length);
    for (var i=0;i<raw.length;i++) arr[i] = raw.charCodeAt(i);
    loader.parse(arr.buffer, "", onLoaded, onErr);
  } else { loader.load("models/ring.glb", onLoaded, undefined, onErr); }

  // Scroll-Fortschritt (Max gecacht → kein Layout pro Frame)
  var scrollMax = 1;
  function recalcMax(){ scrollMax = Math.max(1, document.documentElement.scrollHeight - innerHeight); }
  var lastW3 = innerWidth;
  addEventListener("resize", function(){
    if(innerWidth === lastW3) return;   // Handy-Tastatur ändert nur die Höhe → Ring nicht verschieben
    lastW3 = innerWidth;
    camera.aspect = innerWidth/innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); recalcMax();
  }, {passive:true});
  recalcMax(); addEventListener("load", recalcMax);

  // Ziehen zum Drehen — NUR am Desktop (am Handy stört's nur das Scrollen, Ring dreht eh automatisch)
  var userRotX=0, userRotY=0, dragging=false, lx=0, ly=0;
  if(!isMobile){
    var isUI=function(t){ return t && t.closest && t.closest("input,select,textarea,button,a,label,summary"); };
    addEventListener("pointerdown", function(e){ if(isUI(e.target)) return; dragging=true; lx=e.clientX; ly=e.clientY; document.documentElement.classList.add("grabbing"); }, {passive:true});
    addEventListener("pointermove", function(e){
      if(!dragging) return;
      var dx=e.clientX-lx, dy=e.clientY-ly;
      userRotY += dx*0.009; userRotX += dy*0.009; lx=e.clientX; ly=e.clientY;
    }, {passive:true});
    var endDrag=function(){ dragging=false; document.documentElement.classList.remove("grabbing"); };
    addEventListener("pointerup", endDrag, {passive:true}); addEventListener("pointercancel", endDrag, {passive:true});
  }

  // Szenen-Licht (vorberechnet, kein Pixel-Lesen) — indexiert per Scroll-Prozent (1:1 zum Video)
  var SD = window.SCENE_DATA || null;
  var sceneCol = new THREE.Color(1, 0.85, 0.6), sceneLum = 0.6;
  function readScene(){
    if(!SD || !SD.length) return;
    var p = (typeof window.__scrollProg === "number") ? window.__scrollProg : 0;
    var idx = Math.round(p * (SD.length-1));
    idx = Math.max(0, Math.min(SD.length-1, idx));
    var e = SD[idx]; if(!e) return;
    sceneLum = e[0];
    sceneCol.setRGB(e[1]/255, e[2]/255, e[3]/255);
  }

  var loading = true;
  addEventListener("cw-reveal", function(){ loading = false; });

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var t = 0, fcount = 0;
  var FSKIP = isMobile ? 2 : 1;                       // Handy ~30fps, Desktop voll
  // ---- Laufzeit-Messung ---- Specs lügen (P30 Pro meldet sich „stark", ruckelt aber). Darum messen
  // wir die echten FPS und schalten den Ring ab, wenn Ring+Video zusammen anhaltend zu zäh laufen.
  var ringOff=false, monitorOn=false, monStart=0, monFrames=0, slowStreak=0;
  addEventListener("cw-reveal", function(){ setTimeout(function(){ monitorOn=true; monStart=performance.now(); monFrames=0; }, 1800); });
  function killRing(){
    ringOff=true;
    try{ localStorage.setItem("cw_gpu_weak","1"); }catch(e){}   // nächstes Laden: gleich ohne Ring + leichtes Video
    try{ renderer.domElement.style.display="none"; }catch(e){}
    try{ renderer.dispose(); }catch(e){}
    document.documentElement.classList.add("has3d");
  }
  (function loop(){
    if(ringOff) return;
    requestAnimationFrame(loop);
    if(FSKIP>1){ fcount++; if(fcount % FSKIP !== 0) return; }
    t++;
    if(loaded){
      if(loading){
        group.position.set(0, 0, 0);
        group.rotation.y += reduce ? 0.004 : 0.03;    // im Loader schön mittig drehen
        group.rotation.x = 0.3; group.rotation.z = 0;
      } else {
        var prog = clamp01((scrollY||0)/scrollMax);
        var idle = reduce ? 0 : t*0.0016;
        group.rotation.y = prog*Math.PI*3 + idle + userRotY;
        group.rotation.x = prog*Math.PI*1.4 + Math.sin(t*0.008)*0.18 + 0.22 + userRotX;
        group.rotation.z = Math.sin(prog*Math.PI*2 + t*0.004)*0.3;
        // Finale: Ring bei „sagt ihr ja" erst sichtbar zur Mitte holen, dann sichtbar IM BILD
        // zum Paar (center-right) schrumpfen und erst ganz am Ende ausblenden.
        var vp = (typeof window.__scrollProg === "number") ? window.__scrollProg : prog;
        var tail = clamp01((vp - 0.80) / 0.18);     // 0 ab ~Fotos/Torbogen .. 1 beim Paar
        var tx, ty;
        if(tail > 0){
          tx = lerp( 0.2, 1.2, tail);               // leicht nach rechts zum Paar (bleibt im Bild)
          ty = lerp( 0.6,-1.0, tail);               // von Mitte runter zum Paar
          group.position.z = lerp(0, -2.0, tail);   // nur leicht nach hinten → Schrumpfen bleibt sichtbar
          var shrink = clamp01((tail - 0.32) / 0.68);   // erst ab „sagt ihr ja" kleiner werden
          group.scale.setScalar(1 - shrink*0.86);
          var op = clamp01(1 - Math.max(0, (tail - 0.72)) / 0.28);   // erst ganz am Ende ausblenden
          for(var mo=0; mo<ringMats.length; mo++) ringMats[mo].opacity = op;
        } else {
          // Schwung-Breite an die Bildbreite koppeln → Ring bleibt ~10% vom Rand weg statt rauszufliegen
          var halfH = Math.tan(camera.fov*Math.PI/360) * camera.position.z;
          var ampX  = Math.max(0.3, Math.min(3.2, halfH*camera.aspect*0.9 - 1.45));
          tx = Math.sin(prog*Math.PI*3)*ampX;
          ty = Math.cos(prog*Math.PI*2)*0.5 + 1.3;
          group.position.z += (0 - group.position.z) * 0.12;
          group.scale.setScalar(1);
          for(var mo2=0; mo2<ringMats.length; mo2++) ringMats[mo2].opacity = 1;
        }
        group.position.x += (tx - group.position.x) * 0.09;
        group.position.y += (ty - group.position.y) * 0.09;
      }
      // ----- Beleuchtung nach Wanjas Vorgabe je Station, mit Lichtpfad dazwischen -----
      // Ring ist immer von HINTEN beleuchtet (Sonne hinterm Ring) → Vorderseite dunkel, Kante glüht.
      var vp = (typeof window.__scrollProg === "number") ? window.__scrollProg : 0;
      var li = 0; while(li < LVP.length-1 && vp > LVP[li+1]) li++;
      var lj = Math.min(li+1, LK.length-1);
      var u  = clamp01((vp - LVP[li]) / Math.max(1e-4, LVP[lj] - LVP[li]));
      var A = LK[li], B = LK[lj];
      var dayAmt = clamp01((0.58 - vp) / 0.10);   // 1 in den Tag-Szenen (vor dem DJ), 0 ab DJ
      // Sonne wandert auf einem Pfad von Station zu Station (Position, Stärke, Farbe interpoliert)
      sun.position.set(lerp(A[0],B[0],u), lerp(A[1],B[1],u), lerp(A[2],B[2],u));
      sun.intensity = lerp(A[3],B[3],u) * (1 + dayAmt*0.8);   // tagsüber hinten heller (stärkeres Backlight)
      sunColA.set(A[4]); sunColB.set(B[4]); sun.color.copy(sunColA).lerp(sunColB,u);
      var disco  = lerp(A[5],B[5],u);
      var candle = lerp(A[6],B[6],u);
      renderer.toneMappingExposure = 0.95;
      // tagsüber hellere Front-Spiegelung (Ring vorne heller) — am DJ & danach bleibt es fast schwarz (Kontrast)
      var env = 0.15 + dayAmt*0.95;
      for(var me=0; me<ringMats.length; me++) ringMats[me].envMapIntensity = env;
      fill.color.setRGB(1,0.93,0.82); fill.intensity = 0.02 + dayAmt*0.30 + candle*0.18;
      amb.color.setRGB(1,0.97,0.90);  amb.intensity  = 0.012 + dayAmt*0.06 + candle*0.06 + disco*0.03;
      if(disco>0.02){            // DJ: Disco von oben (magenta) + oben links (cyan) — kräftig
        disco1.color.setHSL(0.93,0.75,0.42); disco1.position.set( 1.5, 5.0, 3.5); disco1.intensity = disco*22;  // burgundy
        disco2.color.setHSL(0.24,0.5,0.58);  disco2.position.set(-5.0, 4.0, 3.0); disco2.intensity = disco*26;  // matcha
        disco3.color.setHSL(0.08,0.8,0.6);   disco3.position.set( 5.0,-1.0, 3.0); disco3.intensity = disco*4;   // warm cream
      } else if(candle>0.02){    // Torte/Torbogen: viele kleine warme Lichter (Kerzen, Lampen)
        disco1.color.setHSL(0.08,0.90,0.50); disco1.position.set(-3.0,-1.0, 4.0); disco1.intensity = candle*3.0;
        disco2.color.setHSL(0.07,0.95,0.50); disco2.position.set( 3.0, 0.0, 4.0); disco2.intensity = candle*3.0;
        disco3.color.setHSL(0.10,0.85,0.50); disco3.position.set( 0.0, 2.0, 3.0); disco3.intensity = candle*2.0;
      } else {
        disco1.intensity = disco2.intensity = disco3.intensity = 0;
      }
    }
    renderer.render(scene, camera);
    // Echte FPS messen (alle Handys, erst nach dem Settle). 2 Sek. anhaltend zu langsam → Ring weg.
    // So behält ein starkes iPhone (hohe FPS) den schönen Ring, ein altes iPhone X/8 stuft sich selbst herunter.
    if(monitorOn && isMobile){
      monFrames++;
      var mn = performance.now();
      if(mn - monStart >= 1000){
        var rfps = monFrames / ((mn - monStart) / 1000);
        slowStreak = (rfps < (60/FSKIP) * 0.6) ? slowStreak + 1 : 0;   // unter ~60% des Ziels = zäh
        monStart = mn; monFrames = 0;
        if(slowStreak >= 2) killRing();
      }
    }
  })();
})();
