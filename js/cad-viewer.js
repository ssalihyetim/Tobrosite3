/*=============== CAD VIEWER SYSTEM ===============*/

class CADViewer {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.loadedModel = null;
        this.measurements = [];
        this.measurementMode = false;
        this.container = null;
        
        this.init();
    }

    init() {
        // Try both container IDs for compatibility with RFQ panel and main page
        this.container = document.getElementById('cad-viewer') || document.getElementById('viewer-canvas');
        console.log('CAD Viewer init - container found:', this.container);
        
        if (!this.container) {
            console.error('CAD Viewer: No container element found');
            return;
        }

        console.log('Container dimensions:', this.container.offsetWidth, 'x', this.container.offsetHeight);
        console.log('Container styles:', window.getComputedStyle(this.container));

        // Initialize OCCT importer if not already done
        this.initializeOCCT();

        this.setupScene();
        this.setupRenderer();
        this.setupCamera();
        this.setupControls();
        this.setupLighting();
        this.bindEvents();
        this.animate();
    }
    
    async initializeOCCT() {
        if (!window.occtImporter && typeof OCCTImporter !== 'undefined') {
            try {
                console.log('Initializing OCCT importer in CAD viewer...');
                window.occtImporter = new OCCTImporter();
                await window.occtImporter.init();
                console.log('OCCT importer initialized successfully');
            } catch (error) {
                console.warn('Failed to initialize OCCT importer:', error);
                // Continue without OCCT - viewer will show placeholders for STEP/IGES
            }
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0xf8fafc);
        
        // Add grid
        const gridHelper = new THREE.GridHelper(100, 100, 0xe2e8f0, 0xf1f5f9);
        this.scene.add(gridHelper);
    }

    setupRenderer() {
        console.log('Setting up renderer...');
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true,
            preserveDrawingBuffer: true 
        });
        
        console.log('Renderer created, setting size to:', this.container.clientWidth, 'x', this.container.clientHeight);
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        // Clear placeholder and add canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.renderer.domElement);
        this.renderer.domElement.className = 'cad-canvas';
        
        // Ensure canvas is properly styled and visible
        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.minHeight = '400px';
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            this.container.clientWidth / this.container.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(50, 50, 50);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        if (typeof THREE.OrbitControls !== 'undefined') {
            // Use OrbitControls if available
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.enableZoom = true;
            this.controls.enablePan = true;
            this.controls.enableRotate = true;
            this.controls.autoRotate = false;
            this.controls.autoRotateSpeed = 2.0;
            this.controls.minDistance = 1;
            this.controls.maxDistance = 500;
            console.log('Using OrbitControls for camera control');
        } else {
            // Fall back to basic mouse controls
            console.log('OrbitControls not available, using basic controls');
            this.setupBasicControls();
        }
    }

    setupBasicControls() {
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const deltaMove = {
                x: e.clientX - previousMousePosition.x,
                y: e.clientY - previousMousePosition.y
            };

            if (e.shiftKey) {
                // Pan
                this.camera.position.x -= deltaMove.x * 0.1;
                this.camera.position.y += deltaMove.y * 0.1;
            } else {
                // Rotate around center
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaMove.x * 0.01;
                spherical.phi += deltaMove.y * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));
                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);
            }

            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });

        this.renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY * 0.001;
            this.camera.position.multiplyScalar(1 + delta);
        });
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);

        // Fill light
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-50, 0, -50);
        this.scene.add(fillLight);
    }

    bindEvents() {
        // Toolbar buttons
        document.getElementById('fit-view')?.addEventListener('click', () => this.fitToView());
        document.getElementById('measure-tool')?.addEventListener('click', () => this.toggleMeasurementMode());
        document.getElementById('section-tool')?.addEventListener('click', () => this.toggleSectionView());
        document.getElementById('view-mode')?.addEventListener('change', (e) => this.changeViewMode(e.target.value));

        // Window resize
        window.addEventListener('resize', () => this.onWindowResize());
    }

    async loadFile(file) {
        this.showLoading(true);
        
        try {
            // Validate file parameter
            if (!file) {
                throw new Error('No file provided');
            }
            
            if (!file.name) {
                throw new Error('File object missing name property');
            }
            
            const fileExtension = file.name.split('.').pop().toLowerCase();
            
            switch (fileExtension) {
                case 'stl':
                    await this.loadSTL(file);
                    break;
                case 'obj':
                    await this.loadOBJ(file);
                    break;
                case 'step':
                case 'stp':
                    await this.loadSTEP(file);
                    break;
                case 'iges':
                case 'igs':
                    await this.loadIGES(file);
                    break;
                default:
                    throw new Error(`Unsupported file format: ${fileExtension}`);
            }

            this.fitToView();
            
            // Only show basic model info for STL/OBJ files
            // STEP/IGES files handle their own info display
            if (['stl', 'obj'].includes(fileExtension)) {
                this.showModelInfo(file);
            }
            
        } catch (error) {
            console.error('Error loading file:', error);
            this.showError('Failed to load CAD file', error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadSTL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const contents = event.target.result;
                    const geometry = this.parseSTL(contents);
                    
                    const material = new THREE.MeshPhongMaterial({
                        color: 0x3b82f6,
                        shininess: 100,
                        transparent: true,
                        opacity: 0.9
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                    
                    this.addModelToScene(mesh, file.name);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    parseSTL(data) {
        const geometry = new THREE.BufferGeometry();
        const dataView = new DataView(data);
        
        // Skip header (80 bytes)
        let offset = 80;
        
        // Read number of triangles
        const triangles = dataView.getUint32(offset, true);
        offset += 4;
        
        const vertices = [];
        const normals = [];
        
        for (let i = 0; i < triangles; i++) {
            // Normal vector (3 floats)
            const nx = dataView.getFloat32(offset, true); offset += 4;
            const ny = dataView.getFloat32(offset, true); offset += 4;
            const nz = dataView.getFloat32(offset, true); offset += 4;
            
            // Three vertices (9 floats)
            for (let j = 0; j < 3; j++) {
                const x = dataView.getFloat32(offset, true); offset += 4;
                const y = dataView.getFloat32(offset, true); offset += 4;
                const z = dataView.getFloat32(offset, true); offset += 4;
                
                vertices.push(x, y, z);
                normals.push(nx, ny, nz);
            }
            
            // Skip attribute byte count
            offset += 2;
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.computeBoundingBox();
        
        return geometry;
    }

    async loadOBJ(file) {
        // Simplified OBJ loader - in production, use THREE.OBJLoader
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const text = event.target.result;
                    const geometry = this.parseOBJ(text);
                    
                    const material = new THREE.MeshPhongMaterial({
                        color: 0x3b82f6,
                        shininess: 100
                    });
                    
                    const mesh = new THREE.Mesh(geometry, material);
                    this.addModelToScene(mesh, file.name);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    parseOBJ(text) {
        const geometry = new THREE.BufferGeometry();
        const vertices = [];
        const faces = [];
        
        const lines = text.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            if (line.startsWith('v ')) {
                const parts = line.split(/\s+/);
                vertices.push(
                    parseFloat(parts[1]),
                    parseFloat(parts[2]),
                    parseFloat(parts[3])
                );
            } else if (line.startsWith('f ')) {
                const parts = line.split(/\s+/);
                // Simple triangulation - assuming triangular faces
                if (parts.length === 4) {
                    faces.push(
                        parseInt(parts[1]) - 1,
                        parseInt(parts[2]) - 1,
                        parseInt(parts[3]) - 1
                    );
                }
            }
        }
        
        const positions = [];
        for (let face of faces) {
            positions.push(vertices[face * 3], vertices[face * 3 + 1], vertices[face * 3 + 2]);
        }
        
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        
        return geometry;
    }

    async loadSTEP(file) {
        try {
            this.showNotification('Loading STEP file...', 'info');
            
            if (window.occtImporter) {
                // Use OCCT Import JS for real STEP loading
                const geometry = await window.occtImporter.loadSTEPFile(file);
                this.addModelToScene(geometry, file.name);
                
                // Update file information with real data
                const occtResult = geometry.userData.importResult;
                if (occtResult) {
                    const fileInfo = window.occtImporter.getFileInfo(occtResult);
                    this.showCADFileInfo(fileInfo, file);
                } else {
                    this.showModelInfo(file);
                }
                
                this.showNotification('STEP file loaded successfully!', 'success');
            } else {
                console.error('OCCT importer not available');
                this.showNotification('CAD viewer not properly initialized', 'error');
            }
        } catch (error) {
            console.error('Error loading STEP file:', error);
            this.showNotification(`Failed to load STEP file: ${error.message}`, 'error');
        }
    }

    async loadIGES(file) {
        try {
            this.showNotification('Loading IGES file...', 'info');
            
            if (window.occtImporter) {
                // Use OCCT Import JS for real IGES loading
                const geometry = await window.occtImporter.loadIGESFile(file);
                this.addModelToScene(geometry, file.name);
                
                // Update file information with real data
                const occtResult = geometry.userData.importResult;
                if (occtResult) {
                    const fileInfo = window.occtImporter.getFileInfo(occtResult);
                    this.showCADFileInfo(fileInfo, file);
                } else {
                    this.showModelInfo(file);
                }
                
                this.showNotification('IGES file loaded successfully!', 'success');
            } else {
                console.error('OCCT importer not available');
                this.showNotification('CAD viewer not properly initialized', 'error');
            }
        } catch (error) {
            console.error('Error loading IGES file:', error);
            this.showNotification(`Failed to load IGES file: ${error.message}`, 'error');
        }
    }

    addModelToScene(object, fileName) {
        // Remove previous model
        if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
        }
        
        this.loadedModel = object;
        this.scene.add(object);
        
        // Center the model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        
        // Fit camera to view the entire model
        this.fitToView();
    }

    fitToView() {
        if (!this.loadedModel) return;
        
        const box = new THREE.Box3().setFromObject(this.loadedModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        
        const distance = maxDim * 2;
        this.camera.position.set(distance, distance, distance);
        this.camera.lookAt(0, 0, 0);
    }

    toggleMeasurementMode() {
        this.measurementMode = !this.measurementMode;
        const btn = document.getElementById('measure-tool');
        
        if (this.measurementMode) {
            btn.classList.add('active');
            this.renderer.domElement.style.cursor = 'crosshair';
            this.showMeasurementPanel();
        } else {
            btn.classList.remove('active');
            this.renderer.domElement.style.cursor = 'grab';
            this.hideMeasurementPanel();
        }
    }

    showMeasurementPanel() {
        const panel = document.getElementById('measurement-panel');
        if (panel) {
            panel.style.display = 'block';
            panel.classList.add('slide-in-right');
        }
    }

    hideMeasurementPanel() {
        const panel = document.getElementById('measurement-panel');
        if (panel) {
            panel.style.display = 'none';
        }
    }

    toggleSectionView() {
        const panel = document.querySelector('.section-panel');
        if (panel) {
            panel.classList.toggle('active');
        }
    }

    changeViewMode(mode) {
        if (!this.loadedModel) return;
        
        // Handle both single meshes and groups
        const meshes = this.loadedModel.type === 'Group' ? this.loadedModel.children : [this.loadedModel];
        
        meshes.forEach(mesh => {
            if (mesh.material) {
                switch (mode) {
                    case 'shaded':
                        mesh.material.wireframe = false;
                        mesh.material.transparent = false;
                        mesh.material.opacity = 1;
                        break;
                    case 'wireframe':
                        mesh.material.wireframe = true;
                        mesh.material.transparent = true;
                        mesh.material.opacity = 0.8;
                        break;
                    case 'hidden-line':
                        mesh.material.wireframe = true;
                        mesh.material.transparent = false;
                        mesh.material.opacity = 1;
                        break;
                }
            }
        });
    }

    showModelInfo(file) {
        let info;
        
        if (this.loadedModel) {
            const box = new THREE.Box3().setFromObject(this.loadedModel);
            const size = box.getSize(new THREE.Vector3());
            
            // Calculate triangles safely for both single meshes and groups
            let triangleCount = 0;
            try {
                if (this.loadedModel.type === 'Group') {
                    // Handle groups of meshes
                    this.loadedModel.children.forEach(child => {
                        if (child.geometry && child.geometry.attributes && child.geometry.attributes.position) {
                            triangleCount += child.geometry.attributes.position.count / 3;
                        }
                    });
                } else if (this.loadedModel.geometry && this.loadedModel.geometry.attributes && this.loadedModel.geometry.attributes.position) {
                    // Handle single mesh
                    triangleCount = this.loadedModel.geometry.attributes.position.count / 3;
                }
            } catch (error) {
                console.warn('Error calculating triangle count:', error);
                triangleCount = 'N/A';
            }
            
            info = {
                fileName: file.name,
                fileSize: this.formatFileSize(file.size),
                dimensions: {
                    x: size.x.toFixed(2),
                    y: size.y.toFixed(2),
                    z: size.z.toFixed(2)
                },
                volume: (size.x * size.y * size.z).toFixed(2),
                triangles: triangleCount
            };
        } else {
            // For files without loaded geometry
            info = {
                fileName: file.name,
                fileSize: this.formatFileSize(file.size),
                dimensions: {
                    x: 'N/A',
                    y: 'N/A',
                    z: 'N/A'
                },
                volume: 'N/A',
                triangles: 'N/A'
            };
        }
        
        this.createModelInfoPanel(info);
    }

    showCADFileInfo(cadInfo, file) {
        // Fallback to basic info if cadInfo is invalid
        if (!cadInfo || !cadInfo.dimensions) {
            console.warn('Invalid CAD file info, falling back to basic info');
            this.showModelInfo(file);
            return;
        }

        const info = {
            fileName: file.name,
            fileSize: this.formatFileSize(file.size),
            dimensions: {
                x: (cadInfo.dimensions.width || 0).toFixed(2),
                y: (cadInfo.dimensions.height || 0).toFixed(2),
                z: (cadInfo.dimensions.depth || 0).toFixed(2)
            },
            volume: (cadInfo.volume || 0).toFixed(2),
            triangles: cadInfo.totalTriangles || 0,
            vertices: cadInfo.totalVertices || 0,
            meshCount: cadInfo.meshCount || 0,
            materials: (cadInfo.materials ? cadInfo.materials.length : 0)
        };
        
        this.createCADInfoPanel(info);
    }

    createCADInfoPanel(info) {
        let panel = document.querySelector('.model-info');
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'model-info fade-in-scale';
            this.container.appendChild(panel);
        }
        
        panel.innerHTML = `
            <h5><i class="fas fa-cube"></i> CAD File Information</h5>
            <div class="model-info-grid">
                <div class="model-info-item">
                    <div class="model-info-label">File</div>
                    <div class="model-info-value">${info.fileName}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Size</div>
                    <div class="model-info-value">${info.fileSize}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Width</div>
                    <div class="model-info-value">${info.dimensions.x} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Height</div>
                    <div class="model-info-value">${info.dimensions.y} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Depth</div>
                    <div class="model-info-value">${info.dimensions.z} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Volume</div>
                    <div class="model-info-value">${info.volume} mm³</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Meshes</div>
                    <div class="model-info-value">${info.meshCount}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Triangles</div>
                    <div class="model-info-value">${(info.triangles || 0).toLocaleString()}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Vertices</div>
                    <div class="model-info-value">${(info.vertices || 0).toLocaleString()}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Materials</div>
                    <div class="model-info-value">${info.materials}</div>
                </div>
            </div>
        `;
    }

    createModelInfoPanel(info) {
        let panel = document.querySelector('.model-info');
        if (!panel) {
            panel = document.createElement('div');
            panel.className = 'model-info fade-in-scale';
            this.container.appendChild(panel);
        }
        
        panel.innerHTML = `
            <h5><i class="fas fa-info-circle"></i> Model Information</h5>
            <div class="model-info-grid">
                <div class="model-info-item">
                    <div class="model-info-label">File</div>
                    <div class="model-info-value">${info.fileName}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Size</div>
                    <div class="model-info-value">${info.fileSize}</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Width</div>
                    <div class="model-info-value">${info.dimensions.x} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Height</div>
                    <div class="model-info-value">${info.dimensions.y} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Depth</div>
                    <div class="model-info-value">${info.dimensions.z} mm</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Volume</div>
                    <div class="model-info-value">${info.volume} mm³</div>
                </div>
                <div class="model-info-item">
                    <div class="model-info-label">Triangles</div>
                    <div class="model-info-value">${typeof info.triangles === 'number' ? info.triangles.toLocaleString() : info.triangles}</div>
                </div>
            </div>
        `;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading(show) {
        let loader = document.querySelector('.viewer-loading');
        
        if (show) {
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'viewer-loading';
                loader.innerHTML = `
                    <div class="loading-spinner"></div>
                    <div class="loading-text">Loading CAD file...</div>
                `;
                this.container.appendChild(loader);
            }
        } else {
            if (loader) {
                loader.remove();
            }
        }
    }

    showError(title, message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'viewer-error fade-in-scale';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <h4>${title}</h4>
            <p>${message}</p>
        `;
        
        this.container.innerHTML = '';
        this.container.appendChild(errorDiv);
    }

    showPlaceholder(message) {
        const placeholder = document.createElement('div');
        placeholder.className = 'viewer-placeholder';
        placeholder.innerHTML = `
            <i class="fas fa-cube"></i>
            <p>${message}</p>
        `;
        
        this.container.innerHTML = '';
        this.container.appendChild(placeholder);
    }

    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update OrbitControls if available
        if (this.controls && this.controls.update) {
            this.controls.update();
        }
        
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    createPlaceholderModel() {
        // Create a simple cube as placeholder
        const geometry = new THREE.BoxGeometry(20, 20, 20);
        const material = new THREE.MeshPhongMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0.7,
            wireframe: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        this.addModelToScene(mesh, 'Placeholder Model');
    }

    showSTEPMessage() {
        this.showNotification('STEP file detected. Professional STEP viewer integration coming soon. File dimensions and specifications displayed.', 'info');
    }

    showIGESMessage() {
        this.showNotification('IGES file detected. Full IGES support requires OpenCASCADE.js integration. Showing placeholder for demo.', 'info');
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `viewer-notification ${type} fade-in-scale`;
        
        let bgColor, borderColor, textColor, iconClass, duration;
        
        switch (type) {
            case 'success':
                bgColor = '#d1fae5';
                borderColor = '#a7f3d0';
                textColor = '#065f46';
                iconClass = 'check-circle';
                duration = 3000;
                break;
            case 'warning':
                bgColor = '#fef3c7';
                borderColor = '#fcd34d';
                textColor = '#92400e';
                iconClass = 'exclamation-triangle';
                duration = 4000;
                break;
            case 'error':
                bgColor = '#fee2e2';
                borderColor = '#fecaca';
                textColor = '#dc2626';
                iconClass = 'exclamation-triangle';
                duration = 6000;
                break;
            default: // info
                bgColor = '#dbeafe';
                borderColor = '#93c5fd';
                textColor = '#1e40af';
                iconClass = 'info-circle';
                duration = 5000;
        }
        
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${bgColor};
            border: 1px solid ${borderColor};
            color: ${textColor};
            padding: 1rem 1.5rem;
            border-radius: 0.5rem;
            max-width: 300px;
            text-align: center;
            z-index: 20;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        notification.innerHTML = `
            <i class="fas fa-${iconClass}"></i>
            <p style="margin: 0.5rem 0 0 0; font-size: 0.875rem;">${message}</p>
        `;

        this.container.appendChild(notification);

        // Auto remove after specified duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.loadedModel) {
            this.scene.remove(this.loadedModel);
        }
    }
}

// Initialize CAD Viewer when needed
window.CADViewer = null;

// Function to initialize viewer when step 2 is reached
function initializeCADViewer() {
    if (!window.CADViewer) {
        window.CADViewer = new CADViewer();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CADViewer;
} 