
document.addEventListener('DOMContentLoaded', () => {
    const renderContainer = document.getElementById('render-container');
    const virtualJoystick = document.getElementById('virtual-joystick');

    // Initialize Three.js scene and other variables
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, renderContainer.clientWidth / renderContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
    renderContainer.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    camera.position.set(0, 10, 0); // Default to top view
    camera.lookAt(0, 0, 0);

    // Light setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Joystick logic
    let joystickManager;
    function initializeJoystick() {
        if (joystickManager) joystickManager.destroy();
        joystickManager = nipplejs.create({
            zone: virtualJoystick,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'blue',
        });

        joystickManager.on('move', (event, data) => {
            if (data && data.vector) {
                const { x, y } = data.vector;
                console.log(`Joystick move: X=${x}, Y=${y}`);
                // Implement movement logic (X and Y axes only)
            }
        });

        joystickManager.on('end', () => {
            console.log('Joystick released');
        });
    }
    initializeJoystick();

    // Button event listeners
    document.getElementById('first-person-btn').addEventListener('click', () => {
        if (camera.rotation.x !== Math.PI / 2) {
            camera.rotation.set(Math.PI / 2, 0, 0); // First-person view
            camera.position.set(0, 1.6, 5); // Eye-level height
        } else {
            camera.rotation.set(0, 0, 0); // Reset to top view
            camera.position.set(0, 10, 0);
        }
    });

    document.getElementById('mobile-look-btn').addEventListener('click', () => {
        virtualJoystick.classList.toggle('hidden');
        if (!virtualJoystick.classList.contains('hidden')) {
            initializeJoystick();
        }
    });

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();
});
