/**
 * modules/resonators.js
 * Couplage inductif avec RÉSONATEURS intermédiaires
 *
 * Des bobines résonantes identiques placées entre l'émetteur et le récepteur
 * canalisent le flux magnétique et augmentent la portée de 2–4× le diamètre
 * des bobines (> 10 cm).
 *
 *   GBF ─── LT ···B··· [RESON. 1] ···B··· [RESON. 2] ···B··· LR ─── Oscillo
 */

import * as THREE from "three";
import {
  box,
  cyl,
  coil,
  tube,
  fieldArc,
  buildGBF,
  buildOscillo,
  buildCapacitor,
  buildResistor,
  buildLED,
  label,
  glowSphere,
  mat,
} from "../helpers.js";

export function buildResonators() {
  const g = new THREE.Group();

  // ── Socle ────────────────────────────────────────
  box(g, {
    w: 160,
    h: 0.8,
    d: 55,
    y: -1,
    color: 0x10141e,
    roughness: 0.9,
    metalness: 0.05,
  });

  // ── GBF ─────────────────────────────────────────
  buildGBF(g, { x: -68, y: 5, z: 0, color0: 0xff8020 });
  label(g, "① GBF", { x: -68, y: 14, z: 0, color: "#f4a030", size: 200 });
  tube(g, new THREE.Vector3(-61, 4.5, 0), new THREE.Vector3(-52, 4.5, 0));

  // ── Résistance ───────────────────────────────────
  buildResistor(g, { x: -48, y: 9, z: 0, rx: Math.PI / 2 });
  tube(g, new THREE.Vector3(-44, 4.5, 0), new THREE.Vector3(-36, 4.5, 0));

  // ── Bobine émettrice LT ──────────────────────────
  coil(g, {
    R: 6,
    r: 0.5,
    H: 10,
    N: 20,
    x: -30,
    y: 6,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    color: 0xd48820,
    emissive: 0x704800,
    emissiveIntensity: 0.3,
  });
  label(g, "② LT", { x: -30, y: 19, z: 0, color: "#4ab8e8", size: 200 });

  // ── Résonateur 1 ─────────────────────────────────
  coil(g, {
    R: 6,
    r: 0.5,
    H: 10,
    N: 20,
    x: -8,
    y: 6,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    color: 0xe07010,
    emissive: 0xb05008,
    emissiveIntensity: 0.55,
  });
  buildCapacitor(g, { x: -8, y: 2, z: -12, color: 0xffaa44 });
  // Fil C ↔ résonateur 1
  tube(g, new THREE.Vector3(-8, 4, -10), new THREE.Vector3(-8, 4, -7), {
    r: 0.25,
    color: 0x888888,
  });
  label(g, "③ Résonateur 1", {
    x: -8,
    y: 19,
    z: 0,
    color: "#ffaa44",
    size: 320,
  });

  // ── Résonateur 2 ─────────────────────────────────
  coil(g, {
    R: 6,
    r: 0.5,
    H: 10,
    N: 20,
    x: 14,
    y: 6,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    color: 0xe04010,
    emissive: 0xb02804,
    emissiveIntensity: 0.55,
  });
  buildCapacitor(g, { x: 14, y: 2, z: -12, color: 0xff6644 });
  tube(g, new THREE.Vector3(14, 4, -10), new THREE.Vector3(14, 4, -7), {
    r: 0.25,
    color: 0x888888,
  });
  label(g, "④ Résonateur 2", {
    x: 14,
    y: 19,
    z: 0,
    color: "#ff6644",
    size: 320,
  });

  // ── Bobine réceptrice LR ─────────────────────────
  coil(g, {
    R: 6,
    r: 0.5,
    H: 10,
    N: 20,
    x: 36,
    y: 6,
    z: 0,
    rx: 0,
    ry: 0,
    rz: 0,
    color: 0x30c060,
    emissive: 0x008030,
    emissiveIntensity: 0.3,
  });
  label(g, "⑤ LR", { x: 36, y: 19, z: 0, color: "#50c878", size: 200 });

  // ── Arcs de champ magnétique guidé ──────────────
  // Segment 1 : LT → Résonateur 1
  const seg1From = new THREE.Vector3(-24, 6, 0);
  const seg1To = new THREE.Vector3(-14, 6, 0);
  // Segment 2 : Résonateur 1 → Résonateur 2
  const seg2From = new THREE.Vector3(-2, 6, 0);
  const seg2To = new THREE.Vector3(8, 6, 0);
  // Segment 3 : Résonateur 2 → LR
  const seg3From = new THREE.Vector3(20, 6, 0);
  const seg3To = new THREE.Vector3(30, 6, 0);

  const segs = [
    { from: seg1From, to: seg1To, color: 0xffaa44, baseOp: 0.65 },
    { from: seg2From, to: seg2To, color: 0xff7722, baseOp: 0.65 },
    { from: seg3From, to: seg3To, color: 0x50c878, baseOp: 0.6 },
  ];

  segs.forEach(({ from, to, color, baseOp }) => {
    [6, 10, 14].forEach((h, i) => {
      fieldArc(g, from, to, { height: h, color, opacity: baseOp - i * 0.15 });
      fieldArc(g, from, to, {
        height: -h,
        color,
        opacity: (baseOp - i * 0.15) * 0.7,
      });
    });
  });

  // Points de couplage glow
  [
    [-16, "#ffaa44"],
    [6, "#ff6644"],
    [33, "#50c878"],
  ].forEach(([px, hexC]) => {
    glowSphere(g, {
      r: 1.0,
      x: px,
      y: 6,
      z: 0,
      color: new THREE.Color(hexC).getHex(),
      emissive: new THREE.Color(hexC).getHex(),
      emissiveIntensity: 1.5,
    });
  });

  // ── Fil retour GND ──────────────────────────────
  tube(g, new THREE.Vector3(-61, 2, 0), new THREE.Vector3(52, 2, 0), {
    r: 0.25,
    color: 0x202020,
    opacity: 0.6,
  });

  // ── Sortie LR → Oscillo ─────────────────────────
  tube(g, new THREE.Vector3(42, 4.5, 0), new THREE.Vector3(50, 4.5, 0));
  buildOscillo(g, { x: 58, y: 7, z: 0 });
  label(g, "⑥ Oscilloscope", {
    x: 58,
    y: 17,
    z: 0,
    color: "#f0d020",
    size: 310,
  });

  // ── LED charge ──────────────────────────────────
  buildLED(g, { x: 55, y: 4, z: -14, color: 0x00ff80 });
  tube(g, new THREE.Vector3(50, 4.5, 0), new THREE.Vector3(55, 4.5, -12), {
    r: 0.25,
    color: 0x606060,
  });

  // ── Annotation portée ───────────────────────────
  const portLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-30, -4, 0),
    new THREE.Vector3(36, -4, 0),
  ]);
  g.add(
    new THREE.Line(
      portLine,
      new THREE.LineBasicMaterial({
        color: 0xffaa44,
        opacity: 0.7,
        transparent: true,
      }),
    ),
  );
  label(g, "↔ Portée : > 4× diam. bobine", {
    x: 3,
    y: -10,
    z: 0,
    color: "#ffaa44",
    size: 440,
  });

  return g;
}
