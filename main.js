// ABUZ8 — Cinematic 3D Background Animation
// Three.js particle system with mouse interaction

const canvas = document.getElementById('bg-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 50;

// Particle system
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const positions = new Float32Array(particlesCount * 3);
const colors = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount; i++) {
  // Random positions in 3D space
  positions[i * 3] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
  
  // Random colors (blue to cyan gradient)
  const colorChoice = Math.random();
  if (colorChoice < 0.33) {
    colors[i * 3] = 0;
    colors[i * 3 + 1] = 0.83;
    colors[i * 3 + 2] = 1; // Blue
  } else if (colorChoice < 0.66) {
    colors[i * 3] = 0;
    colors[i * 3 + 1] = 1;
    colors[i * 3 + 2] = 0.53; // Green-cyan
  } else {
    colors[i * 3] = 1;
    colors[i * 3 + 1] = 0;
    colors[i * 3 + 2] = 0.43; // Pink-magenta
  }
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particlesGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

const particlesMaterial = new THREE.PointsMaterial({
  size: 0.5,
  vertexColors: true,
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending
});

const particles = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particles);

// Mouse tracking
let mouseX = 0;
let mouseY = 0;
let targetX = 0;
let targetY = 0;

const windowHalfX = window.innerWidth / 2;
const windowHalfY = window.innerHeight / 2;

document.addEventListener('mousemove', (event) => {
  mouseX = (event.clientX - windowHalfX) / 100;
  mouseY = (event.clientY - windowHalfY) / 100;
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  
  // Smooth mouse following
  targetX = mouseX * 0.5;
  targetY = mouseY * 0.5;
  
  particles.rotation.x += 0.0005;
  particles.rotation.y += 0.0005;
  
  camera.position.x += (targetX - camera.position.x) * 0.05;
  camera.position.y += (-targetY - camera.position.y) * 0.05;
  camera.lookAt(scene.position);
  
  renderer.render(scene, camera);
}

animate();

// Handle resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
