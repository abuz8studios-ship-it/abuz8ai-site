/* ABUZ8 dawn field — cinematic 3D layer on the EXISTING homepage.
   Not a rewrite. Not a glow orb. Living gold/teal dust that breathes with scroll.
   Requires THREE on window. Honors prefers-reduced-motion. */
(function () {
  'use strict';

  var reduce = false;
  try {
    reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) {}
  if (reduce || !window.THREE) return;

  var canvasHost = document.getElementById('dawn-field');
  if (!canvasHost) return;

  var THREE = window.THREE;
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
  camera.position.set(0, 1.4, 22);

  var renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.setClearColor(0x000000, 0);
  canvasHost.appendChild(renderer.domElement);

  var group = new THREE.Group();
  scene.add(group);

  var COUNT = 900;
  var positions = new Float32Array(COUNT * 3);
  var colors = new Float32Array(COUNT * 3);
  var drift = new Float32Array(COUNT);
  var i;
  for (i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 64;
    positions[i * 3 + 1] = (Math.random() - 0.45) * 18;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
    drift[i] = 0.15 + Math.random() * 0.45;
    var gold = Math.random() > 0.38;
    if (gold) {
      colors[i * 3] = 0.79; colors[i * 3 + 1] = 0.66; colors[i * 3 + 2] = 0.30;
    } else {
      colors[i * 3] = 0.18; colors[i * 3 + 1] = 0.55; colors[i * 3 + 2] = 0.56;
    }
  }
  var geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  var pts = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.085,
    vertexColors: true,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  group.add(pts);

  var linePos = [];
  var ly;
  for (ly = -6; ly <= 6; ly += 3) {
    linePos.push(-28, ly, -8, 28, ly * 0.4, 6);
  }
  var lg = new THREE.BufferGeometry();
  lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
  group.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({
    color: 0xc9a84c,
    transparent: true,
    opacity: 0.12
  })));

  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (ev) {
    target.x = (ev.clientX / window.innerWidth) * 2 - 1;
    target.y = (ev.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  function size() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    camera.aspect = w / Math.max(1, h);
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  size();
  window.addEventListener('resize', size, { passive: true });

  var pos = geo.attributes.position;
  var t0 = performance.now();
  var alive = true;

  function frame(now) {
    if (!alive) return;
    requestAnimationFrame(frame);
    var t = (now - t0) * 0.001;
    var max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    var p = Math.min(1, Math.max(0, window.scrollY / max));
    document.documentElement.style.setProperty('--scroll', String(p));

    pointer.x += (target.x - pointer.x) * 0.04;
    pointer.y += (target.y - pointer.y) * 0.04;
    group.rotation.y = pointer.x * 0.18;
    group.rotation.x = -pointer.y * 0.08 + p * 0.22;
    camera.position.z = 22 - p * 9;
    camera.position.y = 1.4 + p * 3.2;
    camera.lookAt(0, p * 1.2, 0);

    var arr = pos.array;
    for (i = 0; i < COUNT; i++) {
      arr[i * 3 + 1] += Math.sin(t * drift[i] + i) * 0.004;
    }
    pos.needsUpdate = true;
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  window.addEventListener('pagehide', function () {
    alive = false;
    geo.dispose();
    lg.dispose();
    pts.material.dispose();
    renderer.dispose();
  });
})();
