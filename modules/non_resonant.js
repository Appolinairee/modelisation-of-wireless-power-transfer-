/**
 * modules/non_resonant.js
 * Couplage inductif simple (non résonant)
 *
 * Layout (vue de dessus, axe Z = profondeur) :
 *   GBF ─── R ─── Bobine émettrice ···B··· Bobine réceptrice ─── C ─── Oscillo
 *
 * Cotes : 1 unit = 1 cm
 */

import * as THREE from 'three';
import {
  box, cyl, coil, tube, fieldArc,
  buildGBF, buildOscillo, buildCapacitor, buildResistor,
  buildLED, buildBridge, buildPCB, label, glowSphere, mat
} from '../helpers.js';

export function buildNonResonant() {
  const g = new THREE.Group();

  // ── Socle / plan de travail ──────────────────────
  box(g, { w: 120, h: 0.8, d: 40, y: -1, color: 0x1a2535, roughness: 0.9, metalness: 0.05 });

  // ── GBF ─────────────────────────────────────────
  buildGBF(g, { x: -48, y: 5, z: 0, color0: 0xf4a030 });
  label(g, '① GBF  f = 1 kHz', { x: -48, y: 13, z: 0, color: '#f4a030' });

  // Fil GBF → Résistance
  tube(g, new THREE.Vector3(-41, 4.5, 0), new THREE.Vector3(-32, 4.5, 0));

  // ── Résistance ───────────────────────────────────
  buildResistor(g, { x: -29, y: 9, z: 0, rx: Math.PI / 2 });
  label(g, '② R  (anti CC)', { x: -29, y: 16, z: 0, color: '#e05050' });

  // Fil R → bobine émettrice
  tube(g, new THREE.Vector3(-26, 4.5, 0), new THREE.Vector3(-18, 4.5, 0));

  // ── Bobine émettrice ─────────────────────────────
  // Coil orienté face à face avec la bobine réceptrice → axe horizontal (rx=0)
  coil(g, { R: 6, r: 0.55, H: 10, N: 20,
    x: -12, y: 6, z: 0,
    rx: 0, ry: 0, rz: 0,            // axe Y vertical → spires dans plan XZ
    color: 0xd48820, emissive: 0x664400, emissiveIntensity: 0.15 });
  label(g, '③ LT  6000 tours', { x: -12, y: 20, z: 0, color: '#4ab8e8' });

  // ── Bobine réceptrice ────────────────────────────
  coil(g, { R: 6, r: 0.55, H: 10, N: 20,
    x: 12, y: 6, z: 0,
    rx: 0, ry: 0, rz: 0,
    color: 0x20a848, emissive: 0x004418, emissiveIntensity: 0.15 });
  label(g, '④ LR  6000 tours', { x: 12, y: 20, z: 0, color: '#50c878' });

  // ── Champ magnétique (arcs entre les deux bobines) ──
  const arcColors = [0x4ab8e8, 0x60c8f8, 0x80d8ff];
  const arcHeights = [14, 18, 22];
  arcColors.forEach((c, i) => {
    // Arc au-dessus
    fieldArc(g,
      new THREE.Vector3(-6, 6, 0),
      new THREE.Vector3(6, 6, 0),
      { height: arcHeights[i], color: c, opacity: 0.35 - i * 0.07 });
    // Arc en dessous (miroir)
    fieldArc(g,
      new THREE.Vector3(-6, 6, 0),
      new THREE.Vector3(6, 6, 0),
      { height: -arcHeights[i], color: c, opacity: 0.30 - i * 0.06 });
    // Arcs latéraux (x = 0 plan X=z)
    fieldArc(g,
      new THREE.Vector3(0, 6, -6),
      new THREE.Vector3(0, 6, 6),
      { height: arcHeights[i], color: c, opacity: 0.25 - i * 0.05 });
  });

  // Point de couplage (glow)
  glowSphere(g, { r: 1.2, x: 0, y: 6, z: 0, color: 0x4ab8e8, emissive: 0x00ccff, emissiveIntensity: 1.8 });

  // ── Fil bobine réceptrice → Condensateur ──────────
  tube(g, new THREE.Vector3(18, 4.5, 0), new THREE.Vector3(26, 4.5, 0));

  // ── Condensateur ─────────────────────────────────
  buildCapacitor(g, { x: 29, y: 7, z: 0, color: 0xb070e0 });
  label(g, '⑤ C  ajustable', { x: 29, y: 16, z: 0, color: '#b070e0' });

  // Fil C → Oscilloscope
  tube(g, new THREE.Vector3(32, 4.5, 0), new THREE.Vector3(40, 4.5, 0));

  // ── Oscilloscope ──────────────────────────────────
  buildOscillo(g, { x: 48, y: 7, z: 0 });
  label(g, '⑥ Oscilloscope', { x: 48, y: 16, z: 0, color: '#f0d020' });

  // ── Fil retour bas (GND) ──────────────────────────
  tube(g,
    new THREE.Vector3(-41, 2.0, 0),
    new THREE.Vector3(40, 2.0, 0),
    { r: 0.25, color: 0x303030, opacity: 0.7 });

  // ── LED (charge) ──────────────────────────────────
  buildLED(g, { x: 35, y: 4.5, z: -12, color: 0x00aaff });
  tube(g, new THREE.Vector3(32, 4.5, 0), new THREE.Vector3(35, 4.5, -10), { r: 0.25, color: 0x707070 });

  // ── Pont de diodes (redresseur) ───────────────────
  buildBridge(g, { x: 24, y: 1.5, z: -12 });

  return g;
}
