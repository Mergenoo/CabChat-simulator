class PathFinder {
    constructor() {
        this.grid = null;
        this.gridSize = 5; // Size of each grid cell
        this.cityLayout = null;
        
        // A* algorithm properties
        this.openSet = [];
        this.closedSet = [];
        this.cameFrom = new Map();
        this.gScore = new Map();
        this.fScore = new Map();
    }
    
    init(cityLayout) {
        this.cityLayout = cityLayout;
        this.generateNavigationGrid();
    }
    
    generateNavigationGrid() {
        // Create a grid representation of the city for pathfinding
        const bounds = this.getCityBounds();
        const gridWidth = Math.ceil((bounds.maxX - bounds.minX) / this.gridSize);
        const gridHeight = Math.ceil((bounds.maxZ - bounds.minZ) / this.gridSize);
        
        this.grid = {
            width: gridWidth,
            height: gridHeight,
            minX: bounds.minX,
            minZ: bounds.minZ,
            cells: new Array(gridWidth * gridHeight).fill(0)
        };
        
        // Mark walkable areas (streets) and obstacles (buildings)
        this.markWalkableAreas();
        this.markObstacles();
    }
    
    getCityBounds() {
        // Calculate the bounds of the city
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        if (this.cityLayout.buildings) {
            this.cityLayout.buildings.forEach(building => {
                const pos = building.position;
                const size = building.size || 20;
                
                minX = Math.min(minX, pos.x - size);
                maxX = Math.max(maxX, pos.x + size);
                minZ = Math.min(minZ, pos.z - size);
                maxZ = Math.max(maxZ, pos.z + size);
            });
        }
        
        // Add padding
        const padding = 50;
        return {
            minX: minX - padding,
            maxX: maxX + padding,
            minZ: minZ - padding,
            maxZ: maxZ + padding
        };
    }
    
    markWalkableAreas() {
        // Mark street areas as walkable
        if (this.cityLayout.streets) {
            this.cityLayout.streets.forEach(street => {
                if (street.horizontal) {
                    this.markRectangleWalkable(
                        street.horizontal.position.x - street.horizontal.length / 2,
                        street.horizontal.position.z - street.horizontal.width / 2,
                        street.horizontal.length,
                        street.horizontal.width
                    );
                }
                
                if (street.vertical) {
                    this.markRectangleWalkable(
                        street.vertical.position.x - street.vertical.width / 2,
                        street.vertical.position.z - street.vertical.length / 2,
                        street.vertical.width,
                        street.vertical.length
                    );
                }
            });
        }
    }
    
    markObstacles() {
        // Mark building areas as obstacles
        if (this.cityLayout.buildings) {
            this.cityLayout.buildings.forEach(building => {
                const pos = building.position;
                const size = building.size || 20;
                
                this.markRectangleBlocked(
                    pos.x - size / 2,
                    pos.z - size / 2,
                    size,
                    size
                );
            });
        }
    }
    
    markRectangleWalkable(x, z, width, height) {
        const startGridX = Math.floor((x - this.grid.minX) / this.gridSize);
        const startGridZ = Math.floor((z - this.grid.minZ) / this.gridSize);
        const endGridX = Math.floor((x + width - this.grid.minX) / this.gridSize);
        const endGridZ = Math.floor((z + height - this.grid.minZ) / this.gridSize);
        
        for (let gx = startGridX; gx <= endGridX; gx++) {
            for (let gz = startGridZ; gz <= endGridZ; gz++) {
                if (this.isValidGridPosition(gx, gz)) {
                    const index = gz * this.grid.width + gx;
                    this.grid.cells[index] = 1; // Walkable
                }
            }
        }
    }
    
    markRectangleBlocked(x, z, width, height) {
        const startGridX = Math.floor((x - this.grid.minX) / this.gridSize);
        const startGridZ = Math.floor((z - this.grid.minZ) / this.gridSize);
        const endGridX = Math.floor((x + width - this.grid.minX) / this.gridSize);
        const endGridZ = Math.floor((z + height - this.grid.minZ) / this.gridSize);
        
        for (let gx = startGridX; gx <= endGridX; gx++) {
            for (let gz = startGridZ; gz <= endGridZ; gz++) {
                if (this.isValidGridPosition(gx, gz)) {
                    const index = gz * this.grid.width + gx;
                    this.grid.cells[index] = -1; // Blocked
                }
            }
        }
    }
    
    isValidGridPosition(x, z) {
        return x >= 0 && x < this.grid.width && z >= 0 && z < this.grid.height;
    }
    
    worldToGrid(worldPos) {
        return {
            x: Math.floor((worldPos.x - this.grid.minX) / this.gridSize),
            z: Math.floor((worldPos.z - this.grid.minZ) / this.gridSize)
        };
    }
    
    gridToWorld(gridPos) {
        return new THREE.Vector3(
            this.grid.minX + (gridPos.x + 0.5) * this.gridSize,
            0,
            this.grid.minZ + (gridPos.z + 0.5) * this.gridSize
        );
    }
    
    isWalkable(gridX, gridZ) {
        if (!this.isValidGridPosition(gridX, gridZ)) return false;
        
        const index = gridZ * this.grid.width + gridX;
        return this.grid.cells[index] === 1;
    }
    
    findPath(start, end) {
        const startGrid = this.worldToGrid(start);
        const endGrid = this.worldToGrid(end);
        
        // Check if start and end positions are valid
        if (!this.isWalkable(startGrid.x, startGrid.z)) {
            startGrid.x = this.findNearestWalkable(startGrid.x, startGrid.z).x;
            startGrid.z = this.findNearestWalkable(startGrid.x, startGrid.z).z;
        }
        
        if (!this.isWalkable(endGrid.x, endGrid.z)) {
            endGrid.x = this.findNearestWalkable(endGrid.x, endGrid.z).x;
            endGrid.z = this.findNearestWalkable(endGrid.x, endGrid.z).z;
        }
        
        return this.aStar(startGrid, endGrid);
    }
    
    findNearestWalkable(gridX, gridZ) {
        const maxRadius = 10;
        
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let dx = -radius; dx <= radius; dx++) {
                for (let dz = -radius; dz <= radius; dz++) {
                    if (Math.abs(dx) === radius || Math.abs(dz) === radius) {
                        const testX = gridX + dx;
                        const testZ = gridZ + dz;
                        
                        if (this.isWalkable(testX, testZ)) {
                            return { x: testX, z: testZ };
                        }
                    }
                }
            }
        }
        
        return { x: gridX, z: gridZ }; // Fallback
    }
    
    aStar(start, end) {
        // Initialize A* algorithm
        this.openSet = [start];
        this.closedSet = [];
        this.cameFrom = new Map();
        this.gScore = new Map();
        this.fScore = new Map();
        
        const startKey = `${start.x},${start.z}`;
        const endKey = `${end.x},${end.z}`;
        
        this.gScore.set(startKey, 0);
        this.fScore.set(startKey, this.heuristic(start, end));
        
        while (this.openSet.length > 0) {
            // Find node with lowest fScore
            let current = this.openSet[0];
            let currentIndex = 0;
            
            for (let i = 1; i < this.openSet.length; i++) {
                const nodeKey = `${this.openSet[i].x},${this.openSet[i].z}`;
                const currentKey = `${current.x},${current.z}`;
                
                if (this.fScore.get(nodeKey) < this.fScore.get(currentKey)) {
                    current = this.openSet[i];
                    currentIndex = i;
                }
            }
            
            // Remove current from openSet
            this.openSet.splice(currentIndex, 1);
            this.closedSet.push(current);
            
            // Check if we reached the goal
            if (current.x === end.x && current.z === end.z) {
                return this.reconstructPath(current, start);
            }
            
            // Check neighbors
            const neighbors = this.getNeighbors(current);
            
            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.x},${neighbor.z}`;
                
                // Skip if in closed set
                if (this.closedSet.some(node => node.x === neighbor.x && node.z === neighbor.z)) {
                    continue;
                }
                
                // Skip if not walkable
                if (!this.isWalkable(neighbor.x, neighbor.z)) {
                    continue;
                }
                
                const currentKey = `${current.x},${current.z}`;
                const tentativeGScore = this.gScore.get(currentKey) + this.distance(current, neighbor);
                
                // Add to open set if not already there
                if (!this.openSet.some(node => node.x === neighbor.x && node.z === neighbor.z)) {
                    this.openSet.push(neighbor);
                }
                
                // Skip if this path is worse
                if (this.gScore.has(neighborKey) && tentativeGScore >= this.gScore.get(neighborKey)) {
                    continue;
                }
                
                // This path is the best so far
                this.cameFrom.set(neighborKey, current);
                this.gScore.set(neighborKey, tentativeGScore);
                this.fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, end));
            }
        }
        
        // No path found
        return null;
    }
    
    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { x: -1, z: 0 },  // Left
            { x: 1, z: 0 },   // Right
            { x: 0, z: -1 },  // Up
            { x: 0, z: 1 },   // Down
            { x: -1, z: -1 }, // Diagonal
            { x: 1, z: -1 },
            { x: -1, z: 1 },
            { x: 1, z: 1 }
        ];
        
        for (const dir of directions) {
            const neighbor = {
                x: node.x + dir.x,
                z: node.z + dir.z
            };
            
            if (this.isValidGridPosition(neighbor.x, neighbor.z)) {
                neighbors.push(neighbor);
            }
        }
        
        return neighbors;
    }
    
    heuristic(a, b) {
        // Manhattan distance with diagonal movement
        const dx = Math.abs(a.x - b.x);
        const dz = Math.abs(a.z - b.z);
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    distance(a, b) {
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        return Math.sqrt(dx * dx + dz * dz);
    }
    
    reconstructPath(current, start) {
        const path = [];
        let node = current;
        
        while (node) {
            path.unshift(this.gridToWorld(node));
            
            const nodeKey = `${node.x},${node.z}`;
            node = this.cameFrom.get(nodeKey);
            
            // Prevent infinite loop
            if (node && node.x === start.x && node.z === start.z) {
                path.unshift(this.gridToWorld(start));
                break;
            }
        }
        
        return this.smoothPath(path);
    }
    
    smoothPath(path) {
        if (path.length <= 2) return path;
        
        const smoothed = [path[0]];
        let current = 0;
        
        while (current < path.length - 1) {
            let farthest = current + 1;
            
            // Find the farthest point we can reach in a straight line
            for (let i = current + 2; i < path.length; i++) {
                if (this.hasLineOfSight(path[current], path[i])) {
                    farthest = i;
                } else {
                    break;
                }
            }
            
            smoothed.push(path[farthest]);
            current = farthest;
        }
        
        return smoothed;
    }
    
    hasLineOfSight(start, end) {
        const startGrid = this.worldToGrid(start);
        const endGrid = this.worldToGrid(end);
        
        // Bresenham's line algorithm
        const dx = Math.abs(endGrid.x - startGrid.x);
        const dz = Math.abs(endGrid.z - startGrid.z);
        const sx = startGrid.x < endGrid.x ? 1 : -1;
        const sz = startGrid.z < endGrid.z ? 1 : -1;
        let err = dx - dz;
        
        let x = startGrid.x;
        let z = startGrid.z;
        
        while (true) {
            if (!this.isWalkable(x, z)) {
                return false;
            }
            
            if (x === endGrid.x && z === endGrid.z) {
                break;
            }
            
            const e2 = 2 * err;
            
            if (e2 > -dz) {
                err -= dz;
                x += sx;
            }
            
            if (e2 < dx) {
                err += dx;
                z += sz;
            }
        }
        
        return true;
    }
    
    findNearestStreet(position) {
        const gridPos = this.worldToGrid(position);
        const maxRadius = 20;
        
        for (let radius = 1; radius <= maxRadius; radius++) {
            for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
                const testX = Math.round(gridPos.x + Math.cos(angle) * radius);
                const testZ = Math.round(gridPos.z + Math.sin(angle) * radius);
                
                if (this.isWalkable(testX, testZ)) {
                    return this.gridToWorld({ x: testX, z: testZ });
                }
            }
        }
        
        return position; // Fallback
    }
    
    getRandomStreetPosition() {
        const maxAttempts = 100;
        
        for (let i = 0; i < maxAttempts; i++) {
            const x = Math.floor(Math.random() * this.grid.width);
            const z = Math.floor(Math.random() * this.grid.height);
            
            if (this.isWalkable(x, z)) {
                return this.gridToWorld({ x, z });
            }
        }
        
        // Fallback: return center of map
        return new THREE.Vector3(0, 0, 0);
    }
    
    isPositionAccessible(position) {
        const gridPos = this.worldToGrid(position);
        return this.isWalkable(gridPos.x, gridPos.z);
    }
    
    getPathDistance(path) {
        if (!path || path.length < 2) return 0;
        
        let distance = 0;
        for (let i = 1; i < path.length; i++) {
            distance += path[i - 1].distanceTo(path[i]);
        }
        
        return distance;
    }
    
    visualizeGrid(scene) {
        // Debug function to visualize the pathfinding grid
        const material = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00, 
            transparent: true, 
            opacity: 0.3 
        });
        const blockedMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xff0000, 
            transparent: true, 
            opacity: 0.3 
        });
        
        for (let x = 0; x < this.grid.width; x++) {
            for (let z = 0; z < this.grid.height; z++) {
                const index = z * this.grid.width + x;
                const cellValue = this.grid.cells[index];
                
                if (cellValue !== 0) {
                    const geometry = new THREE.PlaneGeometry(this.gridSize * 0.8, this.gridSize * 0.8);
                    const mesh = new THREE.Mesh(geometry, cellValue === 1 ? material : blockedMaterial);
                    
                    const worldPos = this.gridToWorld({ x, z });
                    mesh.position.copy(worldPos);
                    mesh.position.y = 0.1;
                    mesh.rotation.x = -Math.PI / 2;
                    
                    scene.add(mesh);
                }
            }
        }
    }
}

