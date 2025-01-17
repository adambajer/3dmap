class ModelLoader {
    constructor(renderContainer) {
        // Create scene with a lighter background
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xe0e0e0);

        // Create camera with a wider field of view for more zoom
        this.camera = new THREE.PerspectiveCamera(50, renderContainer.clientWidth / renderContainer.clientHeight, 0.1, 1000);
        this.camera.position.z = 10;  // Increased initial distance

        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(renderContainer.clientWidth, renderContainer.clientHeight);
        renderContainer.appendChild(this.renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.25;

        // First Person Controls
        this.isFirstPerson = false;
        this.firstPersonControls = {
            moveSpeed: 0.1,
            velocity: new THREE.Vector3(),
            direction: new THREE.Vector3(),
        };

        // Mobile Device Orientation
        this.isMobileLookEnabled = false;
        this.setupDeviceOrientationControls();

        // Raycaster for object selection
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        // Virtual Joystick
        this.setupVirtualJoystick(renderContainer);

        // Add scene boundaries properties
        this.sceneBoundaries = {
            min: new THREE.Vector3(),
            max: new THREE.Vector3()
        };

        // New property to track selected files
        this.selectedFiles = {
            obj: null,
            mtl: null
        };

        // Start animation loop
        this.animate();

        // Setup interaction events
        this.setupInteractions(renderContainer);
    }

    setupVirtualJoystick(renderContainer) {
        const joystickContainer = document.getElementById('virtual-joystick');
        this.joystick = nipplejs.create({
            zone: joystickContainer,
            mode: 'static',
            position: { left: '50%', top: '50%' },
            color: 'rgba(100,100,100,0.5)'
        });

        this.joystick.on('move', (evt, data) => {
            if (this.isFirstPerson) {
                const angle = data.angle.radian;
                const force = data.force;
                
                // Calculate movement direction based on camera's current orientation
                // Strictly horizontal movement
                this.firstPersonControls.direction.x = Math.sin(this.camera.rotation.y + angle) * force;
                this.firstPersonControls.direction.z = Math.cos(this.camera.rotation.y + angle) * force;
                
                // Explicitly zero out any vertical movement
                this.firstPersonControls.direction.y = 0;
            }
        });

        this.joystick.on('end', () => {
            if (this.isFirstPerson) {
                // Reset direction to zero, maintaining horizontal plane
                this.firstPersonControls.direction.set(0, 0, 0);
            }
        });
    }

    setupDeviceOrientationControls() {
        this.deviceOrientation = {
            alpha: 0,
            beta: 0,
            gamma: 0
        };

        window.addEventListener('deviceorientation', (event) => {
            if (this.isMobileLookEnabled) {
                this.deviceOrientation.alpha = event.alpha;
                this.deviceOrientation.beta = event.beta;
                this.deviceOrientation.gamma = event.gamma;
            }
        }, true);
    }

    updateFirstPersonMovement() {
        if (this.isFirstPerson && this.currentModel) {
            // Apply movement
            const moveVector = this.firstPersonControls.direction.clone()
                .multiplyScalar(this.firstPersonControls.moveSpeed);
            
            // Move only on the horizontal plane (X and Z)
            // Ignore any vertical (Y) movement
            const moveX = moveVector.x * Math.cos(this.camera.rotation.y) - moveVector.z * Math.sin(this.camera.rotation.y);
            const moveZ = moveVector.x * Math.sin(this.camera.rotation.y) + moveVector.z * Math.cos(this.camera.rotation.y);
            
            // Predict new position, keeping Y (height) constant
            const newPosX = this.camera.position.x + moveX;
            const newPosZ = this.camera.position.z + moveZ;

            // Ensure camera stays at the same height
            const originalHeight = this.camera.position.y;

            // Check if new position is within scene boundaries
            if (this.isWithinSceneBoundaries(newPosX, newPosZ)) {
                this.camera.position.x = newPosX;
                this.camera.position.z = newPosZ;
                
                // Force camera to stay at original height
                this.camera.position.y = originalHeight;
            }
        }
    }

    isWithinSceneBoundaries(x, z) {
        // If no model is loaded, allow movement
        if (!this.currentModel) return true;

        // Expand boundaries slightly for better movement
        const padding = 0.5;
        return (
            x >= this.sceneBoundaries.min.x - padding &&
            x <= this.sceneBoundaries.max.x + padding &&
            z >= this.sceneBoundaries.min.z - padding &&
            z <= this.sceneBoundaries.max.z + padding
        );
    }

    setupInteractions(renderContainer) {
        // Part selection
        renderContainer.addEventListener('click', (event) => {
            // Calculate mouse position in normalized device coordinates
            const rect = renderContainer.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            // Perform raycasting
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            if (this.currentModel) {
                const intersects = this.raycaster.intersectObject(this.currentModel, true);
                
                if (intersects.length > 0) {
                    const selectedObject = intersects[0].object;
                    this.highlightObject(selectedObject);
                    
                    // Display part information
                    const partInfo = document.getElementById('part-info');
                    partInfo.textContent = `Selected Part: ${selectedObject.name || 'Unnamed'}`;
                }
            }
        });

        // OBJ File Selection
        const objInput = document.getElementById('objInput');
        const mtlInput = document.getElementById('mtlInput');
        const objSelectBtn = document.getElementById('obj-select-btn');
        const mtlSelectBtn = document.getElementById('mtl-select-btn');
        const loadModelBtn = document.getElementById('load-model-btn');
        const fileTypeInfo = document.getElementById('file-type-info');
        const errorMessage = document.getElementById('error-message');

        objSelectBtn.addEventListener('click', () => {
            objInput.click();
        });

        objInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith('.obj')) {
                this.selectedFiles.obj = file;
                objSelectBtn.classList.add('active');
                fileTypeInfo.textContent = `OBJ File: ${file.name}`;
                
                // Enable load button if both files are selected
                loadModelBtn.disabled = !(this.selectedFiles.obj && this.selectedFiles.mtl);
                errorMessage.textContent = '';
            } else {
                errorMessage.textContent = 'Please select a valid .obj file';
            }
        });

        // MTL File Selection
        mtlSelectBtn.addEventListener('click', () => {
            mtlInput.click();
        });

        mtlInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file && file.name.toLowerCase().endsWith('.mtl')) {
                this.selectedFiles.mtl = file;
                mtlSelectBtn.classList.add('active');
                fileTypeInfo.textContent = `MTL File: ${file.name}`;
                
                // Enable load button if both files are selected
                loadModelBtn.disabled = !(this.selectedFiles.obj && this.selectedFiles.mtl);
                errorMessage.textContent = '';
            } else {
                errorMessage.textContent = 'Please select a valid .mtl file';
            }
        });

        // Load Model Button
        loadModelBtn.addEventListener('click', () => {
            if (this.selectedFiles.obj && this.selectedFiles.mtl) {
                this.loadModel(this.selectedFiles.obj, this.selectedFiles.mtl);
                loadModelBtn.classList.add('active');
            } else {
                errorMessage.textContent = 'Please select both OBJ and MTL files';
            }
        });
    }

    highlightObject(object) {
        // Reset previous highlights
        if (this.previousHighlight) {
            this.previousHighlight.material.color.set(this.previousColor);
        }

        // Store current highlight
        this.previousHighlight = object;
        this.previousColor = object.material.color.clone();

        // Highlight selected object
        object.material.color.set(0xff0000);
    }

    loadModel(objFile, mtlFile) {
        // Clear error message
        document.getElementById('error-message').textContent = '';

        // Remove existing model
        if (this.currentModel) {
            this.scene.remove(this.currentModel);
        }

        // Create loaders
        const mtlLoader = new THREE.MTLLoader();
        const objLoader = new THREE.OBJLoader();

        try {
            // Load MTL first
            mtlLoader.load(
                URL.createObjectURL(mtlFile),
                (materials) => {
                    materials.preload();
                    objLoader.setMaterials(materials);

                    // Then load OBJ
                    objLoader.load(
                        URL.createObjectURL(objFile),
                        (object) => {
                            this.currentModel = object;
                            
                            // Traverse through all children to name parts and setup interaction
                            object.traverse((child) => {
                                if (child.isMesh) {
                                    // Optional: Add unique names to meshes if they don't have one
                                    if (!child.name) {
                                        child.name = `Mesh_${Math.random().toString(36).substr(2, 9)}`;
                                    }
                                }
                            });
                            
                            // Center the model
                            const box = new THREE.Box3().setFromObject(object);
                            const center = box.getCenter(new THREE.Vector3());
                            const size = box.getSize(new THREE.Vector3());
                            
                            // Store scene boundaries
                            this.sceneBoundaries.min.copy(box.min);
                            this.sceneBoundaries.max.copy(box.max);
                            
                            // Modify the scaling to allow for more detailed view
                            const maxDim = Math.max(size.x, size.y, size.z);
                            const scaleFactor = 5 / maxDim;  // Increased scale factor
                            object.scale.set(scaleFactor, scaleFactor, scaleFactor);

                            this.scene.add(object);

                            // Fit camera to model
                            this.fitCameraToObject();
                        },
                        // onProgress
                        undefined,
                        // onError
                        (error) => {
                            console.error('Error loading OBJ:', error);
                            document.getElementById('error-message').textContent = 'Error loading OBJ file';
                        }
                    );
                },
                // onProgress
                undefined,
                // onError
                (error) => {
                    console.error('Error loading MTL:', error);
                    document.getElementById('error-message').textContent = 'Error loading MTL file';
                }
            );
        } catch (error) {
            console.error('Unexpected error:', error);
            document.getElementById('error-message').textContent = 'Unexpected error loading model';
        }
    }

    fitCameraToObject() {
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 2;  // Increased multiplier for more zoom

        this.camera.position.copy(center);
        this.camera.position.z += cameraDistance;
        this.controls.target.copy(center);
        this.controls.update();
    }

    updateMobileLook() {
        if (this.isMobileLookEnabled) {
            // Use device orientation to rotate camera
            const { alpha, beta, gamma } = this.deviceOrientation;
            
            // Convert device orientation to camera rotation
            // This is a simplified conversion and might need fine-tuning
            this.camera.rotation.x = THREE.MathUtils.degToRad(beta);
            this.camera.rotation.y = THREE.MathUtils.degToRad(-gamma);
            this.camera.rotation.z = THREE.MathUtils.degToRad(alpha);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update first-person movement
        this.updateFirstPersonMovement();
        
        // Update mobile look
        this.updateMobileLook();
        
        // Only update orbit controls if not in first-person or mobile look mode
        if (!this.isFirstPerson && !this.isMobileLookEnabled) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const renderContainer = document.getElementById('render-container');
    const modelLoader = new ModelLoader(renderContainer);

    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const firstPersonBtn = document.getElementById('first-person-btn');
    const mobileLookBtn = document.getElementById('mobile-look-btn');
    const modeInfo = document.getElementById('mode-info');

    // First Person Toggle
    firstPersonBtn.addEventListener('click', () => {
        modelLoader.isFirstPerson = !modelLoader.isFirstPerson;
        
        if (modelLoader.isFirstPerson) {
            modelLoader.controls.enabled = false;
            modeInfo.textContent = 'First Person Mode: ON';
        } else {
            modelLoader.controls.enabled = true;
            modeInfo.textContent = 'First Person Mode: OFF';
        }
    });

    // Mobile Look Toggle
    mobileLookBtn.addEventListener('click', () => {
        modelLoader.isMobileLookEnabled = !modelLoader.isMobileLookEnabled;
        
        if (modelLoader.isMobileLookEnabled) {
            modelLoader.controls.enabled = false;
            modeInfo.textContent = 'Mobile Look Mode: ON';
        } else {
            modelLoader.controls.enabled = true;
            modeInfo.textContent = 'Mobile Look Mode: OFF';
        }
    });

    // Fullscreen functionality
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            if (renderContainer.requestFullscreen) {
                renderContainer.requestFullscreen();
            } else if (renderContainer.mozRequestFullScreen) { // Firefox
                renderContainer.mozRequestFullScreen();
            } else if (renderContainer.webkitRequestFullscreen) { // Chrome, Safari and Opera
                renderContainer.webkitRequestFullscreen();
            } else if (renderContainer.msRequestFullscreen) { // IE/Edge
                renderContainer.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.mozCancelFullScreen) { // Firefox
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) { // IE/Edge
                document.msExitFullscreen();
            }
        }
    });

    // Resize handler
    window.addEventListener('resize', () => {
        const width = renderContainer.clientWidth;
        const height = renderContainer.clientHeight;
        
        modelLoader.camera.aspect = width / height;
        modelLoader.camera.updateProjectionMatrix();
        modelLoader.renderer.setSize(width, height);
    });
});
