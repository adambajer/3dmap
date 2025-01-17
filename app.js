// Initialize scene, camera, and renderer
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Add grid and axes
const axesHelper = new THREE.AxesHelper(5);
scene.add(axesHelper);

const gridHelper = new THREE.GridHelper(100, 100);
scene.add(gridHelper);

// Set camera position
camera.position.set(0, 10, 20);
camera.lookAt(0, 0, 0);

// Handle rotating and zooming
const rotateXControl = document.getElementById('rotateX');
const rotateYControl = document.getElementById('rotateY');
const zoomControl = document.getElementById('zoom');

rotateXControl.addEventListener('input', () => {
  const angle = THREE.MathUtils.degToRad(rotateXControl.value);
  camera.rotation.x = angle;
});

rotateYControl.addEventListener('input', () => {
  const angle = THREE.MathUtils.degToRad(rotateYControl.value);
  camera.rotation.y = angle;
});

zoomControl.addEventListener('input', () => {
  camera.zoom = parseFloat(zoomControl.value) / 10;
  camera.updateProjectionMatrix();
});

// Walking controls
const movementSpeed = 0.1;
let velocity = new THREE.Vector3();

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      velocity.z = -movementSpeed;
      break;
    case 'ArrowDown':
    case 'KeyS':
      velocity.z = movementSpeed;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      velocity.x = -movementSpeed;
      break;
    case 'ArrowRight':
    case 'KeyD':
      velocity.x = movementSpeed;
      break;
  }
});

document.addEventListener('keyup', () => {
  velocity.set(0, 0, 0);
});

// File Picker
const mtlInput = document.getElementById('mtlFile');
const objInput = document.getElementById('objFile');
const loadButton = document.getElementById('loadButton');

// File loading logic
loadButton.addEventListener('click', () => {
  if (!mtlInput.files[0] || !objInput.files[0]) {
    alert('Please select both MTL and OBJ files.');
    return;
  }

  const mtlFile = URL.createObjectURL(mtlInput.files[0]);
  const objFile = URL.createObjectURL(objInput.files[0]);

  const mtlLoader = new THREE.MTLLoader();
  const objLoader = new THREE.OBJLoader();

  mtlLoader.load(mtlFile, (materials) => {
    materials.preload();
    objLoader.setMaterials(materials);

    objLoader.load(
      objFile,
      (object) => {
        object.position.set(0, 0, 0); // Initial position
        object.scale.set(1, 1, 1);   // Adjust scale if needed
        scene.add(object);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('An error occurred:', error);
      }
    );
  });
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  // Update camera movement
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  direction.y = 0; // Lock movement to the XZ plane
  direction.normalize();

  camera.position.addScaledVector(direction, velocity.z);
  camera.position.x += velocity.x;

  renderer.render(scene, camera);
}

animate();
