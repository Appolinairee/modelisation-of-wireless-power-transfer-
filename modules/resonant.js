/**
 * modules/resonant.js
 * Couplage inductif RÉSONANT
 *
 * Les deux circuits RLC ont la même fréquence de résonance :
 *   f₀ = 1 / (2π√LC)
 * La résonance maximise le transfert d'énergie.
 *
 * Différences visuelles par rapport au module simple :
 *  - Condensateur des DEUX côtés (C₁ et C₂ accordés)
 *  - Bobines plus lumineuses (résonance)
 *  - Arcs de champ B plus nombreux et en vert (énergie maximale)
 *  - Résistances R₁ et R₂
 *  - La distance entre bobines est plus grande (10 cm)
 */

import * as THREE from 'three';
import {
  box, cyl, coil, tube, fieldArc,
  buildGBF, buildOscillo, buildCapacitor, buildResistor,
  buildLED, buildPCB, label, glowSphere, mat
} from '../helpers.js';

export function buildResonant() {
  const g = new THREE.Group();

  // ── Socle ────────────────────────────────────────
  box(g, { w: 130, h: 0.8, d: 50, y: -1, color: 0x0e1c2c, roughness: 0.9, metalness: 0.05 });

  // ── GBF — réglé sur f₀ ──────────────────────────
  buildGBF(g, { x: -52, y: 5, z: 0, color0: 0x00d4ff });
  label(g, '① GBF  f₀ = 1/(2π√LC)', { x: -52, y: 14, z: 0, color: '#f4a030', size: 420 });

  // Fil GBF → R₁
  tube(g, new THREE.Vector3(-45, 4.5, 0), new THREE.Vector3(-35, 4.5, 0));

  // ── R₁ (circuit émetteur) ────────────────────────
  buildResistor(g, { x: -32, y: 9, z: 0, rx: Math.PI / 2 });
  label(g, 'R₁', { x: -32, y: 15, z: 0, color: '#e05050', size: 180 });

  // Fil R₁ → C₁
  tube(g, new THREE.Vector3(-28, 4.5, 0), new THREE.Vector3(-22, 4.5, 0));

  // ── C₁ (condensateur accordé) ───────────────────
  buildCapacitor(g, { x: -19, y: 7, z: 0, color: 0xb070e0 });
  label(g, '④ C₁  accordé', { x: -19, y: 16, z: 0, color: '#b070e0' });

  // Fil C₁ → bobine émettrice
  tube(g, new THREE.Vector3(-16, 4.5, 0), new THREE.Vector3(-10, 4.5, 0));

  // ── Bobine émettrice ─────────────────────────────
  coil(g, { R: 7, r: 0.55, H: 11, N: 22,
    x: -4, y: 6, z: 0,
    rx: 0, ry: 0, rz: 0,
    color: 0xe09020, emissive: 0x904c00, emissiveIntensity: 0.4 });
  label(g, '② LT  6000 tours', { x: -4, y: 21, z: 0, color: '#4ab8e8' });

  // ── Bobine réceptrice (bobines distantes 10 cm) ──
  coil(g, { R: 7, r: 0.55, H: 11, N: 22,
    x: 16, y: 6, z: 0,
    rx: 0, ry: 0, rz: 0,
    color: 0x30c860, emissive: 0x008830, emissiveIntensity: 0.4 });
  label(g, '③ LR  6000 tours', { x: 16, y: 21, z: 0, color: '#50c878' });

  // ── Champ B résonant (arcs verts intenses) ───────
  const arcPts = [
    { h: 12, c: 0x20c890, op: 0.60 },
    { h: 17, c: 0x40d8a0, op: 0.45 },
    { h: 22, c: 0x60e0b0, op: 0.30 },
    { h: 27, c: 0x80f0c0, op: 0.18 },
    { h: 32, c: 0xa0ffd0, op: 0.10 },
  ];
  arcPts.forEach(({ h, c, op }) => {
    fieldArc(g, new THREE.Vector3(3, 6, 0), new THREE.Vector3(9, 6, 0),
      { height: h, color: c, opacity: op });
    fieldArc(g, new THREE.Vector3(3, 6, 0), new THREE.Vector3(9, 6, 0),
      { height: -h, color: c, opacity: op * 0.8 });
    fieldArc(g, new THREE.Vector3(6, 6, -7), new THREE.Vector3(6, 6, 7),
      { height: h, color: c, opacity: op * 0.6 });
  });

  // Glow au centre
  glowSphere(g, { r: 1.8, x: 6, y: 6, z: 0, color: 0x20ff90, emissive: 0x00ff80, emissiveIntensity: 2.5 });

  // ── C₂ (condensateur côté récepteur, même valeur) ─
  tube(g, new THREE.Vector3(23, 4.5, 0), new THREE.Vector3(29, 4.5, 0));
  buildCapacitor(g, { x: 32, y: 7, z: 0, color: 0xd070b0 });
  label(g, '⑤ C₂  accordé', { x: 32, y: 16, z: 0, color: '#d070b0' });

  // Fil C₂ → R₂
  tube(g, new THREE.Vector3(35, 4.5, 0), new THREE.Vector3(41, 4.5, 0));

  // ── R₂ ──────────────────────────────────────────
  buildResistor(g, { x: 44, y: 9, z: 0, rx: Math.PI / 2 });
  label(g, 'R₂', { x: 44, y: 15, z: 0, color: '#e05050', size: 180 });

  tube(g, new THREE.Vector3(47, 4.5, 0), new THREE.Vector3(54, 4.5, 0));

  // ── Oscilloscope ──────────────────────────────────
  buildOscillo(g, { x: 62, y: 7, z: 0 });
  label(g, '⑥ Oscilloscope — Vmax', { x: 62, y: 17, z: 0, color: '#f0d020', size: 380 });

  // ── Fil retour GND ──────────────────────────────
  tube(g,
    new THREE.Vector3(-45, 2.0, 0),
    new THREE.Vector3(54, 2.0, 0),
    { r: 0.25, color: 0x202020, opacity: 0.6 });

  // ── Flèche de résonance ─────────────────────────
  // Annotation visuelle : double-flèche entre les bobines avec f₀
  const rLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-4, -3, 0),
    new THREE.Vector3(16, -3, 0),
  ]);
  const rMesh = new THREE.Line(rLine,
    new THREE.LineBasicMaterial({ color: 0x20c890, opacity: 0.8, transparent: true }));
  g.add(rMesh);
  label(g, 'f₁ = f₂ = f₀  →  η_max', { x: 6, y: -8, z: 0, color: '#20c890', size: 400 });

  // ── LED charge ──────────────────────────────────
  buildLED(g, { x: 52, y: 4, z: -14, color: 0x00ff80 });
  tube(g, new THREE.Vector3(54, 4.5, 0), new THREE.Vector3(52, 4.5, -12), { r: 0.25, color: 0x606060 });

  return g;
}
