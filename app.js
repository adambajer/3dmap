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

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        this.isFirstPerson = false;
        this.firstPersonVelocity = new THREE.Vector3();
        this.firstPersonDirection = new THREE.Vector3();

        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isMobileLookEnabled = false;

        this.joystick = null;
        this.selectedFiles = { obj: null, mtl: null };
        this.currentModel = null;

        this.addAxesToCenter();
        this.setupInteractions(renderContainer);
        this.setupFileInputs();
        this.setupDeviceOrientationControls();
        this.setupVirtualJoystick(renderContainer);

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
            this.firstPersonVelocity.set(0, 0, 0);
        });
    }

    setupFileInputs() {
        const objInput = document.getElementById("objInput");
        const mtlInput = document.getElementById("mtlInput");
        const loadModelBtn = document.getElementById("load-model-btn");

        objInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".obj")) {
                this.selectedFiles.obj = file;
                console.log(`OBJ file selected: ${file.name}`);
            } else {
                alert("Please select a valid .obj file");
            }
        });

        mtlInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".mtl")) {
                this.selectedFiles.mtl = file;
                console.log(`MTL file selected: ${file.name}`);
            } else {
                alert("Please select a valid .mtl file");
            }
        });

        loadModelBtn.addEventListener("click", () => {
            if (this.selectedFiles.obj && this.selectedFiles.mtl) {
                this.loadModel(this.selectedFiles.obj, this.selectedFiles.mtl);
            } else {
                alert("Please select both OBJ and MTL files.");
            }
        });
    }

    loadModel(objFile, mtlFile) {
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
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
                    },
                    undefined,
                    (error) => {
                        console.error("Error loading OBJ file:", error);
                    }
                );
            },
            undefined,
            (error) => {
                console.error("Error loading MTL file:", error);
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
