class ModelLoader {
    constructor(renderContainer) {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0e0e0);

        this.camera = new THREE.PerspectiveCamera(
            50,
            renderContainer.clientWidth / renderContainer.clientHeight,
            0.1,
            1000
        );
        this.camera.position.z = 10;

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

        this.currentModel = null;
        this.selectedFiles = { obj: null, mtl: null };

        this.setupInteractions(renderContainer);
        this.animate();
    }

    setupInteractions(renderContainer) {
        const objInput = document.getElementById("objInput");
        const mtlInput = document.getElementById("mtlInput");
        const objSelectBtn = document.getElementById("obj-select-btn");
        const mtlSelectBtn = document.getElementById("mtl-select-btn");
        const loadModelBtn = document.getElementById("load-model-btn");
        const fileTypeInfo = document.getElementById("file-type-info");
        const errorMessage = document.getElementById("error-message");

        objSelectBtn.addEventListener("click", () => {
            objInput.click();
        });

        objInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".obj")) {
                this.selectedFiles.obj = file;
                objSelectBtn.classList.add("active");
                fileTypeInfo.textContent = `OBJ File: ${file.name}`;
                loadModelBtn.disabled = !(this.selectedFiles.obj && this.selectedFiles.mtl);
                errorMessage.textContent = "";
            } else {
                errorMessage.textContent = "Please select a valid .obj file";
            }
        });

        mtlSelectBtn.addEventListener("click", () => {
            mtlInput.click();
        });

        mtlInput.addEventListener("change", (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith(".mtl")) {
                this.selectedFiles.mtl = file;
                mtlSelectBtn.classList.add("active");
                fileTypeInfo.textContent = `MTL File: ${file.name}`;
                loadModelBtn.disabled = !(this.selectedFiles.obj && this.selectedFiles.mtl);
                errorMessage.textContent = "";
            } else {
                errorMessage.textContent = "Please select a valid .mtl file";
            }
        });

        loadModelBtn.addEventListener("click", () => {
            if (this.selectedFiles.obj && this.selectedFiles.mtl) {
                this.loadModel(this.selectedFiles.obj, this.selectedFiles.mtl);
                loadModelBtn.classList.add("active");
            } else {
                errorMessage.textContent = "Please select both OBJ and MTL files";
            }
        });
    }

    loadModel(objFile, mtlFile) {
        document.getElementById("error-message").textContent = "";

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

                        this.fitCameraToObject(object);
                    },
                    undefined,
                    (error) => {
                        console.error("Error loading OBJ:", error);
                        document.getElementById("error-message").textContent =
                            "Error loading OBJ file";
                    }
                );
            },
            undefined,
            (error) => {
                console.error("Error loading MTL:", error);
                document.getElementById("error-message").textContent =
                    "Error loading MTL file";
            }
        );
    }

    fitCameraToObject(object) {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2;

        this.camera.position.copy(center);
        this.camera.position.z += cameraDistance;
        this.controls.target.copy(center);
        this.controls.update();
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    const renderContainer = document.getElementById("render-container");

    // Declare `modelLoader` as a global variable
    const modelLoader = new ModelLoader(renderContainer);

    // Resize handler: Ensure the `modelLoader` instance is used properly
    window.addEventListener("resize", () => {
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;

        modelLoader.camera.aspect = width / height;
        modelLoader.camera.updateProjectionMatrix();
        modelLoader.renderer.setSize(width, height);
    });
});

