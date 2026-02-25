/**
 * modules/wpt_scene.js
 * Scène 3D UNIFIÉE — Transfert d'Énergie Sans Fil (WPT)
 *
 * Principe physique modélisé :
 *   Circuit 1 (émetteur) : GBF → R₁ → Bobine L₁  (boucle fermée)
 *   Circuit 2 (récepteur): Bobine L₂ → R₂ → Rₗ   (boucle fermée)
 *   Les deux circuits sont PHYSIQUEMENT SÉPARÉS.
 *   L₁ génère un champ magnétique B(t) (courant alternatif).
 *   Ce champ se propage dans l'espace → flux variable dans L₂ → f.é.m. induite.
 *
 * Animation :
 *   - Anneaux de champ B pulsants, issus de L₁, traversant l'espace, atteignant L₂
 *   - Courant électrique pulsant visible sur les fils (couleur oscillante)
 *   - Les bobines sont FIXES  (ce sont les lignes de champ qui bougent)
 *
 * 1 unit = 1 cm.
 */

import * as THREE from 'three';
import {
  box, cyl, coil, tube, mat, glowSphere,
  buildGBF, buildOscillo, buildCapacitor, buildResistor, buildLED
} from '../helpers.js';

// ─── Palette ────────────────────────────────────────────────────────────────
const COL = {
  copper   : 0xd47820,
  emerald  : 0x20c860,
  wire1    : 0x4ab8e8,   // fil circuit 1 (bleu)
  wire2    : 0x50c878,   // fil circuit 2 (vert)
  bench    : 0x1a2535,
  resist   : 0xe05050,
  gbf      : 0xf4a030,
  field    : 0x60c8ff,   // anneaux de champ B (bleu)
  fieldCore: 0xa0e8ff,   // coeur du champ
};

// ─── Helper : fil visible entre deux points ─────────────────────────────────
function wire(parent, from, to, color = COL.wire1, r = 0.35) {
  tube(parent, from, to, { r, color, roughness: 0.4, metalness: 0.6 });
}

// ─── Helper : anneau de champ B (torus plat animé) ──────────────────────────
// Retourne un objet avec { mesh, phase } pour l'animation
function makeFieldRing(parent, phase, yBase = 0) {
  const geo = new THREE.TorusGeometry(7, 0.25, 8, 64);
  const m   = new THREE.Mesh(geo,
    new THREE.MeshStandardMaterial({
      color: COL.field,
      emissive: COL.field,
      emissiveIntensity: 1.5,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );
  // anneau dans le plan YZ (axe de propagation = X)
  m.rotation.y = Math.PI / 2;
  m.position.set(-20, yBase, 0);
  m.userData.phase = phase;
  m.userData.isFieldRing = true;
  parent.add(m);
  return m;
}

// ─── Scène principale ────────────────────────────────────────────────────────
export function buildWPTScene() {
  const g = new THREE.Group();

  // ┌──────────────────────────────────────────────────────────────┐
  // │  SOCLE DE TABLE                                               │
  // └──────────────────────────────────────────────────────────────┘
  box(g, { w: 160, h: 0.8, d: 50, y: -1, color: COL.bench, roughness: 0.9, metalness: 0.05 });

  // Ligne centrale "espace de transmission" (sol vitré)
  const gapMat = new THREE.MeshStandardMaterial({
    color: 0x0a2040, roughness: 0.1, metalness: 0.3,
    transparent: true, opacity: 0.35,
  });
  const gapFloor = new THREE.Mesh(new THREE.PlaneGeometry(46, 50), gapMat);
  gapFloor.rotation.x = -Math.PI / 2;
  gapFloor.position.set(0, -0.6, 0);
  g.add(gapFloor);

  // ┌──────────────────────────────────────────────────────────────┐
  // │  CIRCUIT 1 — ÉMETTEUR (gauche)                               │
  // │  GBF → R₁ → L₁  (boucle fermée, plan XY à z=0)              │
  // └──────────────────────────────────────────────────────────────┘

  // Positions clés circuit 1
  const C1 = {
    gbfX: -62, coilX: -20, r1X: -44,
    yTop: 16, yBot: 0, zN: 0,
  };

  // Socle circuit 1 (plateau légèrement surélevé)
  box(g, { w: 52, h: 0.4, d: 34, x: -43, y: -0.6, z: 0,
    color: 0x1e2d40, roughness: 0.8 });

  // ── GBF ──────────────────────────────────────────────────────────
  buildGBF(g, { x: C1.gbfX, y: C1.yBot + 4.5, z: 0, color0: COL.gbf });

  // ── R₁ ───────────────────────────────────────────────────────────
  buildResistor(g, { x: C1.r1X, y: C1.yTop + 4, z: 0, rx: Math.PI / 2 });

  // ── Bobine émettrice L₁ (cuivre) ─────────────────────────────────
  // Axe de la bobine : horizontal, selon X → coil.rz=PI/2
  coil(g, {
    R: 7, r: 0.55, H: 12, N: 22,
    x: C1.coilX, y: 8, z: 0,
    rx: 0, ry: 0, rz: Math.PI / 2,
    color: COL.copper,
    emissive: 0x7a3800, emissiveIntensity: 0.3,
  });

  // ── Fils boucle circuit 1 ─────────────────────────────────────────
  // Nœuds principaux
  const gbfTopL1 = new THREE.Vector3(C1.gbfX, C1.yTop, 0);
  const r1InL1   = new THREE.Vector3(C1.r1X - 6, C1.yTop, 0);
  const r1OutL1  = new THREE.Vector3(C1.r1X + 6, C1.yTop, 0);
  const coilTopL1 = new THREE.Vector3(C1.coilX, C1.yTop, 0);
  const gbfBotL1 = new THREE.Vector3(C1.gbfX, C1.yBot, 0);
  const coilBotL1 = new THREE.Vector3(C1.coilX, C1.yBot, 0);

  // Fil haut (gauche → R1 → droite → coil)
  wire(g, gbfTopL1, r1InL1, COL.wire1);
  wire(g, r1OutL1, coilTopL1, COL.wire1);
  // Jonctions verticales
  wire(g, new THREE.Vector3(C1.gbfX, C1.yBot + 9, 0), gbfTopL1, COL.wire1);
  wire(g, coilTopL1, new THREE.Vector3(C1.coilX, 14, 0), COL.wire1);
  // Fil bas (retour GND)
  wire(g, gbfBotL1, coilBotL1, COL.wire1, 0.3);
  wire(g, new THREE.Vector3(C1.gbfX, C1.yBot, 0), new THREE.Vector3(C1.gbfX, C1.yBot + 4, 0), COL.wire1);
  wire(g, new THREE.Vector3(C1.coilX, 2, 0), new THREE.Vector3(C1.coilX, C1.yBot, 0), COL.wire1, 0.3);

  // Nœuds (petites sphères aux jonctions)
  [gbfTopL1, gbfBotL1, coilTopL1, coilBotL1].forEach(pt => {
    glowSphere(g, { r: 0.5, x: pt.x, y: pt.y, z: pt.z,
      color: COL.wire1, emissive: COL.wire1, emissiveIntensity: 0.8 });
  });

  // Label circuit 1
  addLabel3D(g, 'CIRCUIT ÉMETTEUR', -43, 24, 0, COL.wire1);
  addLabel3D(g, 'L₁ (cuivre)', C1.coilX, 22, 0, COL.copper);
  addLabel3D(g, 'R₁', C1.r1X, C1.yTop + 12, 0, COL.resist);
  addLabel3D(g, 'GBF  10V ~', C1.gbfX, 20, 0, COL.gbf);

  // ┌──────────────────────────────────────────────────────────────┐
  // │  CIRCUIT 2 — RÉCEPTEUR (droite)                              │
  // │  L₂ → R₂ → Rₗ  (boucle fermée)                              │
  // └──────────────────────────────────────────────────────────────┘

  const C2 = {
    coilX: 20, r2X: 38, rlX: 55,
    yTop: 16, yBot: 0,
  };

  // Socle circuit 2
  box(g, { w: 52, h: 0.4, d: 34, x: 38, y: -0.6, z: 0,
    color: 0x1a2e1e, roughness: 0.8 });

  // ── Bobine réceptrice L₂ (émeraude) ──────────────────────────────
  coil(g, {
    R: 7, r: 0.55, H: 12, N: 22,
    x: C2.coilX, y: 8, z: 0,
    rx: 0, ry: 0, rz: Math.PI / 2,
    color: COL.emerald,
    emissive: 0x004820, emissiveIntensity: 0.3,
  });

  // ── R₂ ────────────────────────────────────────────────────────────
  buildResistor(g, { x: C2.r2X, y: C2.yTop + 4, z: 0, rx: Math.PI / 2 });

  // ── Rₗ (charge/LED) ──────────────────────────────────────────────
  buildLED(g, { x: C2.rlX, y: C2.yBot + 7, z: 0, color: 0x00e060 });

  // ── Fils boucle circuit 2 ─────────────────────────────────────────
  const coilTopL2  = new THREE.Vector3(C2.coilX, C2.yTop, 0);
  const r2InL2     = new THREE.Vector3(C2.r2X - 6, C2.yTop, 0);
  const r2OutL2    = new THREE.Vector3(C2.r2X + 6, C2.yTop, 0);
  const rlTopL2    = new THREE.Vector3(C2.rlX, C2.yTop, 0);
  const rlBotL2    = new THREE.Vector3(C2.rlX, C2.yBot, 0);
  const coilBotL2  = new THREE.Vector3(C2.coilX, C2.yBot, 0);

  // Fil haut
  wire(g, coilTopL2, r2InL2, COL.wire2);
  wire(g, r2OutL2, rlTopL2, COL.wire2);
  wire(g, new THREE.Vector3(C2.coilX, 14, 0), coilTopL2, COL.wire2);
  wire(g, rlTopL2, new THREE.Vector3(C2.rlX, C2.yTop, 0), COL.wire2);
  // Vertical Rₗ
  wire(g, new THREE.Vector3(C2.rlX, C2.yTop, 0), new THREE.Vector3(C2.rlX, C2.yBot + 9, 0), COL.wire2);
  // Fil bas (retour)
  wire(g, rlBotL2, coilBotL2, COL.wire2, 0.3);
  wire(g, new THREE.Vector3(C2.coilX, 2, 0), coilBotL2, COL.wire2, 0.3);

  // Nœuds circuit 2
  [coilTopL2, coilBotL2, rlTopL2, rlBotL2].forEach(pt => {
    glowSphere(g, { r: 0.5, x: pt.x, y: pt.y, z: pt.z,
      color: COL.wire2, emissive: COL.wire2, emissiveIntensity: 0.8 });
  });

  // Labels circuit 2
  addLabel3D(g, 'CIRCUIT RÉCEPTEUR', 38, 24, 0, COL.wire2);
  addLabel3D(g, 'L₂ (émeraude)', C2.coilX, 22, 0, COL.emerald);
  addLabel3D(g, 'R₂', C2.r2X, C2.yTop + 12, 0, COL.resist);
  addLabel3D(g, 'Rₗ / LED', C2.rlX, 20, 0, 0x80ffb0);

  // ┌──────────────────────────────────────────────────────────────┐
  // │  ESPACE DE TRANSMISSION — Champ magnétique B(t)              │
  // │  Anneaux pulsants de L₁ vers L₂                              │
  // └──────────────────────────────────────────────────────────────┘

  // Marqueurs de séparation (trait vertical pointillé)
  addSeparator(g, -12, 18);
  addSeparator(g, +12, 18);

  // Label "Gap / Espace sans fil"
  addLabel3D(g, '────  SANS FIL  ────', 0, 26, 0, 0xc0e860, 1.0);
  addLabel3D(g, 'Couplage inductif M', 0, 22, 0, 0x80d0a0, 0.7);

  // Pool d'anneaux de champ B (8 anneaux avec phases décalées)
  const fieldRings = [];
  const NUM_RINGS = 8;
  for (let i = 0; i < NUM_RINGS; i++) {
    fieldRings.push(makeFieldRing(g, i / NUM_RINGS, 8));
  }

  // Sphère glow au centre du champ (point de couplage)
  const couplingGlow = glowSphere(g, {
    r: 1.5, x: 0, y: 8, z: 0,
    color: 0x60c8ff, emissive: 0x00aaff, emissiveIntensity: 2.0,
  });

  // ── Retourner les paramètres nécessaires à l'animation ─────────
  g.userData.fieldRings   = fieldRings;
  g.userData.couplingGlow = couplingGlow;
  g.userData.numRings     = NUM_RINGS;

  return g;
}

// ─── Étiquette 3D flottante (sprite texte) ─────────────────────────────────
function addLabel3D(parent, text, x, y, z, color = 0xffffff, opacity = 0.85) {
  const canvas = document.createElement('canvas');
  canvas.width  = 512;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 64);
  ctx.font = 'bold 28px "Rajdhani", sans-serif';
  ctx.fillStyle = `rgba(${(color>>16)&255},${(color>>8)&255},${color&255},${opacity})`;
  ctx.textAlign = 'center';
  ctx.fillText(text, 256, 42);
  const tex = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: tex, transparent: true, depthWrite: false,
  }));
  sprite.scale.set(18, 2.5, 1);
  sprite.position.set(x, y, z);
  sprite.userData.isLabel = true;
  parent.add(sprite);
  return sprite;
}

// ─── Séparateur vertical (trait blanc pointillé) ───────────────────────────
function addSeparator(parent, x, h) {
  const pts = [];
  const N = 20;
  for (let i = 0; i <= N; i++) {
    pts.push(new THREE.Vector3(x, (i / N) * h - 0.5, 0));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat2 = new THREE.LineDashedMaterial({
    color: 0xc0e860, dashSize: 0.8, gapSize: 0.5, opacity: 0.35, transparent: true,
  });
  const line = new THREE.Line(geo, mat2);
  line.computeLineDistances();
  parent.add(line);
}
