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
        this.camera.position.set(0, 1.6, 5); // Simulate head-level height

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
        renderContainer.appendChild(this.renderer.domElement);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Orbit and First-Person Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        this.isFirstPerson = false;
        this.firstPersonVelocity = new THREE.Vector3();
        this.firstPersonDirection = new THREE.Vector3();

        this.deviceOrientation = { alpha: 0, beta: 0, gamma: 0 };
        this.isMobileLookEnabled = false;

        // Virtual Joystick
        this.joystick = null;

        // Add axes
        this.addAxesToCenter();

        // Interaction setup
        this.setupInteractions(renderContainer);
        this.setupDeviceOrientationControls(renderContainer);
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

    setupDeviceOrientationControls() {
        window.addEventListener(
            "deviceorientation",
            (event) => {
                if (this.isFirstPerson) {
                    this.deviceOrientation.alpha = event.alpha;
                    this.deviceOrientation.beta = event.beta;
                    this.deviceOrientation.gamma = event.gamma;

                    const { alpha, beta, gamma } = this.deviceOrientation;

                    // Adjust camera rotation
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

            const force = data.force * 0.1; // Adjust movement speed based on joystick force
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
 
document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");
    new ModelLoader(renderContainer);

    window.addEventListener("resize", () => {
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;

        ModelLoader.camera.aspect = width / height;
        ModelLoader.camera.updateProjectionMatrix();
        ModelLoader.renderer.setSize(width, height);
    });
});
