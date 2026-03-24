/**
 * main.js
 * Orchestrateur Three.js — Modélisation WPT unifiée
 * ABC2 · SG25 — École Centrale Casablanca — 2026
 *
 * Scène UNIQUE : émetteur + récepteur + champ magnétique animé.
 * Les deux circuits sont physiquement séparés (pas de fil entre eux).
 * L'énergie se transmet via le champ magnétique de L₁ (visible).
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWPTScene } from './modules/wpt_scene.js';

// ── DOM ────────────────────────────────────────────
const scene3d = document.getElementById('scene3d');
const canvas  = document.getElementById('canvas');

// ── Renderer ───────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(scene3d.clientWidth, scene3d.clientHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ── Scène ──────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f4fa);
scene.fog = new THREE.FogExp2(0xdce8f5, 0.0012);

// ── Caméra ─────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(
  45,
  scene3d.clientWidth / scene3d.clientHeight,
  0.1, 2000
);
camera.position.set(0, 55, 110);
camera.lookAt(0, 8, 0);

// ── OrbitControls ──────────────────────────────────
const controls = new OrbitControls(camera, canvas);
controls.target.set(0, 8, 0);
controls.enableDamping  = true;
controls.dampingFactor  = 0.07;
controls.minDistance    = 30;
controls.maxDistance    = 400;
controls.maxPolarAngle  = Math.PI * 0.88;
controls.update();

// ── Lumières ───────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 3.5));

const sun = new THREE.DirectionalLight(0xfff8f0, 3.5);
sun.position.set(80, 160, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near   = 1;
sun.shadow.camera.far    = 700;
sun.shadow.camera.left   = sun.shadow.camera.bottom = -130;
sun.shadow.camera.right  = sun.shadow.camera.top    =  130;
sun.shadow.bias = -0.001;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xd0e8ff, 1.6);
fill.position.set(-100, 60, -80);
scene.add(fill);

// Lumière bleue côté émetteur (courant alternatif)
const accentEmitter = new THREE.PointLight(0x4ab8e8, 1.4, 180);
accentEmitter.position.set(-40, 30, 40);
scene.add(accentEmitter);

// Lumière verte côté récepteur
const accentReceiver = new THREE.PointLight(0x20c860, 0.8, 150);
accentReceiver.position.set(50, 25, 40);
scene.add(accentReceiver);

// Lumière de champ au centre (zone de transfert)
const fieldLight = new THREE.PointLight(0x60c8ff, 0.5, 100);
fieldLight.position.set(0, 10, 0);
fieldLight.userData.baseIntensity = 0.5;
scene.add(fieldLight);

// LED feedback piloté par circuit.js
const ledLight = new THREE.PointLight(0x00ff88, 0, 80);
ledLight.position.set(57, 10, 0);
scene.add(ledLight);

// ── Sol + grille ───────────────────────────────────
const sol = new THREE.Mesh(
  new THREE.PlaneGeometry(1400, 1400),
  new THREE.MeshStandardMaterial({ color: 0xdce8f0, roughness: 1.0 })
);
sol.rotation.x = -Math.PI / 2;
sol.position.y = -1.8;
sol.receiveShadow = true;
scene.add(sol);

const grid = new THREE.GridHelper(700, 90, 0x9ab8d0, 0xc8dce8);
grid.position.y = -1.5;
scene.add(grid);

// ── Scène WPT unifiée ──────────────────────────────
const wptGroup = buildWPTScene();
scene.add(wptGroup);

const fieldRings = wptGroup.userData.fieldRings || [];
const NUM_RINGS  = wptGroup.userData.numRings   || 8;

// ── État ───────────────────────────────────────────
let wireOn  = false;
let autoRot = false;
let t       = 0;
window._fieldSpeed = 1.0;

// ── Contrôles UI ───────────────────────────────────
window.toggleWire = () => {
  wireOn = !wireOn;
  const btn = document.getElementById('btn-wire');
  if (btn) btn.classList.toggle('on', wireOn);
  scene.traverse(o => {
    if (o.isMesh && !o.userData.isLabel) o.material.wireframe = wireOn;
  });
};

window.toggleRot = () => {
  autoRot = !autoRot;
  const btn = document.getElementById('btn-rot');
  if (btn) btn.classList.toggle('on', autoRot);
  controls.autoRotate      = autoRot;
  controls.autoRotateSpeed = 0.8;
};

window.toggleField = () => {
  const btn = document.getElementById('btn-field');
  const vis = btn ? !btn.classList.contains('on') : true;
  if (btn) btn.classList.toggle('on', vis);
  fieldRings.forEach(r => { r.visible = vis; });
};

window.resetView = () => {
  camera.position.set(0, 55, 110);
  controls.target.set(0, 8, 0);
  controls.update();
};

// LED + champ pilotés par calculs panneau circuit
window.setLedState = (etaPct) => {
  const on = etaPct > 0.5;
  ledLight.intensity = on ? (1.2 + Math.min(etaPct / 25, 2.0)) : 0;
  fieldLight.intensity = 0.3 + Math.min(etaPct / 40, 1.2);
  fieldLight.userData.baseIntensity = fieldLight.intensity;
  // Vitesse anneaux proportionnelle à la fréquence réglée
  const fEl = document.getElementById('sl-f');
  if (fEl) window._fieldSpeed = 0.3 + parseFloat(fEl.value) / 5000;
};

// ── Resize ─────────────────────────────────────────
window.addEventListener('resize', () => {
  const w = scene3d.clientWidth;
  const h = scene3d.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
});

// ── Boucle de rendu ────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  t += 0.016;

  // Pulsation lumière émetteur (simule courant AC)
  accentEmitter.intensity = 1.0 + 0.4 * Math.sin(t * 6.28 * 2);

  // ── Animation des anneaux de champ magnétique ───
  // Chaque anneau voyage de L₁ (x=-20) jusqu'à L₂ (x=+20)
  const speed      = window._fieldSpeed;
  const travelLen  = 40;   // distance L₁→L₂

  fieldRings.forEach(ring => {
    const phase = ring.userData.phase;        // décalage 0..1
    const pos   = ((t * speed * 0.28 + phase) % 1.0);

    // Position X : de -20 à +20
    ring.position.x = -20 + pos * travelLen;

    // Le rayon croît légèrement en traversant l'espace
    ring.scale.setScalar(1 + pos * 0.45);

    // Opacité : monte, plateau, descend
    let op;
    if (pos < 0.12)      op = pos / 0.12;
    else if (pos < 0.75) op = 1.0 - (pos - 0.12) / 0.63 * 0.55;
    else                 op = 0.45 * (1 - (pos - 0.75) / 0.25);
    ring.material.opacity = Math.max(0, op) * 0.8;
    ring.material.emissiveIntensity = Math.max(0, op) * 1.8;
  });

  // Lueur centrale pulsante
  fieldLight.intensity = (fieldLight.userData.baseIntensity || 0.5)
    * (0.85 + 0.35 * Math.abs(Math.sin(t * 2.2)));

  // Labels face caméra
  scene.traverse(o => {
    if (o.userData.isLabel) o.quaternion.copy(camera.quaternion);
  });

  controls.update();
  renderer.render(scene, camera);
}

animate();
