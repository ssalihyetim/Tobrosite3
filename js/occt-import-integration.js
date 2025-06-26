/**
 * OCCT Import JS Integration
 * Real STEP/IGES file import using occt-import-js library
 */

class OCCTImporter {
    constructor() {
        this.occt = null;
        this.isInitialized = false;
        this.isInitializing = false;
    }

    async init() {
        if (this.isInitialized) {
            return this.occt;
        }

        if (this.isInitializing) {
            // Wait for existing initialization
            while (this.isInitializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return this.occt;
        }

        this.isInitializing = true;

        try {
            console.log('Initializing OCCT Import JS...');
            
            // Wait for occtimportjs to be available with timeout
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds timeout
            
            while (typeof occtimportjs === 'undefined' && attempts < maxAttempts) {
                console.log(`Waiting for occtimportjs... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 100));
                attempts++;
            }

            if (typeof occtimportjs === 'undefined') {
                throw new Error('OCCT Import JS library failed to load within timeout period');
            }

            console.log('OCCT Import JS library found, initializing...');
            this.occt = await occtimportjs();
            this.isInitialized = true;
            this.isInitializing = false;
            
            console.log('OCCT Import JS initialized successfully');
            return this.occt;
        } catch (error) {
            this.isInitializing = false;
            console.error('Failed to initialize OCCT Import JS:', error);
            throw new Error(`OCCT initialization failed: ${error.message}`);
        }
    }

    async loadSTEPFile(file) {
        if (!this.isInitialized) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fileBuffer = new Uint8Array(event.target.result);
                    
                    // Import parameters
                    const params = {
                        linearUnit: 'millimeter',
                        linearDeflectionType: 'bounding_box_ratio',
                        linearDeflection: 0.01,
                        angularDeflection: 0.1
                    };

                    console.log('Importing STEP file...');
                    const result = this.occt.ReadStepFile(fileBuffer, params);
                    
                    if (result.success) {
                        console.log('STEP file imported successfully:', result);
                        const geometry = this.convertToThreeGeometry(result);
                        resolve(geometry);
                    } else {
                        reject(new Error('Failed to import STEP file'));
                    }
                } catch (error) {
                    console.error('Error importing STEP file:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async loadIGESFile(file) {
        if (!this.isInitialized) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fileBuffer = new Uint8Array(event.target.result);
                    
                    // Import parameters
                    const params = {
                        linearUnit: 'millimeter',
                        linearDeflectionType: 'bounding_box_ratio',
                        linearDeflection: 0.01,
                        angularDeflection: 0.1
                    };

                    console.log('Importing IGES file...');
                    const result = this.occt.ReadIgesFile(fileBuffer, params);
                    
                    if (result.success) {
                        console.log('IGES file imported successfully:', result);
                        const geometry = this.convertToThreeGeometry(result);
                        resolve(geometry);
                    } else {
                        reject(new Error('Failed to import IGES file'));
                    }
                } catch (error) {
                    console.error('Error importing IGES file:', error);
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    convertToThreeGeometry(occtResult) {
        const group = new THREE.Group();
        
        if (!occtResult.meshes || occtResult.meshes.length === 0) {
            throw new Error('No meshes found in imported file');
        }

        console.log('Converting OCCT result to Three.js geometry:', occtResult);

        occtResult.meshes.forEach((mesh, index) => {
            try {
                console.log(`Processing mesh ${index}:`, mesh);
                
                const geometry = new THREE.BufferGeometry();
                let hasValidGeometry = false;
                
                // Check and set vertices
                if (mesh.attributes && mesh.attributes.position && mesh.attributes.position.array) {
                    const vertices = new Float32Array(mesh.attributes.position.array);
                    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
                    hasValidGeometry = true;
                    console.log(`Mesh ${index}: Added ${vertices.length / 3} vertices`);
                } else {
                    console.warn(`Mesh ${index}: No position data found`);
                    return; // Skip this mesh if no position data
                }
                
                // Set normals if available
                if (mesh.attributes && mesh.attributes.normal && mesh.attributes.normal.array) {
                    const normals = new Float32Array(mesh.attributes.normal.array);
                    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
                    console.log(`Mesh ${index}: Added normals`);
                } else {
                    // Compute normals if not provided
                    geometry.computeVertexNormals();
                    console.log(`Mesh ${index}: Computed vertex normals`);
                }
                
                // Set indices
                if (mesh.index && mesh.index.array) {
                    const indices = new Uint32Array(mesh.index.array);
                    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                    console.log(`Mesh ${index}: Added ${indices.length / 3} triangles`);
                }

                if (!hasValidGeometry) {
                    console.warn(`Mesh ${index}: No valid geometry data, skipping`);
                    return;
                }

                // Create material with color if available
                let material;
                if (mesh.color && Array.isArray(mesh.color) && mesh.color.length >= 3) {
                    material = new THREE.MeshPhongMaterial({
                        color: new THREE.Color(mesh.color[0], mesh.color[1], mesh.color[2]),
                        side: THREE.DoubleSide,
                        shininess: 30
                    });
                    console.log(`Mesh ${index}: Using mesh color RGB(${mesh.color.join(', ')})`);
                } else {
                    // Default material
                    material = new THREE.MeshPhongMaterial({
                        color: 0x4CAF50,
                        side: THREE.DoubleSide,
                        shininess: 30
                    });
                    console.log(`Mesh ${index}: Using default green color`);
                }

                const threeMesh = new THREE.Mesh(geometry, material);
                threeMesh.name = mesh.name || `CAD_Part_${index + 1}`;
                
                // Store additional metadata
                threeMesh.userData = {
                    isCADFile: true,
                    originalMesh: mesh,
                    materialInfo: mesh.color ? `RGB(${mesh.color.join(', ')})` : 'Default'
                };

                group.add(threeMesh);
                console.log(`Mesh ${index}: Successfully added to group`);
            } catch (error) {
                console.error(`Error processing mesh ${index}:`, error);
                // Continue with other meshes
            }
        });

        if (group.children.length === 0) {
            throw new Error('No valid geometry could be created from the imported file');
        }

        console.log(`Successfully created group with ${group.children.length} meshes`);

        // Store metadata on the group
        group.userData = {
            isCADFile: true,
            importResult: occtResult,
            meshCount: occtResult.meshes.length,
            hasHierarchy: occtResult.root && occtResult.root.children && occtResult.root.children.length > 0
        };

        return group;
    }

    getFileInfo(occtResult) {
        if (!occtResult || !occtResult.success) {
            console.warn('OCCT result is not successful or missing');
            return null;
        }

        const info = {
            success: occtResult.success,
            meshCount: occtResult.meshes ? occtResult.meshes.length : 0,
            totalVertices: 0,
            totalTriangles: 0,
            boundingBox: { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] },
            materials: []
        };

        if (occtResult.meshes && Array.isArray(occtResult.meshes)) {
            occtResult.meshes.forEach((mesh, index) => {
                try {
                    if (mesh.attributes && mesh.attributes.position && mesh.attributes.position.array) {
                        const vertices = mesh.attributes.position.array;
                        info.totalVertices += vertices.length / 3;

                        // Calculate bounding box
                        for (let i = 0; i < vertices.length; i += 3) {
                            const x = vertices[i];
                            const y = vertices[i + 1];
                            const z = vertices[i + 2];
                            
                            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                                info.boundingBox.min[0] = Math.min(info.boundingBox.min[0], x);
                                info.boundingBox.min[1] = Math.min(info.boundingBox.min[1], y);
                                info.boundingBox.min[2] = Math.min(info.boundingBox.min[2], z);
                                
                                info.boundingBox.max[0] = Math.max(info.boundingBox.max[0], x);
                                info.boundingBox.max[1] = Math.max(info.boundingBox.max[1], y);
                                info.boundingBox.max[2] = Math.max(info.boundingBox.max[2], z);
                            }
                        }
                    }

                    if (mesh.index && mesh.index.array) {
                        info.totalTriangles += mesh.index.array.length / 3;
                    }

                    if (mesh.color && Array.isArray(mesh.color)) {
                        info.materials.push({
                            name: mesh.name || `Part_${index + 1}`,
                            color: mesh.color
                        });
                    }
                } catch (error) {
                    console.warn(`Error processing mesh ${index} info:`, error);
                }
            });
        }

        // Handle case where no valid bounding box was found
        if (info.boundingBox.min[0] === Infinity) {
            console.warn('No valid bounding box found, using defaults');
            info.boundingBox = { min: [0, 0, 0], max: [10, 10, 10] };
        }

        // Calculate dimensions
        info.dimensions = {
            width: Math.abs(info.boundingBox.max[0] - info.boundingBox.min[0]),
            height: Math.abs(info.boundingBox.max[1] - info.boundingBox.min[1]),
            depth: Math.abs(info.boundingBox.max[2] - info.boundingBox.min[2])
        };

        // Estimate volume (simple bounding box volume)
        info.volume = info.dimensions.width * info.dimensions.height * info.dimensions.depth;

        console.log('Generated file info:', info);
        return info;
    }
}

// Create global instance
window.occtImporter = new OCCTImporter(); 