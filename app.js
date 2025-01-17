// app.js

// Make sure you have these scripts in your HTML, in this order:
// 1) three.min.js
// 2) OBJLoader.js
// 3) MTLLoader.js
// 4) OrbitControls.js
// 5) nipplejs.min.js (if needed for virtual joystick)
// Then include this script at the end of the body.

let modelLoader; // Declare globally

document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");
    modelLoader = new ModelLoader(renderContainer);

    // Handle window resizing
    window.addEventListener("resize", () => {
        if (!modelLoader) return;
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;

        modelLoader.camera.aspect = width / height;
        modelLoader.camera.updateProjectionMatrix();
        modelLoader.renderer.setSize(width, height);
    });
});

class ModelLoader {
    constructor(renderContainer) {
        // ------------------------------------
        // Basic Three.js Setup
        // ------------------------------------
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0e0e0);

        this.camera = new THREE.PerspectiveCamera(
            75,
            renderContainer.clientWidth / renderContainer.clientHeight,
            0.1,
            1000
        );
        // Place the camera somewhat above and back
        this.camera.position.set(0, 3, 10);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        renderContainer.appendChild(this.renderer.domElement);

        // ------------------------------------
        // Lights
        // ------------------------------------
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 10, 10);
        this.scene.add(directionalLight);

        // ------------------------------------
        // OrbitControls
        // ------------------------------------
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        // ------------------------------------
        // First-person controls variables
        // ------------------------------------
        this.isFirstPerson = false;
        this.firstPersonVelocity = new THREE.Vector3();
        this.firstPersonDirection = new THREE.Vector3();

        // Device orientation (mobile look)
        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };

        // Virtual joystick
        this.joystick = null;

        // File selection
        this.selectedFiles = { obj: null, mtl: null };
        this.currentModel = null;

        // Add a simple axes helper at the origin
        this.addAxesToCenter();

        // Setup UI / interactions
        this.setupInteractions();
        this.setupFileInputs();
        this.setupDeviceOrientationControls();
        this.setupVirtualJoystick();
    }

    // ----------------------------------------------------
    // Helpers
    // ----------------------------------------------------
    addAxesToCenter() {
        const length = 5;

        const xAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(length, 0, 0)
        ]);
        const xAxisMat = new THREE.LineBasicMaterial({ color: 0xff0000 });
        this.scene.add(new THREE.Line(xAxisGeo, xAxisMat));

        const yAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, length, 0)
        ]);
        const yAxisMat = new THREE.LineBasicMaterial({ color: 0x00ff00 });
        this.scene.add(new THREE.Line(yAxisGeo, yAxisMat));

        const zAxisGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, length)
        ]);
        const zAxisMat = new THREE.LineBasicMaterial({ color: 0x0000ff });
        this.scene.add(new THREE.Line(zAxisGeo, zAxisMat));
    }

    // ----------------------------------------------------
    // Interactions (Orbit vs. First Person)
    // ----------------------------------------------------
    setupInteractions() {
        const firstPersonBtn = document.getElementById("first-person-btn");
        if (firstPersonBtn) {
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
        }

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

    // ----------------------------------------------------
    // File Inputs (OBJ / MTL)
    // ----------------------------------------------------
    setupFileInputs() {
        const objInput = document.getElementById("objInput");
        const mtlInput = document.getElementById("mtlInput");
        const loadModelBtn = document.getElementById("load-model-btn");
        const objSelectBtn = document.getElementById("obj-select-btn");
        const mtlSelectBtn = document.getElementById("mtl-select-btn");

        // If the HTML elements don't exist, do nothing
        if (!objInput || !mtlInput || !loadModelBtn || !objSelectBtn || !mtlSelectBtn) return;

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
                // Load model, then start rendering
                this.loadModel(this.selectedFiles.obj, this.selectedFiles.mtl);
                loadModelBtn.disabled = true;
                objSelectBtn.classList.remove("active");
                mtlSelectBtn.classList.remove("active");
                this.selectedFiles = { obj: null, mtl: null };
            } else {
                alert("Please select both OBJ and MTL files.");
            }
        });
    }

    checkFilesSelected(loadModelBtn) {
        if (!loadModelBtn) return;
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

    mtlLoader.load(
        URL.createObjectURL(mtlFile),
        (materials) => {
            materials.preload();
            objLoader.setMaterials(materials);

            objLoader.load(
                URL.createObjectURL(objFile),
                (object) => {
                    // Compute the bounding box
                    const box = new THREE.Box3().setFromObject(object);
                    const size = new THREE.Vector3();
                    const center = new THREE.Vector3();
                    box.getSize(size);
                    box.getCenter(center);

                    // Center the model at the origin
                    object.position.sub(center);

                    // Optionally, scale the model to fit in a specific size
                    const maxSize = Math.max(size.x, size.y, size.z);
                    const scaleFactor = 5 / maxSize; // Adjust '5' as needed
                    object.scale.setScalar(scaleFactor);

                    this.currentModel = object;
                    this.scene.add(object);

                    // Start rendering if not already started
                    this.startRenderingLoop();
                },
                undefined,
                (error) => console.error("Error loading OBJ file:", error)
            );
        },
        undefined,
        (error) => console.error("Error loading MTL file:", error)
    );
}


    // ----------------------------------------------------
    // Device Orientation (mobile look)
    // ----------------------------------------------------
    setupDeviceOrientationControls() {
        window.addEventListener("deviceorientation", (event) => {
            if (!this.isFirstPerson) return;

            this.deviceOrientation.alpha = event.alpha;
            this.deviceOrientation.beta = event.beta;
            this.deviceOrientation.gamma = event.gamma;

            const { alpha, beta } = this.deviceOrientation;
            // Convert degrees to radians, adjusting camera rotation
            this.camera.rotation.x = THREE.MathUtils.degToRad(beta - 90);
            this.camera.rotation.y = THREE.MathUtils.degToRad(alpha);
        }, true);
    }

    // ----------------------------------------------------
    // Virtual Joystick
    // ----------------------------------------------------
    setupVirtualJoystick() {
        const joystickContainer = document.getElementById("virtual-joystick");
        if (!joystickContainer) return;

        this.joystick = nipplejs.create({
            zone: joystickContainer,
            mode: "static",
            position: { left: "50%", top: "50%" },
            color: "rgba(100,100,100,0.5)"
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

    // ----------------------------------------------------
    // Start Rendering (Called After OBJ Loads)
    // ----------------------------------------------------
    startRenderingLoop() {
        // If we already started, don’t start again
        if (this.isRendering) return;
        this.isRendering = true;

        const animate = () => {
            requestAnimationFrame(animate);

            if (this.isFirstPerson) {
                // Move camera in first-person style
                const moveVector = this.firstPersonVelocity.clone().applyMatrix4(
                    new THREE.Matrix4().makeRotationY(this.camera.rotation.y)
                );
                this.camera.position.add(moveVector);
            } else {
                // Orbit controls
                this.controls.update();
            }

            this.renderer.render(this.scene, this.camera);
        };

        animate();
    }
}
