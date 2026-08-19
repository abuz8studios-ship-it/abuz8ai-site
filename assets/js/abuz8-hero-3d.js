/* ============================================================
   ABUZ8 3D Hero — Three.js Interactive Hero Animation
   v1.0 · 2026-08-12
   Animated 3D scene with particles and rotating AI sphere
   Usage: <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
          <script src="/assets/js/abuz8-hero-3d.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  if (!window.THREE) {
    console.warn('Three.js not found. Skipping 3D hero.');
    return;
  }

  const container = document.getElementById('hero-3d-canvas');
  if (!container) return;

  let scene, camera, renderer, particles, sphere;
  const clock = new THREE.Clock();

  function init() {
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a1628);
    scene.fog = new THREE.Fog(0x0a1628, 100, 500);

    // Camera
    const width = container.clientWidth;
    const height = container.clientHeight;
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 30;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);

    // Create 3D elements
    createParticles();
    createSphere();
    addLighting();

    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);

    // Start animation loop
    animate();
  }

  function createParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    // Color palette: gold (#C8A55C), green (#00D084), blue (#0a90e8)
    const colorPalette = [
      { r: 0.78, g: 0.65, b: 0.36 }, // gold
      { r: 0.0, g: 0.816, b: 0.52 }, // green
      { r: 0.04, g: 0.565, b: 0.91 } // blue
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.6
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function createSphere() {
    const geometry = new THREE.IcosahedronGeometry(8, 4);

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Gradient background
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 256);
    gradient.addColorStop(0, '#C8A55C');
    gradient.addColorStop(0.5, '#00D084');
    gradient.addColorStop(1, '#0a90e8');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // Add circuit pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(256, 256, 80 + i * 40, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Add "AI" text
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = 'bold 120px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI', 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshPhongMaterial({
      map: texture,
      emissive: 0x00D084,
      emissiveIntensity: 0.3,
      wireframe: false
    });

    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
  }

  function addLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xC8A55C, 1, 100);
    pointLight1.position.set(50, 50, 50);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00D084, 0.8, 100);
    pointLight2.position.set(-50, -50, 50);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0x0a90e8, 0.6, 100);
    pointLight3.position.set(0, 50, -50);
    scene.add(pointLight3);
  }

  function animate() {
    requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Rotate particles
    if (particles) {
      particles.rotation.x += 0.0001;
      particles.rotation.y += 0.0002;
    }

    // Rotate and scale sphere
    if (sphere) {
      sphere.rotation.x += 0.0005;
      sphere.rotation.y += 0.001;
      sphere.position.z = Math.sin(elapsed * 0.3) * 3;
      sphere.scale.set(
        1 + Math.sin(elapsed * 0.5) * 0.1,
        1 + Math.sin(elapsed * 0.5) * 0.1,
        1 + Math.sin(elapsed * 0.5) * 0.1
      );
    }

    renderer.render(scene, camera);
  }

  function onWindowResize() {
    const width = container.clientWidth;
    const height = container.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
