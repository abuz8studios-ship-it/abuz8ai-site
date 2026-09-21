/* ABUZ8 golden-hour atmosphere — light, pollen, mist, shafts.
   Sits under the existing grove canvas. Same palette. No orbs. No mesh.
   Reduced-motion: film stills, no drift. */
(function () {
  'use strict';
  var host = document.getElementById('olive-grove');
  if (!host || !window.THREE) return;

  var THREE = window.THREE;
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  var scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a1628, 10, 46);

  var camera = new THREE.PerspectiveCamera(40, 1, 0.1, 140);
  camera.position.set(0, 4.2, 26);

  var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  /* Golden-hour light rig: warm key low in the west, cool sky fill, warm bounce. */
  scene.add(new THREE.HemisphereLight(0x9ab4cc, 0x2a2b1a, 0.7));
  var sun = new THREE.DirectionalLight(0xf2cf7e, 0.85);
  sun.position.set(-14, 7, 8);
  scene.add(sun);
  var bounce = new THREE.DirectionalLight(0xc9a84c, 0.22);
  bounce.position.set(6, 2, 12);
  scene.add(bounce);

  var mobile = Math.min(window.innerWidth, window.innerHeight) < 640;

  /* Pollen + fireflies: one cloud, gold majority, teal minority. */
  var COUNT = reduce ? 0 : (mobile ? 120 : 300);
  var motes = null;
  var moteSeed = null;
  if (COUNT > 0) {
    var pos = new Float32Array(COUNT * 3);
    var col = new Float32Array(COUNT * 3);
    moteSeed = new Float32Array(COUNT * 2);
    for (var i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 56;
      pos[i * 3 + 1] = Math.random() * 11 + 0.3;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 44 - 2;
      var gold = Math.random() > 0.24;
      if (gold) { col[i * 3] = 0.95; col[i * 3 + 1] = 0.82; col[i * 3 + 2] = 0.49; }
      else { col[i * 3] = 0.18; col[i * 3 + 1] = 0.75; col[i * 3 + 2] = 0.56; }
      moteSeed[i * 2] = Math.random() * Math.PI * 2;
      moteSeed[i * 2 + 1] = 0.2 + Math.random() * 0.8;
    }
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    motes = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.09, vertexColors: true, transparent: true, opacity: 0.7,
      depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true
    }));
    scene.add(motes);
  }

  /* Ground mist: 3 wide soft planes, additive, barely there. */
  var mists = [];
  if (!reduce) {
    var mistMat = new THREE.MeshBasicMaterial({
      color: 0x9ab4cc, transparent: true, opacity: 0.05,
      depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    for (var m = 0; m < 3; m++) {
      var plane = new THREE.Mesh(new THREE.PlaneGeometry(60, 7), mistMat.clone());
      plane.material.opacity = 0.04 + m * 0.008;
      plane.rotation.x = -Math.PI / 2;
      plane.position.set((m - 1) * 9, 0.35 + m * 0.28, -4 - m * 7);
      scene.add(plane);
      mists.push({ mesh: plane, phase: m * 2.1 });
    }
  }

  /* Light shafts: 2 slanted planes from the sun side, additive, faint. */
  var shafts = [];
  if (!reduce) {
    for (var s = 0; s < 2; s++) {
      var shaft = new THREE.Mesh(
        new THREE.PlaneGeometry(7 + s * 4, 26),
        new THREE.MeshBasicMaterial({
          color: 0xf2cf7e, transparent: true, opacity: 0.035 - s * 0.008,
          depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
        })
      );
      shaft.position.set(-11 + s * 7, 7, -6 - s * 4);
      shaft.rotation.set(0.12, 0.3, 0.5);
      scene.add(shaft);
      shafts.push({ mesh: shaft, phase: s * 1.7 });
    }
  }

  /* Five-act scroll dolly: wide → push → low → rise → release to boards. */
  var ACTS = [
    { z: 26, y: 4.2, lookY: 2.4, lookZ: -2 },   // 1 wide establishing
    { z: 20, y: 3.6, lookY: 2.2, lookZ: -3 },   // 2 push into the rows
    { z: 14, y: 2.4, lookY: 2.6, lookZ: -4 },   // 3 low hero angle
    { z: 9,  y: 3.4, lookY: 2.0, lookZ: -7 },   // 4 rise over crowns
    { z: 5,  y: 4.6, lookY: 1.6, lookZ: -11 }   // 5 release to the boards
  ];

  var aim = { x: 0, y: 0 };
  var ptr = { x: 0, y: 0 };
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

  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  var alive = true;
  var t0 = performance.now();

  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    var sec = (now - t0) * 0.001;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, window.scrollY / max));

    ptr.x += (aim.x - ptr.x) * 0.04;
    ptr.y += (aim.y - ptr.y) * 0.04;

    if (!reduce && motes) {
      var arr = motes.geometry.attributes.position.array;
      for (var i = 0; i < COUNT; i++) {
        var ph = moteSeed[i * 2];
        var sp = moteSeed[i * 2 + 1];
        arr[i * 3] += Math.sin(sec * 0.4 * sp + ph) * 0.0022;
        arr[i * 3 + 1] += Math.cos(sec * 0.3 * sp + ph) * 0.0016;
      }
      motes.geometry.attributes.position.needsUpdate = true;
    }
    if (!reduce) {
      for (var m = 0; m < mists.length; m++) {
        mists[m].mesh.position.x += Math.sin(sec * 0.12 + mists[m].phase) * 0.002;
      }
      for (var s = 0; s < shafts.length; s++) {
        shafts[s].mesh.material.opacity = (s === 0 ? 0.035 : 0.027) + Math.sin(sec * 0.2 + shafts[s].phase) * 0.006;
      }
    }

    var seg = Math.min(ACTS.length - 2, Math.floor(p * (ACTS.length - 1)));
    var local = smooth(p * (ACTS.length - 1) - seg);
    var A = ACTS[seg], B = ACTS[seg + 1];
    var camZ = reduce ? 20 : lerp(A.z, B.z, local);
    var camY = lerp(A.y, B.y, local);
    var lookY = lerp(A.lookY, B.lookY, local);
    var lookZ = lerp(A.lookZ, B.lookZ, local);
    camera.position.set(ptr.x * 1.2, camY - ptr.y * 0.4, camZ);
    camera.lookAt(ptr.x * 0.7, lookY, lookZ);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('pagehide', function () {
    alive = false;
    renderer.dispose();
  });
})();
