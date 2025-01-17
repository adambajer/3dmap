document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");

    // Basic Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
        75,
        renderContainer.clientWidth / renderContainer.clientHeight,
        0.1,
        1000
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderContainer.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Camera and Orbit Controls
    camera.position.set(0, 5, 10);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // File Inputs and Buttons
    const objInput = document.getElementById("objInput");
    const mtlInput = document.getElementById("mtlInput");
    const objSelectBtn = document.getElementById("obj-select-btn");
    const mtlSelectBtn = document.getElementById("mtl-select-btn");
    const loadModelBtn = document.getElementById("load-model-btn");
    const errorMessage = document.getElementById("error-message");

    let selectedFiles = { obj: null, mtl: null };
    let currentModel = null;

    // Handle file selection
    objSelectBtn.addEventListener("click", () => objInput.click());
    mtlSelectBtn.addEventListener("click", () => mtlInput.click());

    objInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file && file.name.toLowerCase().endsWith(".obj")) {
            selectedFiles.obj = file;
            objSelectBtn.classList.add("active");
            console.log(`OBJ file selected: ${file.name}`);
        } else {
            alert("Please select a valid .obj file.");
            selectedFiles.obj = null;
            objSelectBtn.classList.remove("active");
        }
        updateLoadButtonState();
    });

    mtlInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file && file.name.toLowerCase().endsWith(".mtl")) {
            selectedFiles.mtl = file;
            mtlSelectBtn.classList.add("active");
            console.log(`MTL file selected: ${file.name}`);
        } else {
            alert("Please select a valid .mtl file.");
            selectedFiles.mtl = null;
            mtlSelectBtn.classList.remove("active");
        }
        updateLoadButtonState();
    });

    loadModelBtn.addEventListener("click", () => {
        if (selectedFiles.obj && selectedFiles.mtl) {
            loadModel(selectedFiles.obj, selectedFiles.mtl);
        }
    });

    function updateLoadButtonState() {
        loadModelBtn.disabled = !(selectedFiles.obj && selectedFiles.mtl);
    }

    // Load the model
    function loadModel(objFile, mtlFile) {
        if (currentModel) {
            scene.remove(currentModel);
            currentModel = null;
        }

        const mtlLoader = new THREE.MTLLoader();
        const objLoader = new THREE.OBJLoader();

        errorMessage.textContent = "";

        mtlLoader.load(
            URL.createObjectURL(mtlFile),
            (materials) => {
                materials.preload();
                objLoader.setMaterials(materials);

                objLoader.load(
                    URL.createObjectURL(objFile),
                    (object) => {
                        console.log("OBJ loaded successfully:", object);

                        // Center and scale the model
                        const box = new THREE.Box3().setFromObject(object);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());
                        object.position.sub(center); // Center the object
                        const scaleFactor = 5 / Math.max(size.x, size.y, size.z); // Adjust scaling
                        object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                        scene.add(object);
                        currentModel = object;
                        console.log("Model added to scene.");
                    },
                    undefined,
                    (error) => {
                        console.error("Error loading OBJ file:", error);
                        errorMessage.textContent = "Error loading OBJ file.";
                    }
                );
            },
            undefined,
            (error) => {
                console.error("Error loading MTL file:", error);
                errorMessage.textContent = "Error loading MTL file.";
            }
        );
    }

    // Render loop
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    // Handle window resize
    window.addEventListener("resize", () => {
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    });
});
