/**
 * helpers.js
 * Primitives Three.js réutilisables pour la modélisation WPT.
 * 1 unit = 1 cm.
 */

import * as THREE from "three";

// ── Matériau standard ──────────────────────────────
export function mat(
  color,
  {
    roughness = 0.6,
    metalness = 0.2,
    opacity = 1,
    emissive = 0x000000,
    emissiveIntensity = 0,
  } = {},
) {
  const transp = opacity < 0.99;
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    opacity,
    transparent: transp,
    emissive,
    emissiveIntensity,
    side: transp ? THREE.DoubleSide : THREE.FrontSide,
  });
}

// ── Box ────────────────────────────────────────────
export function box(
  parent,
  {
    w = 1,
    h = 1,
    d = 1,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    color = 0xffffff,
    roughness = 0.6,
    metalness = 0.2,
    opacity = 1,
    emissive = 0x000000,
    emissiveIntensity = 0,
    castShadow = true,
    receiveShadow = true,
  } = {},
) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    mat(color, { roughness, metalness, opacity, emissive, emissiveIntensity }),
  );
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = castShadow;
  m.receiveShadow = receiveShadow;
  parent.add(m);
  return m;
}

// ── Cylinder ───────────────────────────────────────
export function cyl(
  parent,
  {
    r = 1,
    rTop,
    rBot,
    h = 1,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    color = 0xffffff,
    roughness = 0.5,
    metalness = 0.2,
    opacity = 1,
    emissive = 0x000000,
    emissiveIntensity = 0,
    segments = 32,
    castShadow = true,
  } = {},
) {
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop ?? r, rBot ?? r, h, segments),
    mat(color, { roughness, metalness, opacity, emissive, emissiveIntensity }),
  );
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = castShadow;
  parent.add(m);
  return m;
}

// ── Torus ──────────────────────────────────────────
export function torus(
  parent,
  {
    R = 5,
    r = 0.5,
    x = 0,
    y = 0,
    z = 0,
    rx = 0,
    ry = 0,
    rz = 0,
    color = 0xffffff,
    roughness = 0.4,
    metalness = 0.6,
    opacity = 1,
    emissive = 0x000000,
    emissiveIntensity = 0,
    tubeSegments = 32,
    radialSegments = 16,
  } = {},
) {
  const m = new THREE.Mesh(
    new THREE.TorusGeometry(R, r, radialSegments, tubeSegments),
    mat(color, { roughness, metalness, opacity, emissive, emissiveIntensity }),
  );
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

/**
 * Bobine solénoïde cylindrique — représentation hélicoïdale réaliste.
 * Le fil de cuivre/émeraude forme une vraie hélice (TubeGeometry)
 * enroulée autour d'un cylindre creux semi-transparent.
 *   R  : rayon de l'hélice  (cm)
 *   r  : rayon du fil        (cm)
 *   H  : hauteur totale      (cm)
 *   N  : nombre de spires
 * userData.isCoil = true  → tourné automatiquement dans la boucle d'animation.
 * Returns a Group.
 */
export function coil(
  parent,
  {
    R = 8,
    r = 0.5,
    H = 12,
    N = 18,
    x = 0,
    y = 0,
    z = 0,
    rx = Math.PI / 2,
    ry = 0,
    rz = 0,
    color = 0xd48020,
    roughness = 0.3,
    metalness = 0.9,
    emissive = 0x000000,
    emissiveIntensity = 0,
  } = {},
) {
  const g = new THREE.Group();

  // ── Hélice : N spires sur hauteur H ──────────────
  // On génère SEGS+1 points réguliers sur l'hélice paramétrée
  const SEGS = N * 36;          // résolution (36 pts / spire = beau rendu)
  const helixPts = [];
  for (let i = 0; i <= SEGS; i++) {
    const t     = i / SEGS;
    const angle = t * N * Math.PI * 2;
    helixPts.push(new THREE.Vector3(
      R * Math.cos(angle),       // X
      t * H - H / 2,            // Y  (montée de -H/2 à +H/2)
      R * Math.sin(angle),       // Z
    ));
  }
  const curve = new THREE.CatmullRomCurve3(helixPts, false, 'chordal');
  const helixGeo = new THREE.TubeGeometry(curve, SEGS, r, 8, false);
  const wire = new THREE.Mesh(
    helixGeo,
    mat(color, { roughness, metalness, emissive, emissiveIntensity }),
  );
  wire.castShadow  = true;
  wire.receiveShadow = false;
  g.add(wire);

  // ── Cylindre creux semi-transparent (support visuel) ──
  const innerR = R * 0.88;
  const tubeGeo = new THREE.CylinderGeometry(innerR, innerR, H * 0.97, 40, 1, true);
  const tubeMesh = new THREE.Mesh(
    tubeGeo,
    mat(0x1e2c3e, { roughness: 0.85, metalness: 0.0, opacity: 0.22 }),
  );
  g.add(tubeMesh);

  // ── Disques bouchons (donner l'impression de cylindre creux) ──
  const diskMat = mat(0x222e40, { roughness: 0.9, metalness: 0.0, opacity: 0.30 });
  for (const yEnd of [-H / 2, H / 2]) {
    const disk = new THREE.Mesh(
      new THREE.RingGeometry(innerR * 0.0, innerR, 32),
      diskMat,
    );
    disk.position.y = yEnd;
    disk.rotation.x = Math.PI / 2;
    g.add(disk);
  }

  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  g.userData.isCoil = true;   // ← marqueur pour l'animation de rotation

  parent.add(g);
  return g;
}

/**
 * Tube (wire) entre deux points.
 * Returns a Mesh.
 */
export function tube(
  parent,
  from,
  to,
  {
    r = 0.4,
    color = 0x90a0b0,
    roughness = 0.5,
    metalness = 0.5,
    opacity = 1,
    segments = 8,
    radial = 6,
  } = {},
) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const m = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, len, radial),
    mat(color, { roughness, metalness, opacity }),
  );
  m.position.copy(mid);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  m.castShadow = true;
  parent.add(m);
  return m;
}

/**
 * Arc field line (demi-ellipse) between two points.
 * Returns a Line.
 */
export function fieldArc(
  parent,
  from,
  to,
  { height = 10, segments = 40, color = 0x4ab8e8, opacity = 0.55 } = {},
) {
  const pts = [];
  const mid = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = Math.PI * t; // 0 → π
    const x = from.x + (to.x - from.x) * t;
    const y = mid.y + height * Math.sin(angle);
    const z = from.z + (to.z - from.z) * t;
    pts.push(new THREE.Vector3(x, y, z));
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color, opacity, transparent: opacity < 1 }),
  );
  parent.add(line);
  return line;
}

/**
 * Glowing sphere (indicator dot).
 */
export function glowSphere(
  parent,
  {
    r = 1,
    x = 0,
    y = 0,
    z = 0,
    color = 0x00d4ff,
    emissive = 0x00d4ff,
    emissiveIntensity = 1.2,
  } = {},
) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 16),
    mat(color, { roughness: 0.1, metalness: 0, emissive, emissiveIntensity }),
  );
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

/**
 * Edges wireframe overlay sur un mesh existant.
 */
export function edges(parent, mesh, { color = 0x4ab8e8, opacity = 0.4 } = {}) {
  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color, opacity, transparent: opacity < 1 }),
  );
  line.position.copy(mesh.position);
  line.rotation.copy(mesh.rotation);
  parent.add(line);
  return line;
}

/**
 * 2D canvas label, toujours face caméra (billboard).
 */
export function label(
  parent,
  text,
  {
    x = 0,
    y = 0,
    z = 0,
    color = "#4ab8e8",
    bg = "rgba(4,12,28,0.88)",
    size = 320,
  } = {},
) {
  return null; // labels masqués
  const cvs = document.createElement("canvas");
  cvs.width = size;
  cvs.height = Math.round(size * 0.22);
  const ctx = cvs.getContext("2d");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(3, 3, cvs.width - 6, cvs.height - 6, 7);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.round(cvs.height * 0.5)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cvs.width / 2, cvs.height / 2);

  const tex = new THREE.CanvasTexture(cvs);
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 0.25, cvs.height * 0.25),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
    }),
  );
  m.position.set(x, y, z);
  m.userData.isLabel = true;
  parent.add(m);
  return m;
}

/**
 * GBF (Générateur Basse Fréquence) — boîtier avec écran.
 */
export function buildGBF(
  parent,
  { x = 0, y = 0, z = 0, color0 = 0xf4a030 } = {},
) {
  const g = new THREE.Group();
  // Corps
  box(g, {
    w: 14,
    h: 8,
    d: 8,
    color: 0x1a2535,
    roughness: 0.5,
    metalness: 0.6,
  });
  // Écran LCD
  box(g, {
    w: 8,
    h: 4.5,
    d: 0.3,
    x: 0,
    y: 0.5,
    z: 4.05,
    color: 0x003010,
    roughness: 0.2,
    metalness: 0,
    emissive: 0x00ff88,
    emissiveIntensity: 0.6,
  });
  // Boutons
  for (let i = -2; i <= 2; i++) {
    cyl(g, {
      r: 0.7,
      h: 0.5,
      x: i * 2.2,
      y: -2.5,
      z: 4.0,
      rx: Math.PI / 2,
      color: color0,
      roughness: 0.5,
      metalness: 0.4,
      emissive: color0,
      emissiveIntensity: 0.3,
    });
  }
  // Borne +/-
  cyl(g, {
    r: 0.5,
    h: 1.5,
    x: -5.5,
    y: -1.5,
    z: 4.0,
    rx: Math.PI / 2,
    color: 0xff4040,
  });
  cyl(g, {
    r: 0.5,
    h: 1.5,
    x: -3.8,
    y: -1.5,
    z: 4.0,
    rx: Math.PI / 2,
    color: 0x4040ff,
  });

  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Oscilloscope — boîtier avec écran vert.
 */
export function buildOscillo(parent, { x = 0, y = 0, z = 0 } = {}) {
  const g = new THREE.Group();
  box(g, {
    w: 16,
    h: 12,
    d: 9,
    color: 0x1a1a2a,
    roughness: 0.5,
    metalness: 0.5,
  });
  // Écran avec sinusoïde émissive
  box(g, {
    w: 10,
    h: 7,
    d: 0.4,
    x: 0,
    y: 1,
    z: 4.55,
    color: 0x001a04,
    emissive: 0x00ff44,
    emissiveIntensity: 0.55,
    roughness: 0.1,
  });
  // Boutons côté
  for (let i = 0; i < 4; i++) {
    box(g, {
      w: 1.4,
      h: 1.4,
      d: 0.5,
      x: 6.2,
      y: 2 - i * 2.5,
      z: 3.0,
      color: 0x888898,
      roughness: 0.4,
      metalness: 0.7,
    });
  }
  // Bornes entrée
  cyl(g, {
    r: 0.4,
    h: 1,
    x: -3,
    y: -4.5,
    z: 4.55,
    rx: Math.PI / 2,
    color: 0xf0d020,
  });
  cyl(g, {
    r: 0.4,
    h: 1,
    x: 3,
    y: -4.5,
    z: 4.55,
    rx: Math.PI / 2,
    color: 0xf0d020,
  });

  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Condensateur cylindrique ajustable.
 */
export function buildCapacitor(
  parent,
  { x = 0, y = 0, z = 0, color = 0xb070e0 } = {},
) {
  const g = new THREE.Group();
  cyl(g, { r: 2, h: 5, color: 0x1a1a30, roughness: 0.6, metalness: 0.3 });
  cyl(g, {
    r: 2.05,
    h: 4.5,
    color,
    roughness: 0.35,
    metalness: 0.55,
    opacity: 0.7,
  });
  // Bornes
  cyl(g, {
    r: 0.35,
    h: 1.5,
    y: 3.2,
    color: 0xc0c0cc,
    roughness: 0.3,
    metalness: 0.9,
  });
  cyl(g, {
    r: 0.35,
    h: 1.5,
    y: -3.2,
    color: 0xc0c0cc,
    roughness: 0.3,
    metalness: 0.9,
  });
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Résistance.
 */
export function buildResistor(
  parent,
  { x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0 } = {},
) {
  const g = new THREE.Group();
  cyl(g, { r: 0.9, h: 5, color: 0xc08030, roughness: 0.7, metalness: 0.1 });
  // Bandes couleur
  for (let i = -1; i <= 1; i++) {
    cyl(g, {
      r: 0.96,
      h: 0.6,
      y: i * 1.3,
      color: [0xff4444, 0x4444ff, 0xffff44][i + 1],
      roughness: 0.5,
      metalness: 0,
    });
  }
  // Fils
  cyl(g, {
    r: 0.25,
    h: 2.5,
    y: 3.7,
    color: 0xd0d0d0,
    roughness: 0.3,
    metalness: 0.9,
  });
  cyl(g, {
    r: 0.25,
    h: 2.5,
    y: -3.7,
    color: 0xd0d0d0,
    roughness: 0.3,
    metalness: 0.9,
  });
  g.position.set(x, y, z);
  g.rotation.set(rx, ry, rz);
  parent.add(g);
  return g;
}

/**
 * LED (charge réceptrice).
 */
export function buildLED(
  parent,
  { x = 0, y = 0, z = 0, color = 0x00aaff } = {},
) {
  const g = new THREE.Group();
  cyl(g, {
    r: 1.2,
    rTop: 1.2,
    rBot: 1.2,
    h: 2.0,
    color: 0x303030,
    roughness: 0.5,
    metalness: 0.3,
  });
  // Dôme glow
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1.2, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(color, {
      roughness: 0.05,
      metalness: 0,
      opacity: 0.85,
      emissive: color,
      emissiveIntensity: 1.5,
    }),
  );
  dome.position.y = 1.0;
  g.add(dome);
  // Fils
  cyl(g, {
    r: 0.18,
    h: 3,
    y: -2.5,
    color: 0xd0d0d0,
    metalness: 0.9,
    roughness: 0.2,
  });
  cyl(g, {
    r: 0.18,
    h: 3,
    x: 0.8,
    y: -2.5,
    color: 0xd0d0d0,
    metalness: 0.9,
    roughness: 0.2,
  });
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * Pont de diodes (4 diodes en pont).
 */
export function buildBridge(parent, { x = 0, y = 0, z = 0 } = {}) {
  const g = new THREE.Group();
  // PCB
  box(g, {
    w: 8,
    h: 0.5,
    d: 8,
    color: 0x1a3a1a,
    roughness: 0.8,
    metalness: 0.1,
  });
  // 4 diodes
  const positions = [
    [-2, 0, -2],
    [2, 0, -2],
    [-2, 0, 2],
    [2, 0, 2],
  ];
  positions.forEach(([dx, dy, dz]) => {
    cyl(g, {
      r: 0.7,
      h: 3,
      x: dx,
      y: 1.3,
      z: dz,
      rx: Math.PI / 2,
      color: 0x1a1a1a,
      roughness: 0.6,
      metalness: 0.3,
    });
    // Anneau marque
    cyl(g, {
      r: 0.75,
      h: 0.4,
      x: dx,
      y: 1.3,
      z: dz + 1,
      rx: Math.PI / 2,
      color: 0xffffff,
      roughness: 0.5,
      metalness: 0,
    });
  });
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

/**
 * PCB / plaque de circuit imprimé.
 */
export function buildPCB(parent, { w = 30, d = 10, x = 0, y = 0, z = 0 } = {}) {
  const g = new THREE.Group();
  box(g, { w, h: 0.5, d, color: 0x1a3a1a, roughness: 0.85, metalness: 0.1 });
  // Traces cuivre
  for (let i = 0; i < 4; i++) {
    box(g, {
      w: w * 0.85,
      h: 0.15,
      d: 0.4,
      x: 0,
      y: 0.32,
      z: -d / 2 + 1.5 + i * 2.2,
      color: 0xd4a020,
      roughness: 0.3,
      metalness: 0.8,
    });
  }
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}
