// Main Drone Simulator Application
class DroneSimulator {
    constructor() {
        this.threeScene = null;
        this.currentDrones = [];
        this.currentConflicts = [];
        this.currentScenario = null;
        
        this.init();
    }
    
    init() {
        // Initialize Three.js scene
        this.threeScene = new ThreeScene('threejs-container');
        
        // Set simulation completion callback
        this.threeScene.onSimulationComplete = () => this.onSimulationComplete();
        
        // Set immediate collision callback
        this.threeScene.onImmediateCollision = (drone1, drone2, collisionData) => 
            this.onImmediateCollision(drone1, drone2, collisionData);
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup expandable info panel
        this.setupExpandableInfo();
        
        // Load initial data
        this.loadScenarios();
    }
    
    setupEventListeners() {
        // Simulation controls
        const playBtn = document.getElementById('playBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const resetBtn = document.getElementById('resetBtn');
        const clearBtn = document.getElementById('clearBtn');
        const addDroneForm = document.getElementById('add-drone-form');
        
        if (playBtn) {
            playBtn.addEventListener('click', () => this.startSimulation());
        }
        
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pauseSimulation());
        }
        
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetSimulation());
        }
        
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllDrones());
        }
        
        if (addDroneForm) {
            addDroneForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.addCustomDrone();
            });
        }
    }
    
    async loadScenarios() {
        try {
            const response = await fetch('/api/scenarios');
            const data = await response.json();
            
            if (data.success) {
                this.displayScenarios(data.scenarios);
            } else {
                this.showError('Failed to load scenarios: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading scenarios: ' + error.message);
        }
    }
    
    displayScenarios(scenarios) {
        const container = document.getElementById('scenarios-list');
        container.innerHTML = '';
        
        scenarios.forEach(scenario => {
            const scenarioElement = document.createElement('div');
            scenarioElement.className = 'scenario-item';
            scenarioElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="fw-bold">${scenario.name}</div>
                        <small class="text-muted">${scenario.description}</small>
                    </div>
                    <span class="badge ${scenario.has_conflicts ? 'bg-danger' : 'bg-success'}">
                        ${scenario.has_conflicts ? 'Conflicts' : 'Safe'}
                    </span>
                </div>
            `;
            
            scenarioElement.addEventListener('click', () => {
                this.loadScenario(scenario.id);
                
                // Update active state
                document.querySelectorAll('.scenario-item').forEach(el => 
                    el.classList.remove('active'));
                scenarioElement.classList.add('active');
            });
            
            container.appendChild(scenarioElement);
        });
    }
    
    async loadScenario(scenarioId) {
        try {
            this.showLoading(true);
            
            const response = await fetch(`/api/load_scenario/${scenarioId}`);
            const data = await response.json();
            
            if (data.success) {
                this.currentScenario = data.scenario;
                this.currentDrones = data.drones;
                this.currentConflicts = data.conflicts;
                
                this.threeScene.updateDrones(this.currentDrones, this.currentConflicts);
                this.updateDronesList();
                this.resetSimulation();
            } else {
                this.showError('Failed to load scenario: ' + data.error);
            }
        } catch (error) {
            this.showError('Error loading scenario: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async addCustomDrone() {
        try {
            const formData = {
                name: document.getElementById('drone-name').value,
                start: {
                    x: parseFloat(document.getElementById('start-x').value),
                    y: parseFloat(document.getElementById('start-y').value),
                    z: parseFloat(document.getElementById('start-z').value)
                },
                end: {
                    x: parseFloat(document.getElementById('end-x').value),
                    y: parseFloat(document.getElementById('end-y').value),
                    z: parseFloat(document.getElementById('end-z').value)
                },
                speed: parseFloat(document.getElementById('drone-speed').value)
            };
            
            // Validate input
            if (!formData.name.trim()) {
                this.showError('Please enter a drone name');
                return;
            }
            
            // Check for NaN values
            const coords = [
                formData.start.x, formData.start.y, formData.start.z,
                formData.end.x, formData.end.y, formData.end.z, formData.speed
            ];
            
            if (coords.some(val => isNaN(val))) {
                this.showError('Please enter valid numeric coordinates');
                return;
            }
            
            this.showLoading(true);
            
            const response = await fetch('/api/add_drone', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentDrones = data.all_drones;
                this.currentConflicts = data.conflicts;
                
                this.threeScene.updateDrones(this.currentDrones, this.currentConflicts);
                this.updateDronesList();
                this.clearDroneForm();
                this.resetSimulation();
                
                this.showSuccess(`Drone "${formData.name}" added successfully`);
            } else {
                this.showError('Failed to add drone: ' + data.error);
            }
        } catch (error) {
            this.showError('Error adding drone: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    async clearAllDrones() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/clear_drones', {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.currentDrones = [];
                this.currentConflicts = [];
                this.currentScenario = null;
                
                this.threeScene.clearDrones();
                this.updateDronesList();
                this.resetSimulation();
                
                // Clear active scenario
                document.querySelectorAll('.scenario-item').forEach(el => 
                    el.classList.remove('active'));
                    
                this.showSuccess('All drones cleared');
            } else {
                this.showError('Failed to clear drones: ' + data.error);
            }
        } catch (error) {
            this.showError('Error clearing drones: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }
    
    updateDronesList() {
        const container = document.getElementById('drones-list');
        
        if (this.currentDrones.length === 0) {
            container.innerHTML = '<p class="text-muted text-center mb-0">No drones loaded</p>';
            return;
        }
        
        container.innerHTML = '';
        
        this.currentDrones.forEach(drone => {
            const droneElement = document.createElement('div');
            
            let statusClass = 'safe';
            let statusText = 'Safe';
            
            if (drone.is_primary) {
                statusClass = 'primary';
                statusText = 'Primary';
            } else if (drone.has_conflict) {
                statusClass = 'conflict';
                statusText = 'Conflict';
            }
            
            droneElement.className = `drone-item ${statusClass}`;
            droneElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <div class="drone-name">
                            <span class="conflict-indicator ${statusClass}"></span>
                            ${drone.name}
                        </div>
                        <div class="drone-coords mt-1">
                            <small>
                                Start: (${drone.start.x.toFixed(1)}, ${drone.start.y.toFixed(1)}, ${drone.start.z.toFixed(1)})<br>
                                End: (${drone.end.x.toFixed(1)}, ${drone.end.y.toFixed(1)}, ${drone.end.z.toFixed(1)})<br>
                                Speed: ${drone.speed.toFixed(1)} m/s
                            </small>
                        </div>
                    </div>
                    <div class="d-flex gap-2 align-items-center">
                        <span class="badge bg-${statusClass === 'conflict' ? 'danger' : statusClass === 'primary' ? 'primary' : 'success'}">
                            ${statusText}
                        </span>
                        <button class="btn btn-outline-danger btn-sm" onclick="droneSimulator.removeDrone(${drone.id})" title="Remove drone">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
            `;
            
            container.appendChild(droneElement);
        });
        
        // Update real-time info panel
        this.updateActiveDroneInfo();
    }
    
    setupExpandableInfo() {
        const infoPanel = document.getElementById('active-drone-info');
        const header = document.getElementById('info-header');
        
        if (!infoPanel || !header) return;
        
        // Set initial state as expanded
        this.infoPanelExpanded = true;
        
        // Add click handler for expand/collapse
        header.addEventListener('click', () => {
            this.toggleInfoPanel();
        });
        
        // Auto-expand when new drone data is loaded
        this.autoExpandOnUpdate = true;
    }

    toggleInfoPanel() {
        const infoPanel = document.getElementById('active-drone-info');
        const icon = infoPanel.querySelector('.expansion-icon');
        
        this.infoPanelExpanded = !this.infoPanelExpanded;
        
        if (this.infoPanelExpanded) {
            infoPanel.classList.remove('collapsed');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-up');
        } else {
            infoPanel.classList.add('collapsed');
            icon.classList.remove('fa-chevron-up');
            icon.classList.add('fa-chevron-down');
        }
    }

    updateActiveDroneInfo() {
        const infoElement = document.getElementById('active-drones-info');
        const infoPanel = document.getElementById('active-drone-info');
        if (!infoElement) return;
        
        // Show expanding animation when new info is gathered
        if (this.autoExpandOnUpdate && this.currentDrones.length > 0) {
            infoPanel.classList.add('info-updated');
            
            // Ensure panel is expanded when new data comes in
            if (!this.infoPanelExpanded) {
                this.toggleInfoPanel();
            }
            
            // Add expanding animation
            infoPanel.classList.add('info-panel-expanding');
            
            setTimeout(() => {
                infoPanel.classList.remove('info-updated', 'info-panel-expanding');
            }, 800);
        }
        
        if (this.currentDrones.length === 0) {
            infoElement.innerHTML = `
                <span class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    No active drones
                </span>
            `;
            return;
        }
        
        const activeCount = this.currentDrones.length;
        const conflictCount = this.currentDrones.filter(d => d.has_conflict).length;
        const primaryCount = this.currentDrones.filter(d => d.is_primary).length;
        
        const totalDistance = this.currentDrones.reduce((sum, drone) => {
            const distance = Math.sqrt(
                Math.pow(drone.end.x - drone.start.x, 2) +
                Math.pow(drone.end.y - drone.start.y, 2) +
                Math.pow(drone.end.z - drone.start.z, 2)
            );
            return sum + distance;
        }, 0);
        
        const avgSpeed = this.currentDrones.reduce((sum, drone) => sum + drone.speed, 0) / activeCount;
        
        infoElement.innerHTML = `
            <div class="d-flex flex-column gap-2">
                <div class="d-flex gap-3 align-items-center flex-wrap">
                    <span class="text-info">
                        <i class="fas fa-drone me-1"></i>
                        <strong>${activeCount}</strong> Active Drone${activeCount !== 1 ? 's' : ''}
                    </span>
                    ${conflictCount > 0 ? `
                        <span class="text-danger">
                            <i class="fas fa-exclamation-triangle me-1"></i>
                            <strong>${conflictCount}</strong> Conflict${conflictCount !== 1 ? 's' : ''}
                        </span>
                    ` : `
                        <span class="text-success">
                            <i class="fas fa-check-circle me-1"></i>
                            All Clear
                        </span>
                    `}
                    ${primaryCount > 0 ? `
                        <span class="text-primary">
                            <i class="fas fa-star me-1"></i>
                            <strong>${primaryCount}</strong> Primary
                        </span>
                    ` : ''}
                </div>
                <div class="d-flex gap-3 align-items-center flex-wrap small">
                    <span class="text-muted">
                        <i class="fas fa-ruler me-1"></i>
                        Distance: <strong>${totalDistance.toFixed(1)}m</strong>
                    </span>
                    <span class="text-muted">
                        <i class="fas fa-tachometer-alt me-1"></i>
                        Avg Speed: <strong>${avgSpeed.toFixed(1)} m/s</strong>
                    </span>
                </div>
                <div class="mt-1 pt-2 border-top border-opacity-25">
                    <div class="row g-2">
                        ${this.currentDrones.map(drone => `
                            <div class="col-12">
                                <div class="d-flex justify-content-between align-items-center small">
                                    <span class="${drone.has_conflict ? 'text-danger' : drone.is_primary ? 'text-primary' : 'text-success'}">
                                        <i class="fas fa-circle me-1" style="font-size: 0.6em;"></i>
                                        ${drone.name}
                                    </span>
                                    <span class="text-muted">${drone.speed.toFixed(1)} m/s</span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    async removeDrone(droneId) {
        if (!confirm('Are you sure you want to remove this drone?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/remove_drone/${droneId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            if (data.success) {
                await this.loadDrones();
                this.showSuccess('Drone removed successfully');
            } else {
                this.showError('Failed to remove drone: ' + data.error);
            }
        } catch (error) {
            this.showError('Error removing drone: ' + error.message);
        }
    }
    
    startSimulation() {
        if (this.currentDrones.length === 0) {
            this.showError('No drones to simulate. Load a scenario or add custom drones.');
            return;
        }
        
        this.threeScene.startAnimation();
        
        document.getElementById('playBtn').disabled = true;
        document.getElementById('pauseBtn').disabled = false;
        
        this.showSuccess('Simulation started');
    }
    
    pauseSimulation() {
        this.threeScene.pauseAnimation();
        
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        this.showSuccess('Simulation paused');
    }
    
    resetSimulation() {
        this.threeScene.stopAnimation();
        
        document.getElementById('playBtn').disabled = false;
        document.getElementById('pauseBtn').disabled = true;
        
        this.showSuccess('Simulation reset');
    }
    
    clearDroneForm() {
        document.getElementById('add-drone-form').reset();
        document.getElementById('drone-speed').value = '1.0';
    }
    
    showLoading(show) {
        // You can implement a loading indicator here
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = show;
        });
    }
    
    showError(message) {
        console.error(message);
        // You can implement a toast notification system here
        alert('Error: ' + message);
    }
    
    showSuccess(message) {
        console.log(message);
        // You can implement a toast notification system here
    }
    
    onSimulationComplete() {
        // Analyze simulation results
        this.analyzeSimulationResults();
    }
    
    onImmediateCollision(drone1, drone2, collisionData) {
        this.showImmediateCollisionDialog(drone1, drone2, collisionData);
    }
    
    showImmediateCollisionDialog(drone1, drone2, collisionData) {
        const suggestions = [
            {
                title: 'Increase Altitude Separation',
                description: 'Increase altitude separation between drones to avoid collision.',
                type: 'altitude',
                droneIds: [drone1.id, drone2.id],
                newAltitudes: [
                    drone1.start.z + 3,
                    drone2.start.z - 3
                ]
            },
            {
                title: 'Adjust Flight Timing',
                description: 'Adjust flight timing to avoid temporal overlap.',
                type: 'delay',
                droneIds: [drone1.id, drone2.id],
                delays: [30, 0]
            },
            {
                title: 'Modify Routes',
                description: 'Modify routes to create safe corridors.',
                type: 'route',
                droneIds: [drone1.id, drone2.id],
                newPaths: [
                    this.calculateAlternativeRoute(drone1),
                    this.calculateAlternativeRoute(drone2)
                ]
            }
        ];

        const modal = this.createModal('⚠️ COLLISION DETECTED!', `
            <div class="alert alert-danger">
                <h5 class="text-danger"><i class="fas fa-exclamation-triangle me-2"></i>Immediate Collision Detected!</h5>
                <p class="mb-3">Two drones have collided during the simulation:</p>
                <div class="row mb-3">
                    <div class="col-6">
                        <div class="card bg-danger bg-opacity-10 border-danger">
                            <div class="card-body">
                                <h6 class="text-danger">${drone1.name}</h6>
                                <small class="text-muted">
                                    Position: (${collisionData.position.x.toFixed(1)}, ${collisionData.position.z.toFixed(1)}, ${collisionData.position.y.toFixed(1)})<br>
                                    Time: ${collisionData.time.toFixed(2)}s
                                </small>
                            </div>
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="card bg-danger bg-opacity-10 border-danger">
                            <div class="card-body">
                                <h6 class="text-danger">${drone2.name}</h6>
                                <small class="text-muted">
                                    Position: (${collisionData.position.x.toFixed(1)}, ${collisionData.position.z.toFixed(1)}, ${collisionData.position.y.toFixed(1)})<br>
                                    Time: ${collisionData.time.toFixed(2)}s
                                </small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="alert alert-warning">
                <h6><i class="fas fa-tools me-2"></i>Emergency Action Required</h6>
                <p class="mb-2">The simulation has been stopped to prevent further collision. Please select an action:</p>
                <form id="collision-suggestion-form">
                    ${suggestions.map((s, i) => `
                        <div class="form-check mb-2">
                            <input class="form-check-input" type="radio" name="collisionSolution" id="collisionSolution${i}" value="${i}" ${i === 0 ? 'checked' : ''}>
                            <label class="form-check-label" for="collisionSolution${i}">
                                <strong>${s.title}</strong><br>
                                <small class="text-muted">${s.description}</small>
                            </label>
                        </div>
                    `).join('')}
                </form>
            </div>
            <div class="text-center">
                <button type="button" class="btn btn-success me-2" onclick="droneSimulator.acceptImmediateCollisionSolution()">
                    <i class="fas fa-check me-1"></i>Accept
                </button>
                <button type="button" class="btn btn-danger" onclick="droneSimulator.declineImmediateCollisionSolution()">
                    <i class="fas fa-times me-1"></i>Decline
                </button>
            </div>
        `);

        // Store suggestions for later use
        this._immediateCollisionSuggestions = suggestions;
        modal.show();
    }

    async acceptImmediateCollisionSolution() {
        const selected = document.querySelector('input[name="collisionSolution"]:checked');
        if (!selected) {
            this.showError('Please select a solution first');
            return;
        }
        const idx = parseInt(selected.value);
        const suggestion = this._immediateCollisionSuggestions[idx];

        try {
            // Show loading state
            const acceptBtn = document.querySelector('.btn-success[onclick="droneSimulator.acceptImmediateCollisionSolution()"]');
            if (acceptBtn) {
                acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Applying...';
                acceptBtn.disabled = true;
            }

            // Apply the selected solution immediately
            switch (suggestion.type) {
                case 'altitude':
                    // Adjust altitude for both drones
                    await Promise.all([
                        this.adjustDroneAltitude(suggestion.droneIds[0], suggestion.newAltitudes[0]),
                        this.adjustDroneAltitude(suggestion.droneIds[1], suggestion.newAltitudes[1])
                    ]);
                    break;
                case 'delay':
                    // Simulate delay by reducing speed (or implement your own delay logic)
                    await Promise.all([
                        this.adjustDroneSpeed(suggestion.droneIds[0], 0.6),
                        this.adjustDroneSpeed(suggestion.droneIds[1], 0.6)
                    ]);
                    break;
                case 'route':
                    await Promise.all([
                        this.adjustDroneRoute(suggestion.droneIds[0], suggestion.newPaths[0]),
                        this.adjustDroneRoute(suggestion.droneIds[1], suggestion.newPaths[1])
                    ]);
                    break;
            }

            this.closeConflictModal();
            this.showSuccess('Solution applied successfully! Conflict resolved.');
            await this.refreshDroneData();
            this.resetSimulation();

        } catch (error) {
            this.showError('Failed to apply solution: ' + error.message);
            // Reset button state
            const acceptBtn = document.querySelector('.btn-success[onclick="droneSimulator.acceptImmediateCollisionSolution()"]');
            if (acceptBtn) {
                acceptBtn.innerHTML = '<i class="fas fa-check me-1"></i>Accept';
                acceptBtn.disabled = false;
            }
        }
    }

    declineImmediateCollisionSolution() {
        this.closeConflictModal();
        this.showInfo('No changes made. Simulation remains stopped.');
    }
    
    analyzeSimulationResults() {
        const conflictedDrones = this.currentDrones.filter(drone => drone.has_conflict);
        const primaryDrone = this.currentDrones.find(drone => drone.is_primary);
        
        if (conflictedDrones.length > 0) {
            this.showConflictDialog(conflictedDrones, primaryDrone);
        } else {
            this.showSuccessDialog();
        }
    }
    
    showConflictDialog(conflictedDrones, primaryDrone) {
        const conflictDetails = this.analyzeConflicts(conflictedDrones, primaryDrone);
        
        const modal = this.createModal('Simulation Results - Conflicts Detected', `
            <div class="alert alert-danger">
                <h6><i class="fas fa-exclamation-triangle me-2"></i>Flight Conflicts Detected</h6>
                <p class="mb-2">The simulation detected ${conflictedDrones.length} drone(s) with path conflicts:</p>
                <ul class="mb-3">
                    ${conflictedDrones.map(drone => `
                        <li><strong>${drone.name}</strong> - Path: (${drone.start.x}, ${drone.start.y}, ${drone.start.z}) → (${drone.end.x}, ${drone.end.y}, ${drone.end.z})</li>
                    `).join('')}
                </ul>
            </div>
            
            <div class="alert alert-info">
                <h6><i class="fas fa-lightbulb me-2"></i>Suggested Solutions</h6>
                ${conflictDetails.suggestions.map((suggestion, index) => `
                    <div class="form-check mb-2">
                        <input class="form-check-input" type="checkbox" name="solution" id="solution${index}" value="${index}" onchange="droneSimulator.toggleSolutionButtons()">
                        <label class="form-check-label" for="solution${index}">
                            <strong>${suggestion.title}</strong><br>
                            <small class="text-muted">${suggestion.description}</small>
                        </label>
                    </div>
                `).join('')}
            </div>
            
            <div class="text-center" id="conflictButtons">
                <button type="button" class="btn btn-secondary me-2" onclick="droneSimulator.adjustPaths()">
                    <i class="fas fa-edit me-1"></i>Adjust Paths
                </button>
                <button type="button" class="btn btn-warning" onclick="droneSimulator.resetPaths()">
                    <i class="fas fa-undo me-1"></i>Reset Paths
                </button>
            </div>
            <div class="text-center d-none" id="acceptDeclineButtons">
                <button type="button" class="btn btn-success me-2" onclick="droneSimulator.acceptSolution()">
                    <i class="fas fa-check me-1"></i>Accept
                </button>
                <button type="button" class="btn btn-danger" onclick="droneSimulator.declineSolution()">
                    <i class="fas fa-times me-1"></i>Decline
                </button>
            </div>
        `);
        
        modal.show();
    }
    
    showSuccessDialog() {
        const modal = this.createModal('Simulation Results - Success', `
            <div class="alert alert-success text-center">
                <i class="fas fa-check-circle fa-3x mb-3 text-success"></i>
                <h5>Route Clear!</h5>
                <p class="mb-0">All drones completed their flight paths without conflicts.</p>
                <p class="text-muted mt-2">The flight plan is safe for execution.</p>
            </div>
            
            <div class="text-center">
                <button type="button" class="btn btn-success" data-bs-dismiss="modal">
                    <i class="fas fa-thumbs-up me-1"></i>Excellent!
                </button>
            </div>
        `);
        
        modal.show();
    }
    
    analyzeConflicts(conflictedDrones, primaryDrone) {
        const suggestions = [];
        
        if (primaryDrone && primaryDrone.has_conflict) {
            // Altitude adjustment
            suggestions.push({
                title: 'Altitude Adjustment',
                description: `Raise primary drone altitude from ${primaryDrone.start.z}m to ${primaryDrone.start.z + 3}m`,
                type: 'altitude',
                droneId: primaryDrone.id,
                newAltitude: primaryDrone.start.z + 3
            });
            
            // Time delay
            suggestions.push({
                title: 'Time Delay',
                description: 'Delay primary drone departure by 30 seconds to avoid conflict window',
                type: 'delay',
                droneId: primaryDrone.id,
                delay: 30
            });
            
            // Route adjustment
            suggestions.push({
                title: 'Route Adjustment',
                description: 'Adjust primary drone path to avoid conflict zones',
                type: 'route',
                droneId: primaryDrone.id,
                newPath: this.calculateAlternativeRoute(primaryDrone)
            });
        } else {
            // Speed adjustment for conflicted drones
            suggestions.push({
                title: 'Speed Adjustment',
                description: 'Reduce speed of conflicted drones to create temporal separation',
                type: 'speed',
                affectedDrones: conflictedDrones.map(d => d.id)
            });
        }
        
        return { suggestions };
    }
    
    calculateAlternativeRoute(drone) {
        // Simple route adjustment - add a waypoint to avoid conflicts
        const midX = (drone.start.x + drone.end.x) / 2;
        const midY = drone.start.y + 5; // Offset in Y direction
        const midZ = drone.start.z;
        
        return {
            start: drone.start,
            waypoint: { x: midX, y: midY, z: midZ },
            end: drone.end
        };
    }
    
    toggleSolutionButtons() {
        const selectedSolutions = document.querySelectorAll('input[name="solution"]:checked');
        const conflictButtons = document.getElementById('conflictButtons');
        const acceptDeclineButtons = document.getElementById('acceptDeclineButtons');
        
        if (selectedSolutions.length > 0) {
            conflictButtons.classList.add('d-none');
            acceptDeclineButtons.classList.remove('d-none');
        } else {
            conflictButtons.classList.remove('d-none');
            acceptDeclineButtons.classList.add('d-none');
        }
    }
    
    async acceptSolution() {
        const selectedSolutions = document.querySelectorAll('input[name="solution"]:checked');
        if (selectedSolutions.length === 0) {
            this.showError('Please select at least one solution first');
            return;
        }
        
        const conflictDetails = this.analyzeConflicts(
            this.currentDrones.filter(drone => drone.has_conflict),
            this.currentDrones.find(drone => drone.is_primary)
        );
        
        try {
            // Show loading state
            const acceptBtn = document.querySelector('.btn-success[onclick="droneSimulator.acceptSolution()"]');
            if (acceptBtn) {
                acceptBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Applying...';
                acceptBtn.disabled = true;
            }
            
            // Apply all selected solutions
            for (const checkbox of selectedSolutions) {
                const solutionIndex = parseInt(checkbox.value);
                const solution = conflictDetails.suggestions[solutionIndex];
                await this.implementSolution(solution);
            }
            
            // Close modal
            this.closeConflictModal();
            
            this.showSuccess(`${selectedSolutions.length} solution(s) applied successfully! Conflicts resolved.`);
            
            // Reload drones to see updated data
            await this.loadDrones();
            
        } catch (error) {
            this.showError('Failed to apply solution: ' + error.message);
            
            // Reset button state
            const acceptBtn = document.querySelector('.btn-success[onclick="droneSimulator.acceptSolution()"]');
            if (acceptBtn) {
                acceptBtn.innerHTML = '<i class="fas fa-check me-1"></i>Accept';
                acceptBtn.disabled = false;
            }
        }
    }
    
    adjustPaths() {
        this.closeConflictModal();
        this.showInfo('Please manually adjust drone paths in the control panel.');
    }
    
    resetPaths() {
        this.closeConflictModal();
        this.resetSimulation();
        this.showInfo('Simulation reset. All drones returned to starting positions.');
    }
    
    declineSolution() {
        // Simply close the modal without making any changes
        this.closeConflictModal();
        this.showInfo('No changes made. Current drone paths preserved.');
    }
    
    closeConflictModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            const modalInstance = bootstrap.Modal.getInstance(modal);
            if (modalInstance) modalInstance.hide();
        });
    }
    
    async implementSolution(solution) {
        switch (solution.type) {
            case 'altitude':
                await this.adjustDroneAltitude(solution.droneId, solution.newAltitude);
                break;
            case 'delay':
                await this.adjustDroneSpeed(solution.droneId, 0.6); // Reduce speed to simulate delay
                break;
            case 'route':
                await this.adjustDroneRoute(solution.droneId, solution.newPath);
                break;
            case 'speed':
                for (const droneId of solution.affectedDrones) {
                    await this.adjustDroneSpeed(droneId, 0.6);
                }
                break;
        }
    }
    
    async adjustDroneAltitude(droneId, newAltitude) {
        const response = await fetch(`/api/update_drone/${droneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                start_z: newAltitude,
                end_z: newAltitude
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update drone altitude');
        }
    }
    
    async adjustDroneSpeed(droneId, newSpeed) {
        const response = await fetch(`/api/update_drone/${droneId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                speed: newSpeed
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update drone speed');
        }
    }
    
    async adjustDroneRoute(droneId, newPath) {
        if (newPath.waypoint) {
            const response = await fetch(`/api/update_drone/${droneId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    start_y: newPath.waypoint.y,
                    end_y: newPath.waypoint.y
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update drone route');
            }
        }
    }
    
    async refreshDroneData() {
        const response = await fetch('/api/drones');
        const data = await response.json();
        
        if (data.success) {
            this.currentDrones = data.drones;
            this.currentConflicts = data.conflicts;
            this.threeScene.updateDrones(this.currentDrones, this.currentConflicts);
            this.updateDronesList();
        }
    }
    
    createModal(title, content) {
        // Remove existing modal if any
        const existingModal = document.querySelector('#resultModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHtml = `
            <div class="modal fade" id="resultModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        const modal = new bootstrap.Modal(document.getElementById('resultModal'));
        return modal;
    }
    
    showSuccess(message) {
        this.showMessage(message, 'success');
    }
    
    showError(message) {
        this.showMessage(message, 'error');
    }
    
    showInfo(message) {
        this.showMessage(message, 'info');
    }
    
    showMessage(message, type) {
        // Create a toast notification
        const toastContainer = document.getElementById('toastContainer') || this.createToastContainer();
        const toastId = 'toast_' + Date.now();
        
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-danger' : 'alert-info';
        
        const iconClass = type === 'success' ? 'fas fa-check-circle' : 
                         type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-info-circle';
        
        const toastHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" id="${toastId}" role="alert">
                <i class="${iconClass} me-2"></i>${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            const toast = document.getElementById(toastId);
            if (toast) toast.remove();
        }, 5000);
    }
    
    createToastContainer() {
        const container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'position-fixed top-0 end-0 p-3';
        container.style.zIndex = '1055';
        document.body.appendChild(container);
        return container;
    }
}

// Global reference for modal access
let droneSimulator;

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    droneSimulator = new DroneSimulator();
});
