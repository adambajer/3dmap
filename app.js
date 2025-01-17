// app.js

// Ensure that THREE, MTLLoader, OBJLoader, OrbitControls, and nipplejs are loaded via script tags in your HTML.

let modelLoader; // Declare globally

document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");

    // Initialize the model loader and assign it to the global variable
    modelLoader = new ModelLoader(renderContainer);

    // Resize handler: Ensure proper resizing of the scene
    window.addEventListener("resize", () => {
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;

        if (modelLoader) {
            modelLoader.camera.aspect = width / height;
            modelLoader.camera.updateProjectionMatrix();
            modelLoader.renderer.setSize(width, height);
        }
    });
});

class ModelLoader {
    constructor(renderContainer) {
        // Initialize Three.js scene, camera, renderer, lights, controls, etc.
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0e0e0);

        this.camera = new THREE.PerspectiveCamera(
            75,
            renderContainer.clientWidth / renderContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 1.6, 5); // Simulate head height

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
        renderContainer.appendChild(this.renderer.domElement);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add OrbitControls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        // First-person controls variables
        this.isFirstPerson = false;
        this.firstPersonVelocity = new THREE.Vector3();
        this.firstPersonDirection = new THREE.Vector3();

        // Device orientation controls variables
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isMobileLookEnabled = false;

        // Virtual joystick
        this.joystick = null;

        // File selection variables
        this.selectedFiles = { obj: null, mtl: null };
        this.currentModel = null;

        // Add axes helper
        this.addAxesToCenter();

        // Setup interactions
        this.setupInteractions(renderContainer);

        // Setup file inputs
        this.setupFileInputs();

        // Setup device orientation controls
        this.setupDeviceOrientationControls();

        // Setup virtual joystick
        this.setupVirtualJoystick(renderContainer);

        // Start animation loop
        this.animate();
    }

    addAxesToCenter() {
        const length = 5;

        // X-axis (Red)
        const xAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(length, 0, 0),
        ]);
        const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        this.scene.add(new THREE.Line(xAxisGeometry, xAxisMaterial));

        // Y-axis (Green)
        const yAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, length, 0),
        ]);
        const yAxisMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.scene.add(new THREE.Line(yAxisGeometry, yAxisMaterial));

        // Z-axis (Blue)
        const zAxisGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, length),
        ]);
        const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
        this.scene.add(new THREE.Line(zAxisGeometry, zAxisMaterial));
    }

    setupInteractions(renderContainer) {
        const firstPersonBtn = document.getElementById("first-person-btn");
        firstPersonBtn.addEventListener("click", () => {
            this.isFirstPerson = !this.isFirstPerson;

            if (this.isFirstPerson) {
                this.controls.enabled = false;
                this.renderer.domElement.requestPointerLock();
            } else {
                this.controls.enabled = true;
                document.exitPointerLock();
            }
        });

        window.addEventListener("keydown", (event) => {
            if (!this.isFirstPerson) return;

            const speed = 0.1;
            switch (event.code) {
                case "KeyW":
                case "ArrowUp":
                    this.firstPersonVelocity.z = -speed;
                    break;
                case "KeyS":
                case "ArrowDown":
                    this.firstPersonVelocity.z = speed;
                    break;
                case "KeyA":
                case "ArrowLeft":
                    this.firstPersonVelocity.x = -speed;
                    break;
                case "KeyD":
                case "ArrowRight":
                    this.firstPersonVelocity.x = speed;
                    break;
            }
        });

        window.addEventListener("keyup", () => {
            if (!this.isFirstPerson) return;
            this.firstPersonVelocity.set(0, 0, 0);
        });
    }

    setupFileInputs() {
        const objInput = document.getElementById("objInput");
        const mtlInput = document.getElementById("mtlInput");
        const loadModelBtn = document.getElementById("load-model-btn");
        const objSelectBtn = document.getElementById("obj-select-btn");
        const mtlSelectBtn = document.getElementById("mtl-select-btn");

        // Trigger hidden file input when select button is clicked
        objSelectBtn.addEventListener("click", () => {
            objInput.click();
        });

        mtlSelectBtn.addEventListener("click", () => {
            mtlInput.click();
        });

        objInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".obj")) {
                this.selectedFiles.obj = file;
                console.log(`OBJ file selected: ${file.name}`);
                objSelectBtn.classList.add("active");
            } else {
                alert("Please select a valid .obj file");
                objSelectBtn.classList.remove("active");
                this.selectedFiles.obj = null;
            }
            this.checkFilesSelected(loadModelBtn);
        });

        mtlInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".mtl")) {
                this.selectedFiles.mtl = file;
                console.log(`MTL file selected: ${file.name}`);
                mtlSelectBtn.classList.add("active");
            } else {
                alert("Please select a valid .mtl file");
                mtlSelectBtn.classList.remove("active");
                this.selectedFiles.mtl = null;
            }
            this.checkFilesSelected(loadModelBtn);
        });

        loadModelBtn.addEventListener("click", () => {
            if (this.selectedFiles.obj && this.selectedFiles.mtl) {
                this.loadModel(this.selectedFiles.obj, this.selectedFiles.mtl);
                loadModelBtn.disabled = true; // Optionally disable after loading
                objSelectBtn.classList.remove("active");
                mtlSelectBtn.classList.remove("active");
                this.selectedFiles = { obj: null, mtl: null };
            } else {
                alert("Please select both OBJ and MTL files.");
            }
        });
    }

    checkFilesSelected(loadModelBtn) {
        if (this.selectedFiles.obj && this.selectedFiles.mtl) {
            loadModelBtn.disabled = false;
        } else {
            loadModelBtn.disabled = true;
        }
    }

    loadModel(objFile, mtlFile) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
            this.currentModel = null;
        }

        const mtlLoader = new THREE.MTLLoader();
        const objLoader = new THREE.OBJLoader();

        // Load MTL file first
        mtlLoader.load(
            URL.createObjectURL(mtlFile),
            (materials) => {
                materials.preload();
                objLoader.setMaterials(materials);

                // Then load OBJ file
                objLoader.load(
                    URL.createObjectURL(objFile),
                    (object) => {
                        this.currentModel = object;

                        const box = new THREE.Box3().setFromObject(object);
                        const center = box.getCenter(new THREE.Vector3());
                        const size = box.getSize(new THREE.Vector3());

                        const maxDim = Math.max(size.x, size.y, size.z);
                        const scaleFactor = 5 / maxDim;
                        object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                        object.position.sub(center);
                        this.scene.add(object);

                        console.log("Model loaded successfully.");
                        document.getElementById("error-message").innerText = "";
                    },
                    (xhr) => {
                        console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
                    },
                    (error) => {
                        console.error("Error loading OBJ file:", error);
                        document.getElementById("error-message").innerText = "Error loading OBJ file.";
                    }
                );
            },
            (xhr) => {
                console.log((xhr.loaded / xhr.total) * 100 + "% loaded MTL");
            },
            (error) => {
                console.error("Error loading MTL file:", error);
                document.getElementById("error-message").innerText = "Error loading MTL file.";
            }
        );
    }

    setupDeviceOrientationControls() {
        window.addEventListener(
            "deviceorientation",
            (event) => {
                if (this.isFirstPerson) {
                    this.deviceOrientation.alpha = event.alpha;
                    this.deviceOrientation.beta = event.beta;
                    this.deviceOrientation.gamma = event.gamma;

                    const { alpha, beta, gamma } = this.deviceOrientation;

                    // Convert degrees to radians and adjust camera rotation
                    this.camera.rotation.x = THREE.MathUtils.degToRad(beta - 90);
                    this.camera.rotation.y = THREE.MathUtils.degToRad(alpha);
                }
            },
            true
        );
    }

    setupVirtualJoystick(renderContainer) {
        const joystickContainer = document.getElementById("virtual-joystick");
        this.joystick = nipplejs.create({
            zone: joystickContainer,
            mode: "static",
            position: { left: "50%", top: "50%" },
            color: "rgba(100,100,100,0.5)",
        });

        this.joystick.on("move", (evt, data) => {
            if (!this.isFirstPerson) return;

            const force = data.force * 0.1;
            const angle = data.angle.radian;

            this.firstPersonVelocity.x = Math.sin(angle) * force;
            this.firstPersonVelocity.z = -Math.cos(angle) * force;
        });

        this.joystick.on("end", () => {
            if (!this.isFirstPerson) return;
            this.firstPersonVelocity.set(0, 0, 0);
        });
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.isFirstPerson) {
            const moveVector = this.firstPersonVelocity.clone().applyMatrix4(
                new THREE.Matrix4().makeRotationY(this.camera.rotation.y)
            );
            this.camera.position.add(moveVector);
        } else {
            this.controls.update();
        }

        this.renderer.render(this.scene, this.camera);
    }
}
