document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, renderContainer.clientWidth / renderContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderContainer.appendChild(renderer.domElement);

    // Basic lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);

    function loadModel(objFile, mtlFile) {
        const mtlLoader = new THREE.MTLLoader();
        const objLoader = new THREE.OBJLoader();

        // Load the materials
        mtlLoader.load(URL.createObjectURL(mtlFile), (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);

            // Load the model
            objLoader.load(
                URL.createObjectURL(objFile),
                (object) => {
                    console.log("OBJ loaded successfully:", object);

                    // Center and scale the model
                    const box = new THREE.Box3().setFromObject(object);
                    const center = box.getCenter(new THREE.Vector3());
                    const size = box.getSize(new THREE.Vector3());
                    object.position.sub(center); // Center the model
                    const scaleFactor = 5 / Math.max(size.x, size.y, size.z); // Scale to fit
                    object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                    // Add the model to the scene
                    scene.add(object);
                    console.log("Model added to scene.");
                },
                undefined,
                (error) => console.error("Error loading OBJ file:", error)
            );
        });
    }

    // Test model loading (Replace with your HTML inputs)
    const objInput = document.getElementById("objInput");
    const mtlInput = document.getElementById("mtlInput");
    const loadButton = document.getElementById("load-model-btn");

    loadButton.addEventListener("click", () => {
        const objFile = objInput.files[0];
        const mtlFile = mtlInput.files[0];
        if (objFile && mtlFile) {
            loadModel(objFile, mtlFile);
        } else {
            alert("Please select both OBJ and MTL files.");
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
