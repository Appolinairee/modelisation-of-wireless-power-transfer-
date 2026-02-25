/**
 * circuit.js
 * Schéma circuit 2D + sliders + calculs temps réel
 * Transfert d'énergie sans fil — ECC ABC2/SG25 2026
 *
 * Physique (circuits 1 et 2 découplés — couplage uniquement par M) :
 *   M   = μ₀π²N₁N₂a²b² / (2(a²+r²)^(3/2))          [Henry]
 *   D   = R₁(R₂+Rₗ) + ω²M²
 *   I₁  = V₁(R₂+Rₗ) / D
 *   I₂  = ωM V₁ / D
 *   U₂  = I₂ · Rₗ
 *   η   = ω²M²Rₗ / ((R₂+Rₗ)·D)
 */

// ── Constantes physiques ───────────────────────────
const MU0 = 4 * Math.PI * 1e-7;   // H/m
const V1  = 10;                    // V (GBF)
const R1  = 50;                    // Ω (résistance circuit 1)
const R2  = 50;                    // Ω (résistance circuit 2)
const RL  = 1000;                  // Ω (charge LED)
const ETA_THRESHOLD = 0.5;         // % pour allumer la LED

// ── Coordonnées SVG ────────────────────────────────
const Y_TOP  = 65;
const Y_BOT  = 205;
const Y_MID  = (Y_TOP + Y_BOT) / 2;   // 135

// Circuit 1 (émetteur)
const X1_L  = 45;   // bord gauche (source)
const X1_R  = 393;  // bord droit (jonction couplage)

// Circuit 2 (récepteur)
const X2_L  = 427;  // bord gauche (jonction couplage)
const X2_R  = 760;  // bord droit (charge RL)

// Composants circuit 1
const R1_X1 = 100, R1_X2 = 175;   // R1 zigzag
const L1_X1 = 212, L1_X2 = 372;   // L1 coil (5×32 = 160 px)

// Composants circuit 2
const L2_X1 = X2_L, L2_X2 = X2_L + 160;  // 427–587
const R2_X1 = 615,  R2_X2 = 690;          // R2 zigzag
const RL_X  = X2_R;                        // RL vertical

// ── Couleurs ──────────────────────────────────────
const C = {
  wire1 : '#4ab8e8',   // circuit 1 (bleu)
  wire2 : '#50c878',   // circuit 2 (vert)
  r     : '#e05050',   // résistances
  l1    : '#4ab8e8',   // bobine 1
  l2    : '#50c878',   // bobine 2
  rl    : '#80d8a0',   // charge
  src   : '#f4a030',   // source GBF
  coup  : '#c0e860',   // couplage M
  label : '#9ac8e0',   // textes
  dim   : '#1a3048',   // câble inactif
  cur1  : '#80d0ff',   // flèche I1
  cur2  : '#60f0a0',   // flèche I2
  u2    : '#f0d020',   // U2
  bg    : '#080e18',
};

// ── Helpers SVG ───────────────────────────────────
function el(tag, attrs, ...children) {
  const ns = 'http://www.w3.org/2000/svg';
  const e = document.createElementNS(ns, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  for (const c of children) {
    if (typeof c === 'string') e.textContent = c;
    else e.appendChild(c);
  }
  return e;
}

function line(x1,y1,x2,y2,color,w=1.5,dash='') {
  return el('line',{x1,y1,x2,y2,stroke:color,'stroke-width':w,'stroke-dasharray':dash});
}

function text(x,y,str,{fill=C.label,size=9,anchor='middle',dy=0,id='',mono=false}={}) {
  return el('text',{x,y: y+dy,'font-size':size,'text-anchor':anchor,fill,
    id,
    'font-family':mono? "'Share Tech Mono',monospace":"'Rajdhani',sans-serif"},
    str);
}

// Zigzag pour résistance
function zigzag(x0,y0,x1) {
  const W = x1-x0;
  const d = [`M ${x0},${y0}`,
    `L ${x0+W*.12},${y0-9}`, `L ${x0+W*.28},${y0+9}`,
    `L ${x0+W*.44},${y0-9}`, `L ${x0+W*.56},${y0+9}`,
    `L ${x0+W*.72},${y0-9}`, `L ${x0+W*.88},${y0+9}`,
    `L ${x1},${y0}`].join(' ');
  return el('path',{d,stroke:C.r,fill:'none','stroke-width':1.8,'stroke-linejoin':'round'});
}

// Coil bumps (Bezier caboodle)
function coilPath(x0,y0,n=5,bumpW=32,peakDy=-23) {
  const pts = [`M ${x0},${y0}`];
  for(let i=0;i<n;i++){
    const cx = x0 + i*bumpW;
    pts.push(`C ${cx+bumpW*0.25},${y0+peakDy} ${cx+bumpW*0.75},${y0+peakDy} ${cx+bumpW},${y0}`);
  }
  return pts.join(' ');
}

// Flèche directionnelle (‣) pour le courant
function arrowH(x,y,dir=1,color=C.cur1,opacity=1){
  const size=8, tip=dir*size;
  return el('polygon',{
    points:`${x},${y} ${x-tip},${y-5} ${x-tip},${y+5}`,
    fill:color,opacity
  });
}

// Rectangle avec coins arrondis
function rect(x,y,w,h,stroke,fill='none',rx=3){
  return el('rect',{x,y,width:w,height:h,stroke,fill,rx,'stroke-width':1.8});
}

// ── Construction du SVG statique ──────────────────
function buildSVG() {
  const svg = document.getElementById('circuit-svg');
  svg.innerHTML = '';

  // ── Defs : marqueurs de flèche ──────────────────
  const defs = el('defs');
  // marqueurs courant + couplage + alimente
  ['coup','c1','c2','alim'].forEach(id => {
    const cols = {coup:C.coup,c1:C.cur1,c2:C.cur2,alim:C.src};
    const m = el('marker',{
      id:`mh-${id}`,markerWidth:'8',markerHeight:'8',
      refX:'6',refY:'4',orient:'auto'
    });
    m.appendChild(el('polygon',{points:'0,0 8,4 0,8',fill:cols[id]}));
    defs.appendChild(m);
  });

  // Filtre glow pour le halo GBF
  const flt = el('filter',{id:'glow-src',x:'-50%',y:'-50%',width:'200%',height:'200%'});
  const fe1 = el('feGaussianBlur',{in:'SourceGraphic',stdDeviation:'3',result:'blur'});
  const fe2 = el('feMerge');
  fe2.appendChild(el('feMergeNode',{in:'blur'}));
  fe2.appendChild(el('feMergeNode',{in:'SourceGraphic'}));
  flt.appendChild(fe1); flt.appendChild(fe2);
  defs.appendChild(flt);
  svg.appendChild(defs);

  // ── Fond zones ──────────────────────────────────
  // Zone circuit 1
  svg.appendChild(el('rect',{x:X1_L-12,y:Y_TOP-20,
    width:X1_R-X1_L+24, height:Y_BOT-Y_TOP+40,
    fill:'rgba(74,184,232,0.04)',stroke:'rgba(74,184,232,0.12)',
    rx:'8','stroke-dasharray':'4 3'}));
  // Zone circuit 2
  svg.appendChild(el('rect',{x:X2_L-12,y:Y_TOP-20,
    width:X2_R-X2_L+50, height:Y_BOT-Y_TOP+40,
    fill:'rgba(80,200,120,0.04)',stroke:'rgba(80,200,120,0.12)',
    rx:'8','stroke-dasharray':'4 3'}));

  // ── Titres zones ────────────────────────────────
  svg.appendChild(text((X1_L+X1_R)/2, Y_BOT+28,
    'Circuit 1 — Émetteur', {fill:'rgba(74,184,232,0.55)',size:8.5}));
  svg.appendChild(text((X2_L+X2_R+20)/2, Y_BOT+28,
    'Circuit 2 — Récepteur', {fill:'rgba(80,200,120,0.55)',size:8.5}));

  // ══════════════════════════════════════════════
  // CIRCUIT 1 — wires
  // ══════════════════════════════════════════════
  const c1w = C.wire1;

  // Fil haut : GBF+ → R1 start
  svg.appendChild(el('line',{x1:X1_L,y1:Y_TOP,x2:R1_X1,y2:Y_TOP,
    stroke:c1w,'stroke-width':1.8,id:'wc1-a'}));
  // Fil haut : R1 end → L1 start
  svg.appendChild(el('line',{x1:R1_X2,y1:Y_TOP,x2:L1_X1,y2:Y_TOP,
    stroke:c1w,'stroke-width':1.8,id:'wc1-b'}));
  // Fil haut : L1 end → X1_R
  svg.appendChild(el('line',{x1:L1_X2,y1:Y_TOP,x2:X1_R,y2:Y_TOP,
    stroke:c1w,'stroke-width':1.8,id:'wc1-c'}));
  // Vertical droit
  svg.appendChild(el('line',{x1:X1_R,y1:Y_TOP,x2:X1_R,y2:Y_BOT,
    stroke:c1w,'stroke-width':1.8,id:'wc1-d'}));
  // Fil bas
  svg.appendChild(el('line',{x1:X1_L,y1:Y_BOT,x2:X1_R,y2:Y_BOT,
    stroke:c1w,'stroke-width':1.8,id:'wc1-e'}));
  // GBF vertical haut
  svg.appendChild(el('line',{x1:X1_L,y1:Y_TOP,x2:X1_L,y2:Y_MID-28,
    stroke:c1w,'stroke-width':1.8}));
  // GBF vertical bas
  svg.appendChild(el('line',{x1:X1_L,y1:Y_MID+28,x2:X1_L,y2:Y_BOT,
    stroke:c1w,'stroke-width':1.8}));

  // ── GBF (source tension) ────────────────────────
  // Halo pulsant (animation CSS keyframe)
  const gbfHalo = el('circle',{cx:X1_L,cy:Y_MID,r:36,
    stroke:C.src,'stroke-width':1,fill:'none',opacity:0.25,id:'gbf-halo'});
  svg.appendChild(gbfHalo);

  // Corps du GBF
  svg.appendChild(el('circle',{cx:X1_L,cy:Y_MID,r:28,
    stroke:C.src,'stroke-width':2.5,fill:'rgba(244,160,48,0.13)',id:'gbf-ring'}));

  // Onde sinusoïdale animée : M 17,135 C 23,118 29,118 35,135 C 41,152 47,152 53,135 C 59,118 65,118 71,135
  const sinLen = 110; // longueur approximative du path
  const gbfSin = el('path',{
    d:`M ${X1_L-28},${Y_MID} C ${X1_L-22},${Y_MID-18} ${X1_L-16},${Y_MID-18} ${X1_L-10},${Y_MID} C ${X1_L-4},${Y_MID+18} ${X1_L+2},${Y_MID+18} ${X1_L+8},${Y_MID} C ${X1_L+14},${Y_MID-18} ${X1_L+20},${Y_MID-18} ${X1_L+26},${Y_MID}`,
    stroke:C.src,fill:'none','stroke-width':2.2,
    'stroke-dasharray':`${sinLen} ${sinLen*2}`,
    'stroke-dashoffset':'0',
    id:'gbf-sin',opacity:0.9
  });
  svg.appendChild(gbfSin);

  // Symboles +/−
  svg.appendChild(text(X1_L,Y_MID-20,'+',{fill:C.src,size:11,anchor:'middle'}));
  svg.appendChild(text(X1_L,Y_MID+26,'−',{fill:C.src,size:11,anchor:'middle'}));

  // Label principal "GBF"
  svg.appendChild(text(X1_L, Y_TOP-32,'GBF',{fill:C.src,size:11,anchor:'middle'}));
  // Label secondaire "10 V"
  svg.appendChild(text(X1_L, Y_TOP-20,'10 V  ~',{fill:'rgba(255,180,60,0.8)',size:8.5,anchor:'middle'}));

  // Flèche "alimente →"
  const arrowAlim = el('g',{opacity:'0.85'});
  arrowAlim.appendChild(el('line',{x1:X1_L+32,y1:Y_TOP-12,x2:R1_X1-6,y2:Y_TOP-12,
    stroke:C.src,'stroke-width':1.5,'marker-end':'url(#mh-alim)'}));
  arrowAlim.appendChild(el('text',{x:(X1_L+32+R1_X1-6)/2,y:Y_TOP-16,
    'font-size':'7.5','text-anchor':'middle',fill:C.src,
    'font-family':"'Rajdhani',sans-serif"},'alimente'));
  svg.appendChild(arrowAlim);

  // ── R1 zigzag ───────────────────────────────────
  svg.appendChild(zigzag(R1_X1, Y_TOP, R1_X2));

  // ── L1 coil ─────────────────────────────────────
  const l1p = el('path',{
    d: coilPath(L1_X1, Y_TOP, 5, 32, -20),
    stroke:C.l1, fill:'none','stroke-width':2,'stroke-linejoin':'round',id:'l1-coil'
  });
  svg.appendChild(l1p);

  // ══════════════════════════════════════════════
  // CIRCUIT 2 — wires
  // ══════════════════════════════════════════════
  const c2w = C.wire2;

  // Vertical gauche circuit 2
  svg.appendChild(el('line',{x1:X2_L,y1:Y_TOP,x2:X2_L,y2:Y_BOT,
    stroke:c2w,'stroke-width':1.8,id:'wc2-a'}));
  // Fil haut : L2 end → R2 start
  svg.appendChild(el('line',{x1:L2_X2,y1:Y_TOP,x2:R2_X1,y2:Y_TOP,
    stroke:c2w,'stroke-width':1.8,id:'wc2-b'}));
  // Fil haut : R2 end → RL
  svg.appendChild(el('line',{x1:R2_X2,y1:Y_TOP,x2:RL_X,y2:Y_TOP,
    stroke:c2w,'stroke-width':1.8,id:'wc2-c'}));
  // RL vertical haut
  svg.appendChild(el('line',{x1:RL_X,y1:Y_TOP,x2:RL_X,y2:Y_MID-40,
    stroke:c2w,'stroke-width':1.8}));
  // RL vertical bas
  svg.appendChild(el('line',{x1:RL_X,y1:Y_MID+40,x2:RL_X,y2:Y_BOT,
    stroke:c2w,'stroke-width':1.8}));
  // Fil bas circuit 2
  svg.appendChild(el('line',{x1:X2_L,y1:Y_BOT,x2:RL_X,y2:Y_BOT,
    stroke:c2w,'stroke-width':1.8,id:'wc2-e'}));

  // ── L2 coil ─────────────────────────────────────
  svg.appendChild(el('path',{
    d: coilPath(L2_X1, Y_TOP, 5, 32, -20),
    stroke:C.l2, fill:'none','stroke-width':2,'stroke-linejoin':'round',id:'l2-coil'
  }));

  // ── R2 zigzag ───────────────────────────────────
  svg.appendChild(zigzag(R2_X1, Y_TOP, R2_X2));

  // ── RL (charge) rectangle ───────────────────────
  svg.appendChild(rect(RL_X-12, Y_MID-40, 24, 80, C.rl, 'rgba(80,216,160,0.07)'));
  // LED glow circle (invisible until η > seuil)
  svg.appendChild(el('circle',{id:'led-glow',cx:RL_X,cy:Y_MID,r:30,
    fill:'rgba(0,255,136,0)','stroke-width':0}));

  // ══════════════════════════════════════════════
  // COUPLAGE M (zone entre les deux circuits)
  // ══════════════════════════════════════════════
  const XM = (X1_R + X2_L) / 2;  // 410

  // Séparateurs pointillés
  svg.appendChild(line(X1_R,Y_TOP-15,X1_R,Y_BOT+15,
    'rgba(192,232,96,0.25)',1,'3 3'));
  svg.appendChild(line(X2_L,Y_TOP-15,X2_L,Y_BOT+15,
    'rgba(192,232,96,0.25)',1,'3 3'));

  // Double flèche M
  const mArrow = el('line',{
    x1:X1_R+2,y1:Y_MID, x2:X2_L-2,y2:Y_MID,
    stroke:C.coup,'stroke-width':2, id:'m-arrow',
    'marker-start':`url(#mh-coup)`,
    'marker-end':`url(#mh-coup)`
  });
  svg.appendChild(mArrow);

  // Fond zone couplage
  svg.appendChild(el('rect',{x:X1_R+1,y:Y_TOP,width:X2_L-X1_R-2,
    height:Y_BOT-Y_TOP, fill:'url(#none)','stroke':'none',id:'coup-glow'}));

  // ══════════════════════════════════════════════
  // FLÈCHES DE COURANT
  // ══════════════════════════════════════════════
  // I1 sur le fil haut c1 (entre GBF et R1)
  const i1arrow = arrowH((X1_L+R1_X1)/2+6, Y_TOP-12, 1, C.cur1, 0.9);
  i1arrow.setAttribute('id','i1-arrow');
  svg.appendChild(i1arrow);
  svg.appendChild(el('line',{
    x1:X1_L+10,y1:Y_TOP-12, x2:R1_X1-10,y2:Y_TOP-12,
    stroke:C.cur1,'stroke-width':1,id:'i1-line',opacity:0.7,
    'marker-end':'url(#mh-c1)'}));

  // I2 sur le fil haut c2 (entre R2 et RL)
  const i2arrow = arrowH((R2_X2+RL_X)/2+6, Y_TOP-12, 1, C.cur2, 0.9);
  i2arrow.setAttribute('id','i2-arrow');
  svg.appendChild(i2arrow);
  svg.appendChild(el('line',{
    x1:R2_X2+8,y1:Y_TOP-12, x2:RL_X-12,y2:Y_TOP-12,
    stroke:C.cur2,'stroke-width':1,id:'i2-line',opacity:0.7,
    'marker-end':'url(#mh-c2)'}));

  // ══════════════════════════════════════════════
  // LABELS COMPOSANTS
  // ══════════════════════════════════════════════
  // GBF
  svg.appendChild(text(X1_L+32,Y_MID-6,'V₁ = 10V',{fill:C.src,size:8,anchor:'start'}));
  svg.appendChild(text(X1_L+32,Y_MID+7,'f (Hz)',  {fill:C.src,size:7.5,anchor:'start',id:'lbl-f'}));

  // R1
  svg.appendChild(text((R1_X1+R1_X2)/2, Y_TOP-14,'R₁',{fill:C.r,size:9}));
  svg.appendChild(text((R1_X1+R1_X2)/2, Y_TOP-5, '(fil cuivre)',{fill:'rgba(224,80,80,0.6)',size:7}));

  // L1
  svg.appendChild(text((L1_X1+L1_X2)/2, Y_TOP-30,'L₁',{fill:C.l1,size:9}));
  svg.appendChild(text((L1_X1+L1_X2)/2, Y_TOP-20,'N₁ spires  a cm',{fill:'rgba(74,184,232,0.6)',size:7,id:'lbl-l1'}));

  // I1 label
  svg.appendChild(text((X1_L+R1_X1)/2, Y_TOP-22,'I₁',{fill:C.cur1,size:8.5,id:'lbl-i1'}));

  // M label
  svg.appendChild(text(XM, Y_TOP-30,'M',{fill:C.coup,size:11}));
  svg.appendChild(text(XM, Y_BOT+18,'',{fill:'rgba(192,232,96,0.55)',size:6,anchor:'middle',id:'lbl-M'}));

  // L2
  svg.appendChild(text((L2_X1+L2_X2)/2, Y_TOP-30,'L₂',{fill:C.l2,size:9}));
  svg.appendChild(text((L2_X1+L2_X2)/2, Y_TOP-20,'N₂ spires  b cm',{fill:'rgba(80,200,120,0.6)',size:7,id:'lbl-l2'}));

  // R2
  svg.appendChild(text((R2_X1+R2_X2)/2, Y_TOP-14,'R₂',{fill:C.r,size:9}));
  svg.appendChild(text((R2_X1+R2_X2)/2, Y_TOP-5, '(fil cuivre)',{fill:'rgba(224,80,80,0.6)',size:7}));

  // I2 label
  svg.appendChild(text((R2_X2+RL_X)/2-4, Y_TOP-22,'I₂',{fill:C.cur2,size:8.5,id:'lbl-i2'}));

  // RL
  svg.appendChild(text(RL_X+15, Y_MID-5,'Rₗ',  {fill:C.rl,size:10,anchor:'start'}));
  svg.appendChild(text(RL_X+15, Y_MID+8,'LED/charge',{fill:'rgba(128,216,160,0.6)',size:7,anchor:'start'}));

  // U2 flèche + label
  svg.appendChild(el('line',{x1:RL_X+36,y1:Y_TOP+4,x2:RL_X+36,y2:Y_BOT-4,
    stroke:C.u2,'stroke-width':1.2,'stroke-dasharray':'3 2',
    'marker-start':'url(#mh-coup)','marker-end':'url(#mh-coup)'}));
  svg.appendChild(text(RL_X+46, Y_MID-4,'U₂', {fill:C.u2,size:10,anchor:'start'}));
  svg.appendChild(text(RL_X+46, Y_MID+8,'',   {fill:C.u2,size:8,anchor:'start',id:'lbl-U2'}));

  // ══════════════════════════════════════════════
  // BOUCLES DE COURANT ANIMÉES (flow-dash overlay)
  // Tracé rectangulaire FERMÉ sur chaque circuit.
  // stroke-dashoffset animé → dots glissent dans le sens du courant.
  // ══════════════════════════════════════════════

  // Circuit 1 : sens horaire (droite sur rail haut, gauche sur rail bas)
  svg.appendChild(el('path',{
    id:'flow-c1',
    d:`M ${X1_L},${Y_TOP} L ${X1_R},${Y_TOP} L ${X1_R},${Y_BOT} L ${X1_L},${Y_BOT} Z`,
    fill:'none',stroke:C.cur1,
    'stroke-width':'3.5',
    'stroke-dasharray':'10 22',
    'stroke-dashoffset':'0',
    opacity:'0',                // sera activé quand I1 > 0
    'stroke-linecap':'round',
    id:'flow-c1'
  }));

  // Circuit 2 : sens horaire
  svg.appendChild(el('path',{
    id:'flow-c2',
    d:`M ${X2_L},${Y_TOP} L ${RL_X},${Y_TOP} L ${RL_X},${Y_BOT} L ${X2_L},${Y_BOT} Z`,
    fill:'none',stroke:C.cur2,
    'stroke-width':'3.5',
    'stroke-dasharray':'10 22',
    'stroke-dashoffset':'0',
    opacity:'0',
    'stroke-linecap':'round',
    id:'flow-c2'
  }));
}

// ── Calculs temps réel ────────────────────────────
function getSliderValues() {
  const r  = parseFloat(document.getElementById('sl-r' ).value);
  const f  = parseFloat(document.getElementById('sl-f' ).value);
  const n1 = parseFloat(document.getElementById('sl-n1').value);
  const n2 = parseFloat(document.getElementById('sl-n2').value);
  const a  = parseFloat(document.getElementById('sl-a' ).value);
  const b  = parseFloat(document.getElementById('sl-b' ).value);
  return { r, f, n1, n2, a, b };
}

function fmtSI(v) {
  if (!isFinite(v)) return '—';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs >= 1)    return v.toFixed(3);
  if (abs >= 1e-3) return (v*1e3).toFixed(3) + ' m';
  if (abs >= 1e-6) return (v*1e6).toFixed(3) + ' μ';
  if (abs >= 1e-9) return (v*1e9).toFixed(3) + ' n';
  return v.toExponential(3);
}

function compute({ r, f, n1, n2, a, b }) {
  const r_m = r / 100;       // cm → m
  const a_m = a / 100;
  const b_m = b / 100;
  const omega = 2 * Math.PI * f;

  // Inductance mutuelle
  const denom_M = 2 * Math.pow(a_m*a_m + r_m*r_m, 1.5);
  const M = (MU0 * Math.PI * Math.PI * n1 * n2 * a_m*a_m * b_m*b_m) / denom_M;

  // Circuit équivalent
  const w2M2  = omega*omega * M*M;
  const R2RL  = R2 + RL;
  const D     = R1 * R2RL + w2M2;

  const I1    = V1 * R2RL / D;
  const I2    = omega * M * V1 / D;
  const U2    = I2 * RL;
  const eta   = 100 * w2M2 * RL / (R2RL * D);   // %

  return { M, I1, I2, U2, eta, omega };
}

function updateOutputs({ M, I1, I2, U2, eta, omega }, { r, f, n1, n2, a, b }) {
  // Valeurs slider
  document.getElementById('vr' ).textContent = `${r} cm`;
  document.getElementById('vf' ).textContent = `${f} Hz`;
  document.getElementById('vn1').textContent = n1;
  document.getElementById('vn2').textContent = n2;
  document.getElementById('va' ).textContent = `${a} cm`;
  document.getElementById('vb' ).textContent = `${b} cm`;

  // Résultats numériques
  document.getElementById('out-M' ).textContent = fmtSI(M) + ' H';
  document.getElementById('out-U2').textContent = fmtSI(U2) + ' V';
  document.getElementById('out-eta').textContent = eta.toFixed(3) + ' %';

  // LED
  const ledOn = eta > ETA_THRESHOLD;
  const dot   = document.getElementById('led-dot');
  const state = document.getElementById('led-state');
  dot.classList.toggle('on', ledOn);
  state.classList.toggle('on', ledOn);
  state.textContent = ledOn ? 'ALLUMÉE' : 'ÉTEINTE';

  // LED en 3D
  if (typeof window.setLedState === 'function') window.setLedState(eta);

  // ── SVG dynamique ────────────────────────────────
  const i1norm = Math.min(I1 * 500, 1);   // normalise 0–1
  const i2norm = Math.min(I2 * 500, 1);
  const etaN   = Math.min(eta / 100, 1);

  // Intensité des fils
  const wc1 = lerpColor('#1a3048', C.wire1, i1norm);
  const wc2 = lerpColor('#1a3048', C.wire2, i2norm);
  ['wc1-a','wc1-b','wc1-c','wc1-d','wc1-e'].forEach(id => safeSet(id,'stroke',wc1));
  ['wc2-a','wc2-b','wc2-c','wc2-e'].forEach(id => safeSet(id,'stroke',wc2));
  safeSet('l1-coil','stroke',wc1);
  safeSet('l2-coil','stroke',wc2);

  // Flèches courant
  const i1op = 0.3 + 0.7*i1norm;
  const i2op = 0.3 + 0.7*i2norm;
  safeSet('i1-line','opacity', i1op);
  safeSet('i2-line','opacity', i2op);
  safeSet('i1-arrow','opacity', i1op);
  safeSet('i2-arrow','opacity', i2op);

  // Lueur LED dans SVG
  safeSet('led-glow', 'fill', ledOn
    ? `rgba(0,255,136,${0.08+0.22*etaN})`
    : 'rgba(0,255,136,0)');

  // Labels dynamiques
  safeText('lbl-f',    `${f} Hz`);
  safeText('lbl-l1',   `N₁=${n1}  a=${a}cm`);
  safeText('lbl-l2',   `N₂=${n2}  b=${b}cm`);
  safeText('lbl-i1',   `I₁=${fmtSI(I1)}A`);
  safeText('lbl-i2',   `I₂=${fmtSI(I2)}A`);
  safeText('lbl-M',    `M=${fmtSI(M)}H`);
  safeText('lbl-U2',   `${fmtSI(U2)}V`);
}

function safeSet(id, attr, val) {
  const e = document.getElementById(id);
  if (e) e.setAttribute(attr, val);
}
function safeText(id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = val;
}

// Interpolation linéaire entre deux couleurs hex
function lerpColor(c0, c1, t) {
  const r0=parseInt(c0.slice(1,3),16), g0=parseInt(c0.slice(3,5),16), b0=parseInt(c0.slice(5,7),16);
  const r1=parseInt(c1.slice(1,3),16), g1=parseInt(c1.slice(3,5),16), b1=parseInt(c1.slice(5,7),16);
  const r=Math.round(r0+(r1-r0)*t).toString(16).padStart(2,'0');
  const g=Math.round(g0+(g1-g0)*t).toString(16).padStart(2,'0');
  const b=Math.round(b0+(b1-b0)*t).toString(16).padStart(2,'0');
  return `#${r}${g}${b}`;
}

// ── État animation ───────────────────────────────
let _animI1 = 0, _animI2 = 0;   // normalisé 0-1
let _sinOff  = 0;
let _flow1Off = 0, _flow2Off = 0;

// ── Boucle principale ─────────────────────────────
function update() {
  const vals    = getSliderValues();
  const results = compute(vals);
  updateOutputs(results, vals);
  // Alimenter l'animation
  _animI1 = Math.min(results.I1 * 300, 1);
  _animI2 = Math.min(results.I2 * 300, 1);
}

// ── Boucle RAF : animation SVG ────────────────────
function animFrame() {
  requestAnimationFrame(animFrame);

  // Onde sinusoïdale dans le GBF (défilement continu)
  _sinOff -= 1.1;
  safeSet('gbf-sin', 'stroke-dashoffset', _sinOff.toFixed(1));

  // Halo pulsant (scale via transform — simple bob)
  const pulse = 1 + 0.08 * Math.sin(performance.now() / 400);
  const halo  = document.getElementById('gbf-halo');
  if (halo) {
    halo.setAttribute('r', (36 * pulse).toFixed(1));
    halo.setAttribute('opacity', (0.18 + 0.12 * Math.abs(Math.sin(performance.now()/400))).toFixed(3));
  }

  // Vitesse flow ∝ intensité du courant
  const speed1 = 0.5 + _animI1 * 5.5;
  const speed2 = 0.5 + _animI2 * 5.5;
  _flow1Off -= speed1;
  _flow2Off -= speed2;

  const f1 = document.getElementById('flow-c1');
  const f2 = document.getElementById('flow-c2');
  if (f1) {
    f1.setAttribute('stroke-dashoffset', _flow1Off.toFixed(1));
    f1.setAttribute('opacity', (0.15 + 0.65 * _animI1).toFixed(3));
  }
  if (f2) {
    f2.setAttribute('stroke-dashoffset', _flow2Off.toFixed(1));
    f2.setAttribute('opacity', (0.15 + 0.65 * _animI2).toFixed(3));
  }
}

// ── Init ──────────────────────────────────────────
buildSVG();

const sliderIds = ['sl-r','sl-f','sl-n1','sl-n2','sl-a','sl-b'];
sliderIds.forEach(id => {
  document.getElementById(id).addEventListener('input', update);
});

update();    // premier calcul
animFrame(); // démarrer l'animation
