/* Living olive grove — cinematic 3D under the EXISTING homepage.
   All the trees stay. Wind, silver leaf-flash, scroll walk into the grove.
   Requires window.THREE. Reduced-motion: still grove, no wind/dolly. */
(function () {
  'use strict';
  var host = document.getElementById('olive-grove');
  if (!host || !window.THREE) return;

  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var THREE = window.THREE;
  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1628, 14, 52);

  var camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, 3.4, 20);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x8aa8c8, 0x1a2418, 0.85));
  var sun = new THREE.DirectionalLight(0xe8d48b, 0.55);
  sun.position.set(-8, 14, 6);
  scene.add(sun);

  var trunkMat = new THREE.MeshLambertMaterial({ color: 0x4a3828 });
  var barkMat = new THREE.MeshLambertMaterial({ color: 0x2e241c });
  var leafDark = new THREE.MeshLambertMaterial({ color: 0x3d4f28 });
  var leafLite = new THREE.MeshLambertMaterial({ color: 0x7a8c4a });
  var leafSilver = new THREE.MeshLambertMaterial({ color: 0x9aaa78 });
  var oliveMat = new THREE.MeshLambertMaterial({ color: 0x3a3420 });
  var groundMat = new THREE.MeshLambertMaterial({ color: 0x121c16 });

  var ground = new THREE.Mesh(new THREE.CircleGeometry(48, 48), groundMat);
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  function seeded(n) {
    var x = Math.sin(n * 127.1) * 43758.5453;
    return x - Math.floor(x);
  }

  function makeTree(seed) {
    var g = new THREE.Group();
    var h = 2.1 + seeded(seed) * 1.1;
    var lean = (seeded(seed + 1) - 0.5) * 0.18;
    var trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.2, h, 7), trunkMat);
    trunk.position.y = h / 2;
    trunk.rotation.z = lean;
    g.add(trunk);
    var fork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, h * 0.55, 6), barkMat);
    fork.position.set(0.18, h * 0.72, 0.04);
    fork.rotation.z = -0.45 + lean;
    g.add(fork);

    var crown = new THREE.Group();
    crown.position.y = h * 0.95;
    var s1 = 1.15 + seeded(seed + 2) * 0.45;
    crown.add(meshEllipsoid(s1 * 1.35, s1 * 0.85, s1 * 1.2, leafDark, 0, 0.15, 0));
    crown.add(meshEllipsoid(s1 * 1.05, s1 * 0.7, s1 * 0.95, leafLite, 0.35, 0.35, 0.2));
    crown.add(meshEllipsoid(s1 * 0.9, s1 * 0.55, s1 * 0.85, leafSilver, -0.4, 0.25, -0.15));
    var oi;
    for (oi = 0; oi < 9; oi++) {
      var olive = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 6), oliveMat);
      var a = (oi / 9) * Math.PI * 2 + seed;
      olive.position.set(Math.cos(a) * s1 * 0.7, 0.05 + seeded(seed + oi) * 0.4, Math.sin(a) * s1 * 0.55);
      crown.add(olive);
    }
    g.add(crown);
    g.userData.crown = crown;
    g.userData.phase = seeded(seed + 9) * Math.PI * 2;
    return g;
  }

  function meshEllipsoid(sx, sy, sz, mat, x, y, z) {
    var m = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    return m;
  }

  var grove = new THREE.Group();
  scene.add(grove);

  /* Full grove — keep every tree. Staggered orchard rows. */
  var spots = [
    [-10, -2], [-6.5, -4], [-3, -1.5], [0.4, -3.2], [4.2, -2], [8.1, -4.4], [11.5, -1.2],
    [-12, 3.2], [-7.8, 2.4], [-4.1, 4.6], [-0.6, 2.1], [3.3, 4.0], [7.0, 2.8], [10.8, 4.8],
    [-9.2, 7.5], [-5.0, 8.2], [-1.2, 7.0], [2.6, 8.6], [6.4, 7.2], [9.8, 8.8],
    [-8.0, 11.5], [-3.4, 12.2], [1.5, 11.2], [5.8, 12.6]
  ];
  var trees = [];
  var t;
  for (t = 0; t < spots.length; t++) {
    var tree = makeTree(t + 1);
    tree.position.set(spots[t][0], 0, spots[t][1]);
    tree.rotation.y = seeded(t + 20) * Math.PI * 2;
    var sc = 0.85 + seeded(t + 30) * 0.45;
    tree.scale.setScalar(sc);
    grove.add(tree);
    trees.push(tree);
  }

  var pointer = { x: 0, y: 0 };
  var aim = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (ev) {
    aim.x = (ev.clientX / window.innerWidth) * 2 - 1;
    aim.y = (ev.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function size() {
    var w = window.innerWidth, h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  size();
  window.addEventListener('resize', size, { passive: true });

  var alive = true;
  var t0 = performance.now();

  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    var sec = (now - t0) * 0.001;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    document.documentElement.style.setProperty('--scroll', String(p));

    pointer.x += (aim.x - pointer.x) * 0.045;
    pointer.y += (aim.y - pointer.y) * 0.045;

    if (!reduce) {
      var i;
      for (i = 0; i < trees.length; i++) {
        var cr = trees[i].userData.crown;
        var ph = trees[i].userData.phase;
        cr.rotation.z = Math.sin(sec * 0.7 + ph) * 0.045;
        cr.rotation.x = Math.sin(sec * 0.45 + ph) * 0.02;
      }
    }

    var camZ = reduce ? 18 : 20 - p * 14;
    var camY = 3.4 + p * 1.6;
    var camX = pointer.x * 1.4;
    camera.position.set(camX, camY, camZ);
    camera.lookAt(pointer.x * 0.8, 2.2 + p * 0.6, -2 - p * 8);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('pagehide', function () {
    alive = false;
    renderer.dispose();
  });
})();
