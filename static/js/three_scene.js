// Three.js Scene Management for Drone Simulator
class ThreeScene {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.drones = [];
        this.paths = [];
        this.animationId = null;
        this.isAnimating = false;
        this.animationTime = 0;
        this.animationSpeed = 0.005;
        
        this.init();
    }
    
    init() {
        // Create scene
        this.scene = new THREE.Scene();
        
        // Create beautiful sky background
        this.createSkyBackground();
        
        // Create camera
        const aspect = this.container.clientWidth / this.container.clientHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(30, 20, 30);
        
        // Create renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        this.container.appendChild(this.renderer.domElement);
        
        // Create controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.1;
        this.controls.target.set(10, 5, 0);
        
        // Add lights
        this.setupLights();
        
        // Add realistic sun
        this.addRealisticSun();
        
        // Add ground plane
        this.addGroundPlane();
        
        // Add ground grid
        this.addGroundGrid();
        
        // Add coordinate axes
        this.addCoordinateAxes();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Start render loop
        this.animate();
    }
    
    createSkyBackground() {
        // Create gradient sky
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        // Create gradient
        const gradient = context.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#87ceeb'); // Sky blue at top
        gradient.addColorStop(0.8, '#e6f3ff'); // Light blue
        gradient.addColorStop(1, '#ffffff'); // White at horizon
        
        context.fillStyle = gradient;
        context.fillRect(0, 0, 512, 512);
        
        const texture = new THREE.CanvasTexture(canvas);
        this.scene.background = texture;
    }
    
    addRealisticSun() {
        // Create sun geometry
        const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        // Create sun
        const sun = new THREE.Mesh(sunGeometry, sunMaterial);
        sun.position.set(80, 60, 40);
        this.scene.add(sun);
        
        // Add sun glow effect
        const glowGeometry = new THREE.SphereGeometry(12, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffff99,
            transparent: true,
            opacity: 0.3
        });
        
        const sunGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        sunGlow.position.copy(sun.position);
        this.scene.add(sunGlow);
        
        // Add lens flare effect
        const flareGeometry = new THREE.SphereGeometry(15, 16, 16);
        const flareMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffffaa,
            transparent: true,
            opacity: 0.1
        });
        
        const sunFlare = new THREE.Mesh(flareGeometry, flareMaterial);
        sunFlare.position.copy(sun.position);
        this.scene.add(sunFlare);
    }
    
    addGroundPlane() {
        // Create realistic ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x4a5a3a,
            transparent: true,
            opacity: 0.9
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        ground.position.y = -0.1;
        this.scene.add(ground);
    }
    
    setupLights() {
        // Ambient light - softer for sky atmosphere
        const ambientLight = new THREE.AmbientLight(0x87ceeb, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light (sun) - warmer tone
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        directionalLight.position.set(100, 80, 50);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 4096;
        directionalLight.shadow.mapSize.height = 4096;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -60;
        directionalLight.shadow.camera.right = 60;
        directionalLight.shadow.camera.top = 60;
        directionalLight.shadow.camera.bottom = -60;
        this.scene.add(directionalLight);
        
        // Sky atmosphere lighting
        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x2e8b57, 0.6);
        this.scene.add(hemisphereLight);
    }
    
    addGroundGrid() {
        // Main grid
        const gridHelper = new THREE.GridHelper(50, 25, 0x888888, 0x444444);
        this.scene.add(gridHelper);
        
        // Ground plane (for shadows)
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x111111, 
            transparent: true, 
            opacity: 0.3 
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
    }
    
    addCoordinateAxes() {
        // Remove the center axis helper and add corner axes instead
        this.addCornerAxes();
        
        // Add axis labels
        this.addAxisLabels();
    }
    
    addCornerAxes() {
        // Create full-length axis lines at the corners
        const axisLength = 50;
        
        // X-axis (red) - horizontal line at far corner
        const xGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-25, 0, -25),
            new THREE.Vector3(25, 0, -25)
        ]);
        const xMaterial = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 3 });
        const xAxis = new THREE.Line(xGeometry, xMaterial);
        this.scene.add(xAxis);
        
        // Y-axis (green) - depth line at far corner
        const yGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-25, 0, -25),
            new THREE.Vector3(-25, 0, 25)
        ]);
        const yMaterial = new THREE.LineBasicMaterial({ color: 0x44ff44, linewidth: 3 });
        const yAxis = new THREE.Line(yGeometry, yMaterial);
        this.scene.add(yAxis);
        
        // Z-axis (blue) - vertical line at far corner
        const zGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-25, 0, -25),
            new THREE.Vector3(-25, 20, -25)
        ]);
        const zMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 3 });
        const zAxis = new THREE.Line(zGeometry, zMaterial);
        this.scene.add(zAxis);
    }
    
    addAxisLabels() {
        // Create a canvas for text rendering
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 64;
        canvas.height = 64;
        
        // Function to create text texture
        const createTextTexture = (text, color = 'white') => {
            context.clearRect(0, 0, 64, 64);
            context.fillStyle = color;
            context.font = 'Bold 32px Arial';
            context.textAlign = 'center';
            context.fillText(text, 32, 40);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // Create sprite material for each axis
        const createAxisLabel = (text, position, color) => {
            const texture = createTextTexture(text, color);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                transparent: true,
                alphaTest: 0.1
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.position.copy(position);
            sprite.scale.set(2, 2, 1);
            return sprite;
        };
        
        // Add X, Y, Z labels at corners/edges
        const xLabelPos = createAxisLabel('X', new THREE.Vector3(25, 0, -25), '#ff4444');
        const xLabelNeg = createAxisLabel('-X', new THREE.Vector3(-25, 0, -25), '#ff4444');
        const yLabelPos = createAxisLabel('Y', new THREE.Vector3(-25, 0, 25), '#44ff44');
        const yLabelNeg = createAxisLabel('-Y', new THREE.Vector3(-25, 0, -25), '#44ff44');
        const zLabel = createAxisLabel('Z', new THREE.Vector3(-25, 15, -25), '#4444ff');
        
        this.scene.add(xLabelPos);
        this.scene.add(xLabelNeg);
        this.scene.add(yLabelPos);
        this.scene.add(yLabelNeg);
        this.scene.add(zLabel);
        
        // Add coordinate grid labels on the ground plane
        this.addGridLabels();
    }
    
    addGridLabels() {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 32;
        canvas.height = 32;
        
        const createNumberTexture = (number) => {
            context.clearRect(0, 0, 32, 32);
            context.fillStyle = '#888888';
            context.font = 'Bold 16px Arial';
            context.textAlign = 'center';
            context.fillText(number.toString(), 16, 20);
            
            const texture = new THREE.CanvasTexture(canvas);
            texture.needsUpdate = true;
            return texture;
        };
        
        // Add grid labels every 5 units
        for (let i = -20; i <= 25; i += 5) {
            if (i === 0) continue; // Skip origin
            
            // X-axis labels
            const xTexture = createNumberTexture(i);
            const xSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                map: xTexture,
                transparent: true,
                alphaTest: 0.1
            }));
            xSprite.position.set(i, 0.5, -2);
            xSprite.scale.set(1.5, 1.5, 1);
            this.scene.add(xSprite);
            
            // Z-axis labels (Y in our coordinate system)
            const zTexture = createNumberTexture(i);
            const zSprite = new THREE.Sprite(new THREE.SpriteMaterial({ 
                map: zTexture,
                transparent: true,
                alphaTest: 0.1
            }));
            zSprite.position.set(-2, 0.5, i);
            zSprite.scale.set(1.5, 1.5, 1);
            this.scene.add(zSprite);
        }
    }
    
    createDroneGeometry() {
        // Create a detailed drone model
        const droneGroup = new THREE.Group();
        
        // Main body
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 0.2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.castShadow = true;
        droneGroup.add(body);
        
        // Propeller arms
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6);
        const armMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        
        // Four arms in X pattern
        for (let i = 0; i < 4; i++) {
            const arm = new THREE.Mesh(armGeometry, armMaterial);
            const angle = (i * Math.PI) / 2 + Math.PI / 4;
            arm.position.x = Math.cos(angle) * 0.6;
            arm.position.z = Math.sin(angle) * 0.6;
            arm.rotation.z = angle;
            arm.castShadow = true;
            droneGroup.add(arm);
            
            // Propellers
            const propGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.02, 3);
            const propMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x999999, 
                transparent: true, 
                opacity: 0.7 
            });
            const propeller = new THREE.Mesh(propGeometry, propMaterial);
            propeller.position.x = Math.cos(angle) * 1.2;
            propeller.position.z = Math.sin(angle) * 1.2;
            propeller.position.y = 0.15;
            propeller.userData.isRotating = true;
            propeller.castShadow = true;
            droneGroup.add(propeller);
        }
        
        // LED lights
        const ledGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const ledMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x00ff00, 
            emissive: 0x004400 
        });
        
        for (let i = 0; i < 4; i++) {
            const led = new THREE.Mesh(ledGeometry, ledMaterial);
            const angle = (i * Math.PI) / 2;
            led.position.x = Math.cos(angle) * 0.3;
            led.position.z = Math.sin(angle) * 0.3;
            led.position.y = 0.12;
            droneGroup.add(led);
        }
        
        return droneGroup;
    }
    
    addDrone(droneData) {
        const drone = this.createDroneGeometry();
        
        // Set initial position
        drone.position.set(
            droneData.start.x,
            droneData.start.z,
            droneData.start.y
        );
        
        // Store drone data
        drone.userData = {
            id: droneData.id,
            name: droneData.name,
            start: droneData.start,
            end: droneData.end,
            speed: droneData.speed || 1.0,
            is_primary: droneData.is_primary,
            has_conflict: droneData.has_conflict,
            originalPosition: { ...droneData.start }
        };
        
        // Color coding based on conflict status
        this.updateDroneColor(drone);
        
        this.scene.add(drone);
        this.drones.push(drone);
        
        // Add path line
        this.addDronePath(droneData);
        
        return drone;
    }
    
    updateDroneColor(drone) {
        const userData = drone.userData;
        let color = 0x666666; // Default gray
        
        if (userData.is_primary) {
            color = 0x0066ff; // Blue for primary
        } else if (userData.has_conflict) {
            color = 0xff3333; // Red for conflict
        } else {
            color = 0x33ff33; // Green for safe
        }
        
        // Update body color
        drone.children.forEach(child => {
            if (child.material && child.geometry.type === 'CylinderGeometry') {
                child.material.color.setHex(color);
            }
        });
    }
    
    addDronePath(droneData) {
        const points = [
            new THREE.Vector3(droneData.start.x, droneData.start.z, droneData.start.y),
            new THREE.Vector3(droneData.end.x, droneData.end.z, droneData.end.y)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        // Color based on conflict status
        let color = 0x666666;
        if (droneData.is_primary) {
            color = 0x0066ff;
        } else if (droneData.has_conflict) {
            color = 0xff3333;
        } else {
            color = 0x33ff33;
        }
        
        const material = new THREE.LineBasicMaterial({ 
            color: color,
            linewidth: 3,
            transparent: true,
            opacity: 0.8
        });
        
        const line = new THREE.Line(geometry, material);
        line.userData = {
            droneId: droneData.id,
            type: 'path'
        };
        
        this.scene.add(line);
        this.paths.push(line);
    }
    
    clearDrones() {
        // Remove all drones
        this.drones.forEach(drone => {
            this.scene.remove(drone);
        });
        this.drones = [];
        
        // Remove all paths
        this.paths.forEach(path => {
            this.scene.remove(path);
        });
        this.paths = [];
        
        // Reset animation
        this.stopAnimation();
        this.animationTime = 0;
    }
    
    updateDrones(dronesData, conflicts) {
        this.clearDrones();
        
        dronesData.forEach(droneData => {
            droneData.has_conflict = conflicts.includes(droneData.id);
            this.addDrone(droneData);
        });
    }
    
    startAnimation() {
        this.isAnimating = true;
        this.animationTime = 0;
    }
    
    pauseAnimation() {
        this.isAnimating = false;
    }
    
    stopAnimation() {
        this.isAnimating = false;
        this.animationTime = 0;
        
        // Reset all drones to start positions
        this.drones.forEach(drone => {
            const start = drone.userData.start;
            drone.position.set(start.x, start.z, start.y);
        });
    }
    
    updateAnimation() {
        if (!this.isAnimating) return;
        
        this.animationTime += this.animationSpeed;
        
        // Update drone positions
        this.drones.forEach(drone => {
            const userData = drone.userData;
            const start = userData.start;
            const end = userData.end;
            
            // Calculate path length and duration
            const pathLength = Math.sqrt(
                Math.pow(end.x - start.x, 2) +
                Math.pow(end.y - start.y, 2) +
                Math.pow(end.z - start.z, 2)
            );
            
            const duration = pathLength / userData.speed;
            const progress = Math.min(this.animationTime / duration, 1.0);
            
            // Interpolate position
            const x = start.x + (end.x - start.x) * progress;
            const y = start.y + (end.y - start.y) * progress;
            const z = start.z + (end.z - start.z) * progress;
            
            drone.position.set(x, z, y);
            
            // Rotate propellers
            drone.children.forEach(child => {
                if (child.userData.isRotating) {
                    child.rotation.y += 0.5;
                }
            });
        });
        
        // Check for real-time collisions during animation
        this.checkRealTimeCollisions();
        
        // Check if animation is complete
        const allComplete = this.drones.every(drone => {
            const userData = drone.userData;
            const start = userData.start;
            const end = userData.end;
            const pathLength = Math.sqrt(
                Math.pow(end.x - start.x, 2) +
                Math.pow(end.y - start.y, 2) +
                Math.pow(end.z - start.z, 2)
            );
            const duration = pathLength / userData.speed;
            return this.animationTime >= duration;
        });
        
        if (allComplete) {
            this.pauseAnimation();
            // Trigger simulation completion callback
            if (this.onSimulationComplete) {
                this.onSimulationComplete();
            }
        }
    }
    
    checkRealTimeCollisions() {
        if (!this.isAnimating || this.drones.length < 2) return;
        
        const collisionThreshold = 2.0;
        
        for (let i = 0; i < this.drones.length; i++) {
            for (let j = i + 1; j < this.drones.length; j++) {
                const drone1 = this.drones[i];
                const drone2 = this.drones[j];
                
                const distance = drone1.position.distanceTo(drone2.position);
                
                if (distance < collisionThreshold) {
                    this.pauseAnimation();
                    // Trigger immediate collision callback
                    if (this.onImmediateCollision) {
                        this.onImmediateCollision(drone1.userData, drone2.userData, {
                            position: drone1.position.clone(),
                            time: this.animationTime
                        });
                    }
                    return;
                }
            }
        }
    }
    
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.updateAnimation();
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
    
    dispose() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        if (this.container && this.renderer) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}
