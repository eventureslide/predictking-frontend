// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyA61LVsUjl1CsR3XeMyEjjZ-DDU6rMHwhU",
    authDomain: "predictking-database.firebaseapp.com",
    projectId: "predictking-database",
    storageBucket: "predictking-database.firebasestorage.app",
    messagingSenderId: "786291226968",
    appId: "1:786291226968:web:4608df217228f4ecdf0d2d"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let currentTheme = 'default';
let events = [];
let leaderboard = [];
let adminSettings = {
    vigPercentage: 5,
    dailyBuyinLimit: 1000,
    perAdReward: 50,
    activeAds: [
        'https://www.youtube.com/embed/r9xWOA_S3_g',
        'https://www.youtube.com/embed/srRdl60cDVw'
    ]
};


// Viewport monitoring for mobile-only access
function checkViewportSize() {
    if (window.innerWidth > 768) {
        // Show mobile-only message if window gets resized to desktop size
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #141414, #1a1a1a);
                color: #FFF3DA;
                font-family: 'Orbitron', monospace;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                text-align: center;
                padding: 2rem;
                z-index: 10000;
            ">
                <div style="font-size: 4rem; margin-bottom: 2rem;">â™›</div>
                <h1 style="font-size: 3rem; font-weight: 900; margin-bottom: 1rem; letter-spacing: 2px;">PREDICTKING</h1>
                <h2 style="font-size: 1.5rem; margin-bottom: 2rem; color: #888;">Please Use Mobile Device</h2>
                <p style="font-size: 1.1rem; max-width: 500px; line-height: 1.6;">
                    This application is optimized for mobile devices only. Please access from your smartphone or resize your browser window to mobile view.
                </p>
            </div>
        `;
    }
}

// Monitor viewport changes
window.addEventListener('resize', checkViewportSize);

// Profile picture defaults with working URLs
const defaultProfilePics = {
    male: [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male1&backgroundColor=b6e3f4",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male2&backgroundColor=c0aede",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male3&backgroundColor=d1d4f9",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male4&backgroundColor=ffd93d",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=male5&backgroundColor=ffb3ba"
    ],
    female: [
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female1&backgroundColor=ffb3ba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female2&backgroundColor=ffdfba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female3&backgroundColor=ffffba",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female4&backgroundColor=baffc9",
        "https://api.dicebear.com/7.x/avataaars/svg?seed=female5&backgroundColor=bae1ff"
    ]
};

// Track used profile pics to avoid repetition
let usedProfilePics = {
    male: new Set(),
    female: new Set()
};

function getRandomProfilePic(gender) {
    const pics = defaultProfilePics[gender] || defaultProfilePics.male;
    const usedSet = usedProfilePics[gender];
    
    // If all pics are used, reset the set
    if (usedSet.size >= pics.length) {
        usedSet.clear();
    }
    
    // Find unused pics
    const unusedPics = pics.filter(pic => !usedSet.has(pic));
    
    // Select random from unused pics
    const selectedPic = unusedPics[Math.floor(Math.random() * unusedPics.length)];
    
    // Mark as used
    usedSet.add(selectedPic);
    
    return selectedPic;
}

// Handle file upload for profile pictures
function handleProfilePicUpload(file, gender) {
    return new Promise((resolve) => {
        if (!file) {
            // If no file uploaded, use random default
            resolve(getRandomProfilePic(gender));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            // Convert to base64 and resolve
            resolve(e.target.result);
        };
        reader.readAsDataURL(file);
    });
}

// Canvas-based realistic star animation
// Canvas-based realistic star animation
class StarField {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.stars = [];
        this.animationId = null;
        this.isVisible = true;
        this.startTime = Date.now();
        
        // Smooth global motion for entire star field - start immediately
        this.globalMotion = {
            x: 0, y: 0, rotation: 0,
            velocityX: (Math.random() - 0.5) * 0.2, // Start with initial motion
            velocityY: (Math.random() - 0.5) * 0.2,
            rotationSpeed: (Math.random() - 0.5) * 0.0005,
            targetVelocityX: 0, targetVelocityY: 0, targetRotationSpeed: 0,
            lastChange: this.startTime,
            changeInterval: 20000 + Math.random() * 15000 // 20-35 seconds
        };
        
        // Set initial targets same as current values to avoid sudden changes
        this.globalMotion.targetVelocityX = this.globalMotion.velocityX;
        this.globalMotion.targetVelocityY = this.globalMotion.velocityY;
        this.globalMotion.targetRotationSpeed = this.globalMotion.rotationSpeed;
        
        // Meteor system
        this.meteors = [];
        this.nextMeteorTime = this.startTime + Math.random() * 30000 + 15000; // 15-45 seconds
        
        // Moon system
        this.moon = null;
        this.nextMoonTime = this.startTime + Math.random() * 120000 + 180000; // 3-8 minutes
        
        // Define realistic stellar colors based on spectral classification
        this.stellarColors = {
            O: { r: 157, g: 180, b: 255, temp: 30000 }, // Blue
            B: { r: 162, g: 185, b: 255, temp: 20000 }, // Blue-white
            A: { r: 213, g: 224, b: 255, temp: 8500 },  // White
            F: { r: 249, g: 245, b: 255, temp: 6500 },  // Yellow-white
            G: { r: 255, g: 237, b: 227, temp: 5500 },  // Yellow (like Sun)
            K: { r: 255, g: 218, b: 181, temp: 4000 },  // Orange
            M: { r: 255, g: 181, b: 108, temp: 3000 }   // Red
        };
        
        this.init();
    }

    init() {
        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'star-canvas';
        this.canvas.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: -4;
            pointer-events: none;
        `;
        
        document.body.insertBefore(this.canvas, document.body.firstChild);
        
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.createRealisticStars();
        this.animate();

        window.addEventListener('resize', () => this.resize());
        
        document.addEventListener('visibilitychange', () => {
            this.isVisible = !document.hidden;
            if (this.isVisible && !this.animationId) {
                this.animate();
            }
        });
    }

    resize() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.createRealisticStars();
    }

    getRandomStellarType() {
        // Realistic distribution based on actual stellar statistics
        const rand = Math.random();
        if (rand < 0.001) return 'O'; // Very rare
        if (rand < 0.01) return 'B';  // Rare
        if (rand < 0.04) return 'A';  // Uncommon
        if (rand < 0.12) return 'F';  // Less common
        if (rand < 0.22) return 'G';  // Solar-type (like our Sun)
        if (rand < 0.42) return 'K';  // Common
        return 'M'; // Most common (red dwarfs)
    }

    createRealisticStars() {
        this.stars = [];
        
        // Initialize the star grid system for infinite sky
        this.starGrid = new Map();
        this.gridSize = 500; // Size of each grid cell in pixels
        this.loadRadius = 3; // How many grid cells to load around viewport
        
        // ===== STAR POPULATION CONTROL =====
        // These values control how many stars appear in the sky.
        // LOWER numbers = FEWER stars, HIGHER numbers = MORE stars
        // Each grid cell is 500x500 pixels (250,000 square pixels)
        
        // Star density per grid cell - ADJUST THESE VALUES TO CHANGE STAR POPULATION:
        this.starDensity = {
            // Faintest, barely visible stars (most numerous in real sky)
            faint: Math.floor((this.gridSize * this.gridSize) / 2000), // ~167 per cell (was 417)
            
            // Dim but clearly visible stars  
            dim: Math.floor((this.gridSize * this.gridSize) / 5000), // ~71 per cell (was 179)
            
            // Bright, prominent stars
            bright: Math.floor((this.gridSize * this.gridSize) / 10000), // ~31 per cell (was 71)
            
            // Brilliant stars (brightest, most noticeable)
            brilliant: Math.floor((this.gridSize * this.gridSize) / 70000) + 1 // ~10 per cell (was 21)
        };
        
        // TOTAL STARS PER GRID CELL: ~279 (was ~688)
        // This represents about a 60% reduction in star population
        
        // HOW TO ADJUST STAR POPULATION:
        // 1. To make the sky even sparser: INCREASE the divisor numbers above
        //    Example: Change 1500 to 2000 for even fewer faint stars
        // 2. To make the sky denser: DECREASE the divisor numbers above
        //    Example: Change 1500 to 1000 for more faint stars
        // 3. To remove a star type entirely: Set its value to 0
        //    Example: brilliant: 0 (removes all brilliant stars)
        // 4. To emphasize bright stars over faint ones: 
        //    Increase faint/dim divisors, decrease bright/brilliant divisors
        
        // Load initial star grid around viewport
        this.updateStarGrid();
    }

    // Convert world coordinates to grid coordinates
    worldToGrid(x, y) {
        return {
            gridX: Math.floor(x / this.gridSize),
            gridY: Math.floor(y / this.gridSize)
        };
    }

    // Generate a unique seed for a grid cell
    getGridSeed(gridX, gridY) {
        // Simple hash function to generate consistent random seed for each grid cell
        return ((gridX * 73856093) ^ (gridY * 19349663)) % 1000000;
    }

    // Seeded random number generator
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Generate stars for a specific grid cell
    generateGridStars(gridX, gridY) {
        const gridKey = `${gridX},${gridY}`;
        if (this.starGrid.has(gridKey)) {
            return this.starGrid.get(gridKey);
        }

        const stars = [];
        const baseSeed = this.getGridSeed(gridX, gridY);
        let seedCounter = 0;

        // Generate each star type for this grid cell
        const starTypes = ['faint', 'dim', 'bright', 'brilliant'];
        
        starTypes.forEach(type => {
            const count = this.starDensity[type];
            for (let i = 0; i < count; i++) {
                // Use seeded random for consistent star placement
                const xSeed = baseSeed + seedCounter++;
                const ySeed = baseSeed + seedCounter++;
                const propSeed = baseSeed + seedCounter++;
                
                const localX = this.seededRandom(xSeed) * this.gridSize;
                const localY = this.seededRandom(ySeed) * this.gridSize;
                
                const worldX = gridX * this.gridSize + localX;
                const worldY = gridY * this.gridSize + localY;
                
                // Create star with seeded properties for consistency
                const star = this.createStarWithSeed(type, worldX, worldY, propSeed);
                stars.push(star);
            }
        });

        this.starGrid.set(gridKey, stars);
        return stars;
    }

    // Create a star with seeded random properties for consistency
    createStarWithSeed(magnitude, worldX, worldY, seed) {
        let seedCounter = 0;
        const getRandom = () => this.seededRandom(seed + seedCounter++);
        
        const spectralType = this.getRandomStellarTypeWithSeed(getRandom());
        const color = this.stellarColors[spectralType];
        
        const star = {
            baseX: worldX,
            baseY: worldY,
            magnitude: magnitude,
            spectralType: spectralType,
            color: color,
            
            // Individual star properties using seeded random
            baseBrightness: getRandom() * 0.3 + 0.7,
            
            // Realistic twinkling - more prominent for brighter stars
            twinklePhase: getRandom() * Math.PI * 2,
            twinkleSpeed: getRandom() * 0.012 + 0.003,
            twinkleIntensity: magnitude === 'brilliant' ? getRandom() * 0.6 + 0.3 : getRandom() * 0.4 + 0.2,
            twinklePattern: getRandom(),
            
            // Chromatic scintillation
            chromaticPhase: getRandom() * Math.PI * 2,
            chromaticSpeed: getRandom() * 0.008 + 0.002,
            chromaticIntensity: getRandom() * 0.3 + 0.1,
            
            // Random timing changes
            nextPatternChange: this.startTime + getRandom() * 25000 + 15000,
            
            // Subtle individual motion
            localDrift: {
                x: 0, y: 0,
                speedX: (getRandom() - 0.5) * 0.008,
                speedY: (getRandom() - 0.5) * 0.008
            },
            
            // Diffraction spikes for bright stars
            hasDiffractionSpikes: magnitude === 'brilliant' && getRandom() < 0.6,
            spikeLength: 0,
            spikeIntensity: 0
        };

        // Set size and brightness properties based on magnitude
        switch (magnitude) {
            case 'faint':
                star.coreSize = 0.2 + getRandom() * 0.15;
                star.maxGlowRadius = 0.8 + getRandom() * 0.4;
                star.brightness = 0.25 + getRandom() * 0.35;
                break;
            case 'dim':
                star.coreSize = 0.3 + getRandom() * 0.2;
                star.maxGlowRadius = 1.2 + getRandom() * 0.6;
                star.brightness = 0.45 + getRandom() * 0.3;
                break;
            case 'bright':
                star.coreSize = 0.5 + getRandom() * 0.3;
                star.maxGlowRadius = 2.0 + getRandom() * 1.0;
                star.brightness = 0.7 + getRandom() * 0.2;
                break;
            case 'brilliant':
                star.coreSize = 0.8 + getRandom() * 0.4;
                star.maxGlowRadius = 3.5 + getRandom() * 2.0;
                star.brightness = 0.85 + getRandom() * 0.15;
                if (star.hasDiffractionSpikes) {
                    star.spikeLength = 8 + getRandom() * 12;
                    star.spikeIntensity = 0.3 + getRandom() * 0.4;
                }
                break;
        }

        return star;
    }

    getRandomStellarTypeWithSeed(random) {
        if (random < 0.001) return 'O';
        if (random < 0.01) return 'B';
        if (random < 0.04) return 'A';
        if (random < 0.12) return 'F';
        if (random < 0.22) return 'G';
        if (random < 0.42) return 'K';
        return 'M';
    }

    // Update the star grid based on current viewport and motion
    updateStarGrid() {
        // Calculate current viewport bounds including global motion
        const centerX = window.innerWidth / 2 - this.globalMotion.x;
        const centerY = window.innerHeight / 2 - this.globalMotion.y;
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        
        // Calculate grid bounds to load (with buffer for smooth transitions)
        const buffer = this.gridSize * this.loadRadius;
        const minX = centerX - viewWidth/2 - buffer;
        const maxX = centerX + viewWidth/2 + buffer;
        const minY = centerY - viewHeight/2 - buffer;
        const maxY = centerY + viewHeight/2 + buffer;
        
        const minGrid = this.worldToGrid(minX, minY);
        const maxGrid = this.worldToGrid(maxX, maxY);
        
        // Generate stars for visible grid cells
        const newStars = [];
        for (let gx = minGrid.gridX; gx <= maxGrid.gridX; gx++) {
            for (let gy = minGrid.gridY; gy <= maxGrid.gridY; gy++) {
                const gridStars = this.generateGridStars(gx, gy);
                newStars.push(...gridStars);
            }
        }
        
        this.stars = newStars;
        
        // Clean up distant grid cells to manage memory (keep only nearby cells)
        const keysToDelete = [];
        for (const key of this.starGrid.keys()) {
            const [gx, gy] = key.split(',').map(Number);
            if (gx < minGrid.gridX - this.loadRadius || gx > maxGrid.gridX + this.loadRadius ||
                gy < minGrid.gridY - this.loadRadius || gy > maxGrid.gridY + this.loadRadius) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => this.starGrid.delete(key));
    }

    createStar(magnitude, areaWidth, areaHeight, offsetX, offsetY) {
        const spectralType = this.getRandomStellarType();
        const color = this.stellarColors[spectralType];
        
        const star = {
            baseX: Math.random() * areaWidth + offsetX,
            baseY: Math.random() * areaHeight + offsetY,
            magnitude: magnitude,
            spectralType: spectralType,
            color: color,
            
            // Individual star properties
            baseBrightness: Math.random() * 0.3 + 0.7, // 0.7 to 1.0
            
            // Realistic twinkling - more prominent for brighter stars
            twinklePhase: Math.random() * Math.PI * 2,
            twinkleSpeed: Math.random() * 0.012 + 0.003, // Natural atmospheric scintillation
            twinkleIntensity: magnitude === 'brilliant' ? Math.random() * 0.6 + 0.3 : Math.random() * 0.4 + 0.2,
            twinklePattern: Math.random(),
            
            // Chromatic scintillation (color changes due to atmosphere)
            chromaticPhase: Math.random() * Math.PI * 2,
            chromaticSpeed: Math.random() * 0.008 + 0.002,
            chromaticIntensity: Math.random() * 0.3 + 0.1,
            
            // Random timing changes
            nextPatternChange: this.startTime + Math.random() * 25000 + 15000, // 15-40 seconds
            
            // Subtle individual motion (proper motion simulation)
            localDrift: {
                x: 0, y: 0,
                speedX: (Math.random() - 0.5) * 0.008,
                speedY: (Math.random() - 0.5) * 0.008
            },
            
            // Diffraction spikes for bright stars
            hasDiffractionSpikes: magnitude === 'brilliant' && Math.random() < 0.6,
            spikeLength: 0,
            spikeIntensity: 0
        };

        // Set size and brightness properties based on magnitude
        switch (magnitude) {
            case 'faint':
                star.coreSize = 0.2 + Math.random() * 0.15; // Very small core
                star.maxGlowRadius = 0.8 + Math.random() * 0.4; // Minimal glow
                star.brightness = 0.25 + Math.random() * 0.35; // Very dim
                break;
            case 'dim':
                star.coreSize = 0.3 + Math.random() * 0.2; // Small core
                star.maxGlowRadius = 1.2 + Math.random() * 0.6; // Small glow
                star.brightness = 0.45 + Math.random() * 0.3; // Dim but visible
                break;
            case 'bright':
                star.coreSize = 0.5 + Math.random() * 0.3; // Medium core
                star.maxGlowRadius = 2.0 + Math.random() * 1.0; // Noticeable glow
                star.brightness = 0.7 + Math.random() * 0.2; // Bright
                break;
            case 'brilliant':
                star.coreSize = 0.8 + Math.random() * 0.4; // Large core
                star.maxGlowRadius = 3.5 + Math.random() * 2.0; // Prominent glow
                star.brightness = 0.85 + Math.random() * 0.15; // Very bright
                if (star.hasDiffractionSpikes) {
                    star.spikeLength = 8 + Math.random() * 12; // 8-20px spikes
                    star.spikeIntensity = 0.3 + Math.random() * 0.4; // Spike brightness
                }
                break;
        }

        return star;
    }

    updateGlobalMotion(currentTime) {
        const elapsed = currentTime - this.globalMotion.lastChange;
        
        // Change direction/speed smoothly over time
        if (elapsed > this.globalMotion.changeInterval) {
            // Set new target motion with more varied patterns
            this.globalMotion.targetVelocityX = (Math.random() - 0.5) * 0.4;
            this.globalMotion.targetVelocityY = (Math.random() - 0.5) * 0.4;
            this.globalMotion.targetRotationSpeed = (Math.random() - 0.5) * 0.001; // Gentle rotation
            
            this.globalMotion.lastChange = currentTime;
            this.globalMotion.changeInterval = 20000 + Math.random() * 15000; // Next change in 20-35s
        }
        
        // Smooth interpolation to target motion
        const smoothing = 0.0006; // Very gradual transition
        this.globalMotion.velocityX += (this.globalMotion.targetVelocityX - this.globalMotion.velocityX) * smoothing;
        this.globalMotion.velocityY += (this.globalMotion.targetVelocityY - this.globalMotion.velocityY) * smoothing;
        this.globalMotion.rotationSpeed += (this.globalMotion.targetRotationSpeed - this.globalMotion.rotationSpeed) * smoothing;
        
        // Apply motion
        this.globalMotion.x += this.globalMotion.velocityX;
        this.globalMotion.y += this.globalMotion.velocityY;
        this.globalMotion.rotation += this.globalMotion.rotationSpeed;
    }

    createMeteor(currentTime) {
        // Random entry point from screen edges
        const side = Math.floor(Math.random() * 4);
        let startX, startY, endX, endY;
        
        switch (side) {
            case 0: // Top edge
                startX = Math.random() * window.innerWidth;
                startY = -50;
                endX = startX + (Math.random() - 0.5) * window.innerWidth * 1.5;
                endY = window.innerHeight + 50;
                break;
            case 1: // Right edge
                startX = window.innerWidth + 50;
                startY = Math.random() * window.innerHeight;
                endX = -50;
                endY = startY + (Math.random() - 0.5) * window.innerHeight * 1.5;
                break;
            case 2: // Bottom edge
                startX = Math.random() * window.innerWidth;
                startY = window.innerHeight + 50;
                endX = startX + (Math.random() - 0.5) * window.innerWidth * 1.5;
                endY = -50;
                break;
            case 3: // Left edge
                startX = -50;
                startY = Math.random() * window.innerHeight;
                endX = window.innerWidth + 50;
                endY = startY + (Math.random() - 0.5) * window.innerHeight * 1.5;
                break;
        }
        
        const meteor = {
            startX, startY, endX, endY,
            startTime: currentTime,
            duration: 1200 + Math.random() * 2500, // 1.2-3.7 seconds
            brightness: 0.7 + Math.random() * 0.3,
            trailLength: 50 + Math.random() * 80, // 50-130px trail
            size: 1.2 + Math.random() * 2.5, // 1.2-3.7px meteor head
            color: Math.random() < 0.7 ? {r: 255, g: 245, b: 200} : {r: 255, g: 180, b: 120} // Mostly white-hot, some orange
        };
        
        return meteor;
    }

    createMoon(currentTime) {
        // Decide randomly if moon moves with sky motion or independently
        const followsSkyMotion = Math.random() < 0.6; // 60% chance to follow sky motion
        
        // Moon always enters from random side
        const side = Math.floor(Math.random() * 4);
        let startX, startY, endX, endY;
        
        if (followsSkyMotion) {
            // Moon moves with sky - stationary relative to stars
            startX = Math.random() * window.innerWidth;
            startY = Math.random() * window.innerHeight;
            endX = startX; // Stays in same position relative to sky
            endY = startY;
        } else {
            // Moon moves independently across sky
            switch (side) {
                case 0: // Enter from left
                    startX = -100;
                    startY = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2;
                    endX = window.innerWidth + 100;
                    endY = startY + (Math.random() - 0.5) * window.innerHeight * 0.3;
                    break;
                case 1: // Enter from right
                    startX = window.innerWidth + 100;
                    startY = Math.random() * window.innerHeight * 0.6 + window.innerHeight * 0.2;
                    endX = -100;
                    endY = startY + (Math.random() - 0.5) * window.innerHeight * 0.3;
                    break;
                case 2: // Enter from top
                    startX = Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2;
                    startY = -100;
                    endX = startX + (Math.random() - 0.5) * window.innerWidth * 0.3;
                    endY = window.innerHeight + 100;
                    break;
                case 3: // Enter from bottom
                    startX = Math.random() * window.innerWidth * 0.6 + window.innerWidth * 0.2;
                    startY = window.innerHeight + 100;
                    endX = startX + (Math.random() - 0.5) * window.innerWidth * 0.3;
                    endY = -100;
                    break;
            }
        }
        
        const moon = {
            startX, startY, endX, endY,
            startTime: currentTime,
            duration: followsSkyMotion ? 60000 + Math.random() * 40000 : 45000 + Math.random() * 30000, // 1-1.6 min for stationary, 45-75s for moving
            size: 15 + Math.random() * 10, // 15-25px radius
            brightness: 0.7 + Math.random() * 0.2,
            followsSkyMotion: followsSkyMotion
        };
        
        return moon;
    }

    updateMeteorsAndMoon(currentTime) {
        // Create new meteors randomly
        if (currentTime > this.nextMeteorTime) {
            this.meteors.push(this.createMeteor(currentTime));
            this.nextMeteorTime = currentTime + Math.random() * 30000 + 15000; // Next meteor in 15-45 seconds
        }
        
        // Remove completed meteors
        this.meteors = this.meteors.filter(meteor => 
            currentTime - meteor.startTime < meteor.duration
        );
        
        // Create new moon very rarely
        if (!this.moon && currentTime > this.nextMoonTime) {
            this.moon = this.createMoon(currentTime);
            this.nextMoonTime = currentTime + Math.random() * 300000 + 300000; // Next moon in 5-15 minutes
        }
        
        // Remove moon when it's done
        if (this.moon && currentTime - this.moon.startTime > this.moon.duration) {
            this.moon = null;
        }
    }

    drawMeteor(meteor, currentTime) {
        const elapsed = currentTime - meteor.startTime;
        const progress = Math.min(1, elapsed / meteor.duration);
        
        // Linear movement
        const x = meteor.startX + (meteor.endX - meteor.startX) * progress;
        const y = meteor.startY + (meteor.endY - meteor.startY) * progress;
        
        // Calculate trail points
        const trailPoints = [];
        const numTrailPoints = 10;
        
        for (let i = 0; i < numTrailPoints; i++) {
            const trailProgress = Math.max(0, progress - (i / numTrailPoints) * 0.12);
            const trailX = meteor.startX + (meteor.endX - meteor.startX) * trailProgress;
            const trailY = meteor.startY + (meteor.endY - meteor.startY) * trailProgress;
            const trailOpacity = meteor.brightness * (1 - i / numTrailPoints) * (1 - progress * 0.2);
            
            trailPoints.push({ 
                x: trailX, 
                y: trailY, 
                opacity: trailOpacity, 
                size: meteor.size * (1 - i / numTrailPoints * 0.6) 
            });
        }
        
        this.ctx.save();
        
        // Draw trail (from back to front)
        trailPoints.reverse().forEach((point, index) => {
            if (point.opacity > 0) {
                // Main trail
                this.ctx.fillStyle = `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${point.opacity})`;
                this.ctx.beginPath();
                this.ctx.arc(point.x, point.y, point.size, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Trail glow
                if (index < 4) {
                    this.ctx.fillStyle = `rgba(${meteor.color.r}, ${meteor.color.g}, ${meteor.color.b}, ${point.opacity * 0.25})`;
                    this.ctx.beginPath();
                    this.ctx.arc(point.x, point.y, point.size * 2.5, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        });
        
        this.ctx.restore();
    }

    drawMoon(moon, currentTime) {
        const elapsed = currentTime - moon.startTime;
        const progress = elapsed / moon.duration;
        
        let x, y;
        
        if (moon.followsSkyMotion) {
            // Moon moves with sky motion (stationary relative to stars)
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Apply same transformations as stars
            let moonX = moon.startX - centerX;
            let moonY = moon.startY - centerY;
            
            // Apply global rotation
            const cos = Math.cos(this.globalMotion.rotation);
            const sin = Math.sin(this.globalMotion.rotation);
            const rotatedX = moonX * cos - moonY * sin;
            const rotatedY = moonX * sin + moonY * cos;
            
            // Apply global drift and translate back
            x = rotatedX + centerX + this.globalMotion.x;
            y = rotatedY + centerY + this.globalMotion.y;
        } else {
            // Moon moves independently
            x = moon.startX + (moon.endX - moon.startX) * progress;
            y = moon.startY + (moon.endY - moon.startY) * progress;
        }
        
        this.ctx.save();
        
        // Moon glow - warm white with realistic lunar coloring
        const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, moon.size * 2.8);
        glowGradient.addColorStop(0, `rgba(250, 245, 230, ${moon.brightness * 0.18})`);
        glowGradient.addColorStop(0.4, `rgba(250, 245, 230, ${moon.brightness * 0.1})`);
        glowGradient.addColorStop(1, 'rgba(250, 245, 230, 0)');
        
        this.ctx.fillStyle = glowGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, moon.size * 2.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Moon body - realistic lunar surface color
        this.ctx.fillStyle = `rgba(240, 235, 220, ${moon.brightness})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, moon.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Enhanced moon surface details
        const craterData = [
            { x: 0.3, y: -0.2, size: 0.15, darkness: 0.6 },
            { x: -0.4, y: 0.1, size: 0.25, darkness: 0.5 },
            { x: 0.1, y: 0.4, size: 0.12, darkness: 0.7 },
            { x: -0.2, y: -0.3, size: 0.08, darkness: 0.8 },
            { x: 0.45, y: 0.2, size: 0.06, darkness: 0.9 },
            { x: -0.1, y: 0.1, size: 0.18, darkness: 0.4 },
            { x: 0.2, y: -0.4, size: 0.1, darkness: 0.75 },
            { x: -0.35, y: -0.15, size: 0.07, darkness: 0.85 },
            { x: 0.05, y: 0.25, size: 0.09, darkness: 0.65 },
            { x: -0.25, y: 0.35, size: 0.05, darkness: 0.9 },
            { x: 0.35, y: -0.1, size: 0.04, darkness: 0.95 },
            { x: -0.15, y: 0.45, size: 0.06, darkness: 0.8 }
        ];
        
        craterData.forEach(crater => {
            const craterX = x + crater.x * moon.size;
            const craterY = y + crater.y * moon.size;
            const craterSize = crater.size * moon.size;
            
            const distFromCenter = Math.sqrt((crater.x * crater.x) + (crater.y * crater.y));
            if (distFromCenter < 0.9) {
                this.ctx.fillStyle = `rgba(220, 215, 200, ${moon.brightness * (1 - crater.darkness)})`;
                this.ctx.beginPath();
                this.ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
                this.ctx.fill();
                
                if (crater.size > 0.1) {
                    this.ctx.strokeStyle = `rgba(235, 230, 215, ${moon.brightness * 0.3})`;
                    this.ctx.lineWidth = 0.5;
                    this.ctx.beginPath();
                    this.ctx.arc(craterX, craterY, craterSize, 0, Math.PI * 2);
                    this.ctx.stroke();
                }
            }
        });
        
        // Realistic lunar terminator shading
        const shadingGradient = this.ctx.createRadialGradient(
            x - moon.size * 0.35, y - moon.size * 0.35, 0, 
            x, y, moon.size
        );
        shadingGradient.addColorStop(0, 'rgba(240, 235, 220, 0)');
        shadingGradient.addColorStop(0.7, 'rgba(240, 235, 220, 0)');
        shadingGradient.addColorStop(1, `rgba(180, 175, 160, ${moon.brightness * 0.25})`);
        
        this.ctx.fillStyle = shadingGradient;
        this.ctx.beginPath();
        this.ctx.arc(x, y, moon.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }

    drawDiffractionSpikes(x, y, star, brightness) {
        if (!star.hasDiffractionSpikes || star.spikeLength < 5) return;
        
        this.ctx.save();
        
        // Create diffraction spikes - 4 spikes at 90 degree angles
        const spikeAngles = [0, Math.PI/2, Math.PI, 3*Math.PI/2];
        const spikeOpacity = brightness * star.spikeIntensity * 0.8;
        
        spikeAngles.forEach(angle => {
            this.ctx.strokeStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${spikeOpacity})`;
            this.ctx.lineWidth = 0.8;
            this.ctx.lineCap = 'round';
            
            const startX = x + Math.cos(angle) * star.coreSize * 2;
            const startY = y + Math.sin(angle) * star.coreSize * 2;
            const endX = x + Math.cos(angle) * star.spikeLength;
            const endY = y + Math.sin(angle) * star.spikeLength;
            
            // Main spike
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.lineTo(endX, endY);
            this.ctx.stroke();
            
            // Secondary fainter spike
            this.ctx.strokeStyle = `rgba(${star.color.r}, ${star.color.g}, ${star.color.b}, ${spikeOpacity * 0.4})`;
            this.ctx.lineWidth = 0.4;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + Math.cos(angle) * star.spikeLength * 1.3, y + Math.sin(angle) * star.spikeLength * 1.3);
            this.ctx.stroke();
        });
        
        this.ctx.restore();
    }

    drawRealisticStar(star, currentTime) {
        // Update individual star patterns randomly
        if (currentTime > star.nextPatternChange) {
            star.twinkleSpeed = Math.random() * 0.015 + 0.004;
            star.twinkleIntensity = star.magnitude === 'brilliant' ? Math.random() * 0.6 + 0.3 : Math.random() * 0.4 + 0.2;
            star.twinklePattern = Math.random();
            star.chromaticSpeed = Math.random() * 0.010 + 0.003;
            star.nextPatternChange = currentTime + Math.random() * 25000 + 15000;
        }

        // Apply global motion transformations
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Translate relative to center
        let x = star.baseX - centerX;
        let y = star.baseY - centerY;
        
        // Apply global rotation
        const cos = Math.cos(this.globalMotion.rotation);
        const sin = Math.sin(this.globalMotion.rotation);
        const rotatedX = x * cos - y * sin;
        const rotatedY = x * sin + y * cos;
        
        // Apply global drift and translate back
        x = rotatedX + centerX + this.globalMotion.x;
        y = rotatedY + centerY + this.globalMotion.y;
        
        // Add subtle individual drift
        star.localDrift.x += star.localDrift.speedX;
        star.localDrift.y += star.localDrift.speedY;
        x += star.localDrift.x;
        y += star.localDrift.y;
        
        // Skip if outside viewport
        const maxRadius = star.maxGlowRadius * 3;
        if (x < -maxRadius || x > window.innerWidth + maxRadius || 
            y < -maxRadius || y > window.innerHeight + maxRadius) {
            return;
        }

        // Calculate atmospheric scintillation (twinkling)
        star.twinklePhase += star.twinkleSpeed;
        const primaryTwinkle = Math.sin(star.twinklePhase) * star.twinkleIntensity;
        const secondaryTwinkle = Math.sin(star.twinklePhase * 1.7 + star.twinklePattern * 8) * (star.twinkleIntensity * 0.4);
        const tertiaryTwinkle = Math.sin(star.twinklePhase * 2.3 + star.twinklePattern * 12) * (star.twinkleIntensity * 0.2);
        
        // Calculate chromatic scintillation (color shifting)
        star.chromaticPhase += star.chromaticSpeed;
        const chromaticShift = Math.sin(star.chromaticPhase) * star.chromaticIntensity;
        
        const currentBrightness = Math.max(0.15, Math.min(1.2, 
            star.baseBrightness * star.brightness + primaryTwinkle + secondaryTwinkle + tertiaryTwinkle
        ));
        
        // Apply chromatic effects to color
        const colorShift = chromaticShift * 0.3;
        const adjustedColor = {
            r: Math.max(0, Math.min(255, star.color.r + colorShift * 30)),
            g: Math.max(0, Math.min(255, star.color.g + colorShift * 15)),
            b: Math.max(0, Math.min(255, star.color.b - colorShift * 10))
        };
        
        const currentGlowRadius = star.maxGlowRadius * (0.6 + currentBrightness * 0.4);
        const currentCoreSize = star.coreSize * (0.8 + currentBrightness * 0.3);
        
        this.ctx.save();
        
        // Draw diffraction spikes first (behind the star)
        if (star.hasDiffractionSpikes && currentBrightness > 0.7) {
            this.drawDiffractionSpikes(x, y, star, currentBrightness);
        }
        
        // Draw atmospheric glow (outer halo) - multiple layers for realism
        if (currentGlowRadius > 0.8) {
            // Outer atmospheric glow
            const outerGradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentGlowRadius * 1.8);
            outerGradient.addColorStop(0, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.3})`);
            outerGradient.addColorStop(0.2, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.15})`);
            outerGradient.addColorStop(0.5, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.08})`);
            outerGradient.addColorStop(1, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, 0)`);
            
            this.ctx.fillStyle = outerGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, currentGlowRadius * 1.8, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Main atmospheric glow
            const mainGradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentGlowRadius);
            mainGradient.addColorStop(0, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.6})`);
            mainGradient.addColorStop(0.3, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.35})`);
            mainGradient.addColorStop(0.6, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${currentBrightness * 0.18})`);
            mainGradient.addColorStop(1, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, 0)`);
            
            this.ctx.fillStyle = mainGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, currentGlowRadius, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw star core with realistic stellar disk
        if (currentCoreSize > 0.3) {
            // Bright stellar disk
            const coreGradient = this.ctx.createRadialGradient(x, y, 0, x, y, currentCoreSize * 1.5);
            coreGradient.addColorStop(0, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${Math.min(1, currentBrightness * 1.1)})`);
            coreGradient.addColorStop(0.7, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${Math.min(1, currentBrightness * 0.9)})`);
            coreGradient.addColorStop(1, `rgba(${adjustedColor.r}, ${adjustedColor.g}, ${adjustedColor.b}, ${Math.min(1, currentBrightness * 0.6)})`);
            
            this.ctx.fillStyle = coreGradient;
            this.ctx.beginPath();
            this.ctx.arc(x, y, currentCoreSize * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Draw bright center point
        this.ctx.fillStyle = `rgba(${Math.min(255, adjustedColor.r + 20)}, ${Math.min(255, adjustedColor.g + 15)}, ${Math.min(255, adjustedColor.b + 10)}, ${Math.min(1, currentBrightness * 1.3)})`;
        this.ctx.beginPath();
        this.ctx.arc(x, y, currentCoreSize, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Add bright central point for brilliant stars
        if (star.magnitude === 'brilliant' && currentBrightness > 0.8) {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, currentBrightness * 0.8)})`;
            this.ctx.beginPath();
            this.ctx.arc(x, y, currentCoreSize * 0.4, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        this.ctx.restore();
    }

    animate() {
        if (!this.isVisible) {
            this.animationId = null;
            return;
        }

        const currentTime = Date.now();
        
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Update smooth global motion
        this.updateGlobalMotion(currentTime);
        
        // Update star grid based on new viewport position
        this.updateStarGrid();
        
        // Update meteors and moon
        this.updateMeteorsAndMoon(currentTime);
        
        // Draw all stars with realistic rendering
        this.stars.forEach(star => this.drawRealisticStar(star, currentTime));
        
        // Draw meteors
        this.meteors.forEach(meteor => this.drawMeteor(meteor, currentTime));
        
        // Draw moon if present
        if (this.moon) {
            this.drawMoon(this.moon, currentTime);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.canvas && this.canvas.parentNode) {
            this.canvas.parentNode.removeChild(this.canvas);
        }
    }
}

// Initialize stars when page loads
document.addEventListener('DOMContentLoaded', () => {
    new StarField();
});

document.addEventListener('DOMContentLoaded', function() {
    // Double-check mobile access
    if (!isMobileDevice()) {
        return; // Exit if not mobile
    }
    
    // Initialize collections
    initializeCollections();
    
    // Check if we're on EVC page
    if (window.location.pathname.includes('fwd.html')) {
        showEVCLoadingScreen();
        
        // Ensure everything loads before showing page
        Promise.all([
            checkLoginStatus(),
            new Promise(resolve => setTimeout(resolve, 3000)) // Minimum 3 seconds
        ]).then(() => {
            updateThemeBasedOnUser();
            hideEVCLoadingScreen();
            startActivePlayerTracking();
            startGlobalRealTimeListeners(); // Add this
            showPostRefreshWelcomeMessage();
        });
        return;
    }
    
    // Check if elements exist before using them
    if (document.getElementById('loading-screen')) {
        showLoadingScreen();
    }
    
    // Ensure everything loads before showing page
    Promise.all([
        checkLoginStatus(),
        loadEvents(),
        loadStats(),
        new Promise(resolve => {
            // Wait for actual loading completion
            let completed = 0;
            const checkProgress = () => {
                completed += 25;
                if (completed >= 100) {
                    setTimeout(resolve, 500); // Small delay after completion
                } else {
                    setTimeout(checkProgress, 750); // Staggered progress
                }
            };
            checkProgress();
        })
    ]).then(() => {
        if (document.getElementById('loading-screen')) {
            hideLoadingScreen();
        }
        updateThemeBasedOnUser();
        startRealTimeUpdates();
        startActivePlayerTracking();
        startGlobalRealTimeListeners(); // Add this for real-time odds
        startUpcomingEventsChecker(); // Add this line
        showPostRefreshWelcomeMessage();
    });
});


async function loadUserNotifications() {
    if (!currentUser) return [];

    try {
        const snapshot = await db
            .collection("notifications")
            .where("userId", "==", currentUser.id)
            .orderBy("timestamp", "desc")
            .limit(50)
            .get();


        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error loading notifications:", error);
        return [];
    }
}



// Add mobile detection function
function isMobileDevice() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
           window.innerWidth <= 768;
}

// Loading Screen Functions
function showLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'flex';
    document.getElementById('main-app').classList.add('hidden');
}

function hideLoadingScreen() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('main-app').classList.remove('hidden');
}

function showEVCLoadingScreen() {
    const loadingScreen = document.getElementById('evc-loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'flex';
        document.getElementById('main-app').classList.add('hidden');
    }
}

function hideEVCLoadingScreen() {
    const loadingScreen = document.getElementById('evc-loading-screen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
        document.getElementById('main-app').classList.remove('hidden');
    }
}

function showLiveChat() {
    if (!currentUser) {
        showNotification('Please login to access live chat', 'error');
        return;
    }
    
    // Create and show coming soon modal
    let modal = document.getElementById('live-chat-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'live-chat-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('live-chat-modal')">&times;</span>
                <h2>LIVE CHAT</h2>
                <div style="text-align: center; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Coming Soon!</p>
                    <p>Live chat feature is under development.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('live-chat-modal');
}

function showNotifications() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Create and show notifications modal with same content as profile notifications tab
    let modal = document.getElementById('notifications-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notifications-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('notifications-modal')">&times;</span>
                <h2>NOTIFICATIONS</h2>
                <div class="notifications-tab">
                    <div class="notification-item">
                        <div class="notification-content">
                            <h4>Welcome to PredictKing!</h4>
                            <p>Start betting and earning rewards.</p>
                            <span class="notification-time">2 hours ago</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('notifications-modal');
}

function openNotificationModal(notificationText, notificationTitle = "Notification") {
    // Fade the profile modal
    const profileModal = document.getElementById('profile-modal');
    if (profileModal && profileModal.style.display !== 'none') {
        profileModal.classList.add('faded');
    }
    
    // Create notification modal
    let modal = document.getElementById('notification-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notification-detail-modal';
        modal.className = 'modal notification-modal';
        modal.innerHTML = `
            <div class="modal-content notification-modal-content">
                <span class="close" onclick="closeNotificationModal()">&times;</span>
                <h2 id="notification-detail-title"></h2>
                <div id="notification-detail-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('notification-detail-title').textContent = notificationTitle;
    document.getElementById('notification-detail-content').textContent = notificationText;
    showModal('notification-detail-modal');
}

function closeNotificationModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) {
        profileModal.classList.remove('faded');
    }
    closeModal('notification-detail-modal');
}

// Theme Management
function setTheme(theme) {
    document.body.className = '';
    document.body.classList.add(theme + '-theme');
    currentTheme = theme;
}

function updateThemeBasedOnUser() {
    if (!currentUser) {
        setTheme('default');
        // Show logged out buttons, hide logged in buttons
        const loggedOutBtns = document.querySelector('.header-buttons:not(.logged-in-buttons)');
        const loggedInBtns = document.querySelector('.logged-in-buttons');
        if (loggedOutBtns) loggedOutBtns.classList.remove('hidden');
        if (loggedInBtns) loggedInBtns.classList.add('hidden');
    } else {
        // Hide logged out buttons, show logged in buttons
        const loggedOutBtns = document.querySelector('.header-buttons:not(.logged-in-buttons)');
        const loggedInBtns = document.querySelector('.logged-in-buttons');
        if (loggedOutBtns) loggedOutBtns.classList.add('hidden');
        if (loggedInBtns) loggedInBtns.classList.remove('hidden');
        
        if (currentUser.gender === 'male') {
            setTheme('male');
        } else if (currentUser.gender === 'female') {
            setTheme('female');
        }
    }
}

// Authentication Functions
function showLogin() {
    showModal('login-modal');
}

function showRegister() {
    showModal('register-modal');
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const code = document.getElementById('login-code').value;
        // Set flag to refresh after manual login AND store welcome message flag
        window.shouldRefreshAfterLogin = true;
        localStorage.setItem('showWelcomeMessage', 'true');
        loginUser(code);
    });
}

const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();
        registerUser();
    });
}

// ADD THE PROFILE PICTURE HANDLER HERE:
// Profile picture upload handler
const profilePicInput = document.getElementById('profile-pic');
if (profilePicInput) {
    profilePicInput.addEventListener('change', function() {
        const file = this.files[0];
        const button = document.querySelector('.file-upload-btn');
        
        if (file) {
            button.textContent = `📷 ${file.name}`;
            button.style.color = 'var(--primary-color)';
        } else {
            button.textContent = '📷 Upload Profile Picture';
            button.style.color = '';
        }
    });
}


// Find the loginUser function and add 'async' before 'function':
async function loginUser(code, silentLogin = false) {
    try {
        showBuffering();
        const userQuery = await db.collection('users').where('loginCode', '==', code).get();
        
        if (userQuery.empty) {
            showNotification('Invalid login code', 'error');
            return;
        }

        const userData = userQuery.docs[0].data();
        currentUser = { id: userQuery.docs[0].id, ...userData };
        
        localStorage.setItem('userCode', code);
        updateUIForLoggedInUser();
        updateThemeBasedOnUser();
        closeModal('login-modal');
        
        // Only increase active players count for actual login, not refresh
        if (!silentLogin) {
            // await updateActivePlayersCount(1);
            logActivity('login', { userId: currentUser.id });
            // Store flag to show welcome message after refresh
            localStorage.setItem('showWelcomeMessage', 'true');
        }
        
        hideBuffering();
        
        // Refresh page after successful login if needed
        if (window.shouldRefreshAfterLogin || !silentLogin) {
            setTimeout(() => {
                window.shouldRefreshAfterLogin = false; // Reset flag
                window.location.reload();
            }, 300); // Faster refresh
        }
        
        return currentUser;
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
        hideBuffering();
    }
}


// Real-time logged-in active players tracking with robust error handling
let heartbeatInterval = null;
let deviceId = null;
let isPageActive = true;
let isTracking = false;
let heartbeatRetryCount = 0;
let maxRetries = 3;

// Generate unique device ID for this specific device/browser instance
function generateDeviceId() {
    let storedDeviceId = localStorage.getItem('predictking_device_id');
    if (!storedDeviceId) {
        storedDeviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 12);
        localStorage.setItem('predictking_device_id', storedDeviceId);
    }
    return storedDeviceId;
}

// Start tracking this logged-in device as active
function startActivePlayerTracking() {
    // Only track if user is logged in
    if (!currentUser) {
        stopActivePlayerTracking();
        return;
    }
    
    if (isTracking) return; // Already tracking
    
    deviceId = generateDeviceId();
    isTracking = true;
    heartbeatRetryCount = 0;
    
    // Register this logged-in device immediately
    registerLoggedInDevice();
    
    // Send heartbeat every 15 seconds
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(sendHeartbeatWithRetry, 15000);
    
    // Handle page visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange, false);
    
    // Handle page unload (when user closes tab/browser)
    window.addEventListener('beforeunload', function(event) {
        handlePageUnload();
        stopGlobalRealTimeListeners();
        stopOddsPolling();
    }, false);

    window.addEventListener('unload', function() {
        handlePageUnload();
        stopGlobalRealTimeListeners();
        stopOddsPolling();
    }, false);

    window.addEventListener('pagehide', function() {
        handlePageUnload();
        stopGlobalRealTimeListeners();
        stopOddsPolling();
    }, false);

    // Additional cleanup for mobile browsers
    document.addEventListener('freeze', function() {
        handlePageUnload();
        stopGlobalRealTimeListeners();
        stopOddsPolling();
    }, false);

    document.addEventListener('resume', handlePageResume, false);
}

// Register this logged-in device as active (always use SET to avoid document not found)
async function registerLoggedInDevice() {
    if (!currentUser || !deviceId) return;
    
    try {
        // Use SET instead of UPDATE to create document if it doesn't exist
        await db.collection('active_logged_devices').doc(deviceId).set({
            deviceId: deviceId,
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            userDisplayName: currentUser.displayName,
            lastHeartbeat: firebase.firestore.Timestamp.now(),
            pageUrl: window.location.pathname,
            userAgent: navigator.userAgent.substring(0, 100),
            isActive: true,
            loginTime: firebase.firestore.Timestamp.now(),
            createdAt: firebase.firestore.Timestamp.now()
        });
        
        heartbeatRetryCount = 0; // Reset retry count on success
        
        // Update active count immediately
        await updateLoggedInPlayersCount();
        
    } catch (error) {
        console.error('Error registering logged-in device:', error);
        // Retry registration after a delay
        setTimeout(() => registerLoggedInDevice(), 2000);
    }
}

// Send heartbeat with automatic retry and fallback to SET if UPDATE fails
async function sendHeartbeatWithRetry() {
    if (!currentUser || !deviceId || !isTracking) return;
    
    try {
        await sendHeartbeat();
        heartbeatRetryCount = 0; // Reset on success
    } catch (error) {
        console.error('Heartbeat failed, retrying...', error);
        heartbeatRetryCount++;
        
        if (heartbeatRetryCount <= maxRetries) {
            // Retry with exponential backoff
            const delay = Math.min(1000 * Math.pow(2, heartbeatRetryCount - 1), 10000);
            setTimeout(async () => {
                try {
                    // Use SET as fallback to recreate document
                    await registerLoggedInDevice();
                } catch (retryError) {
                    console.error('Retry failed:', retryError);
                }
            }, delay);
        } else {
            // Max retries reached, re-register completely
            console.log('Max retries reached, re-registering device...');
            heartbeatRetryCount = 0;
            await registerLoggedInDevice();
        }
    }
}

// Send heartbeat to keep logged-in device alive
async function sendHeartbeat() {
    if (!currentUser || !deviceId || !isTracking) return;
    
    // Always use SET with merge to avoid document not found errors
    await db.collection('active_logged_devices').doc(deviceId).set({
        deviceId: deviceId,
        userId: currentUser.id,
        userNickname: currentUser.nickname,
        userDisplayName: currentUser.displayName,
        lastHeartbeat: firebase.firestore.Timestamp.now(),
        pageUrl: window.location.pathname,
        isActive: isPageActive
    }, { merge: true }); // merge: true updates existing fields or creates document
    
    // Update active count periodically
    await updateLoggedInPlayersCount();
}

// Handle when page becomes hidden/visible
function handleVisibilityChange() {
    const wasActive = isPageActive;
    isPageActive = !document.hidden;
    
    if (!currentUser) return; // Only track logged-in users
    
    if (!isPageActive && wasActive) {
        // Page became hidden - mark as inactive but keep document alive
        if (deviceId) {
            db.collection('active_logged_devices').doc(deviceId).set({
                deviceId: deviceId,
                userId: currentUser.id,
                isActive: false,
                lastHeartbeat: firebase.firestore.Timestamp.now()
            }, { merge: true }).catch(console.error);
        }
        
        // Stop heartbeat when page is hidden
        if (heartbeatInterval) {
            clearInterval(heartbeatInterval);
            heartbeatInterval = null;
        }
        
    } else if (isPageActive && !wasActive) {
        // Page became visible again - reactivate
        if (deviceId) {
            db.collection('active_logged_devices').doc(deviceId).set({
                deviceId: deviceId,
                userId: currentUser.id,
                isActive: true,
                lastHeartbeat: firebase.firestore.Timestamp.now()
            }, { merge: true }).catch(console.error);
        }
        
        // Restart heartbeat
        if (!heartbeatInterval) {
            heartbeatInterval = setInterval(sendHeartbeatWithRetry, 15000);
            sendHeartbeatWithRetry(); // Send immediately
        }
    }
    
    // Update count when visibility changes
    updateLoggedInPlayersCount();
}

// Handle when user closes tab/browser or navigates away
function handlePageUnload() {
    if (!deviceId || !currentUser) return;
    
    // Immediately remove this logged-in device
    try {
        // Use sendBeacon for reliable cleanup on page unload
        if (navigator.sendBeacon && typeof window.fetch !== 'undefined') {
            const data = JSON.stringify({ 
                action: 'cleanup_device',
                deviceId: deviceId,
                userId: currentUser.id
            });
            navigator.sendBeacon('/api/cleanup-device', data);
        }
        
        // Also try direct deletion (synchronous call)
        db.collection('active_logged_devices').doc(deviceId).delete();
        
    } catch (error) {
        // Ignore errors during unload
    }
    
    // Stop tracking
    stopActivePlayerTracking();
}

// Handle when page resumes (for mobile)
function handlePageResume() {
    if (currentUser && !isTracking) {
        startActivePlayerTracking();
    } else if (currentUser && !heartbeatInterval) {
        heartbeatInterval = setInterval(sendHeartbeatWithRetry, 15000);
        sendHeartbeatWithRetry(); // Send immediately
    }
}

// Stop tracking this device
function stopActivePlayerTracking() {
    isTracking = false;
    
    if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
    }
    
    // Remove event listeners
    document.removeEventListener('visibilitychange', handleVisibilityChange, false);
    window.removeEventListener('beforeunload', handlePageUnload, false);
    window.removeEventListener('unload', handlePageUnload, false);
    window.removeEventListener('pagehide', handlePageUnload, false);
    document.removeEventListener('freeze', handlePageUnload, false);
    document.removeEventListener('resume', handlePageResume, false);
}

// Update active logged-in players count by cleaning up old devices
async function updateLoggedInPlayersCount() {
    try {
        const now = firebase.firestore.Timestamp.now();
        const twoMinutesAgo = new Date(now.toDate().getTime() - 120000); // 2 minute threshold (more generous)
        const cutoff = firebase.firestore.Timestamp.fromDate(twoMinutesAgo);
        
        // Get all logged-in devices
        const allDevices = await db.collection('active_logged_devices').get();
        
        let activeLoggedInDevices = 0;
        const batch = db.batch();
        let batchOperations = 0;
        
        allDevices.docs.forEach(doc => {
            const data = doc.data();
            const lastHeartbeat = data.lastHeartbeat;
            
            // If device is too old or explicitly inactive, delete it
            if (!lastHeartbeat || lastHeartbeat < cutoff || !data.isActive) {
                if (batchOperations < 500) { // Firestore batch limit
                    batch.delete(doc.ref);
                    batchOperations++;
                }
            } else {
                // Count as active logged-in device
                activeLoggedInDevices++;
            }
        });
        
        // Commit deletions if any
        if (batchOperations > 0) {
            await batch.commit();
        }
        
        // Update global stats with logged-in players count
        await db.collection('stats').doc('global').set({
            activePlayers: activeLoggedInDevices,
            lastUpdated: firebase.firestore.Timestamp.now()
        }, { merge: true });
        
        // Update UI immediately
        updateActivePlayersUI(activeLoggedInDevices);
        
    } catch (error) {
        console.error('Error updating logged-in players count:', error);
        // Don't let this error stop the tracking
    }
}

// Update UI with current active logged-in players count
function updateActivePlayersUI(count) {
    const activePlayersEls = ['active-players', 'active-players-sticky', 'active-players-bottom'];
    activePlayersEls.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = count;
    });
}

// Enhanced login function that starts tracking
async function loginUser(code, silentLogin = false) {
    try {
        showBuffering();
        const userQuery = await db.collection('users').where('loginCode', '==', code).get();
        
        if (userQuery.empty) {
            showNotification('Invalid login code', 'error');
            return;
        }

        const userData = userQuery.docs[0].data();
        currentUser = { id: userQuery.docs[0].id, ...userData };
        
        localStorage.setItem('userCode', code);
        updateUIForLoggedInUser();
        updateThemeBasedOnUser();
        closeModal('login-modal');
        
        // Start tracking this logged-in device
        setTimeout(() => startActivePlayerTracking(), 500); // Small delay to ensure everything is ready
        
        if (!silentLogin) {
            logActivity('login', { userId: currentUser.id, deviceId: deviceId });
            localStorage.setItem('showWelcomeMessage', 'true');
        }
        
        hideBuffering();
        
        if (window.shouldRefreshAfterLogin || !silentLogin) {
            setTimeout(() => {
                window.shouldRefreshAfterLogin = false;
                window.location.reload();
            }, 300);
        }
        
        return currentUser;
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Login failed', 'error');
        hideBuffering();
    }
}

// Enhanced logout function that stops tracking
function logout() {
    // Remove this device from active tracking
    if (deviceId && currentUser) {
        db.collection('active_logged_devices').doc(deviceId).delete().catch(console.error);
    }
    
    // Stop tracking
    stopActivePlayerTracking();
    
    currentUser = null;
    localStorage.removeItem('userCode');
    
    closeModal('profile-modal');
    showNotification('Logged out successfully', 'success');
    
    setTimeout(() => {
        window.location.href = 'tqpsut.html';
    }, 1000);
}







async function registerUser() {
    const gender = document.getElementById('gender').value;
    const profilePicFile = document.getElementById('profile-pic').files[0];
    
    // Handle profile picture
    const profilePic = await handleProfilePicUpload(profilePicFile, gender);
    
    const formData = {
        nickname: document.getElementById('nickname').value,
        displayName: document.getElementById('display-name').value,
        gender: gender,
        instagram: document.getElementById('instagram').value,
        profilePic: profilePic,
        registrationDate: firebase.firestore.Timestamp.now(),
        kycStatus: 'pending',
        repScore: 'GOOD',
        balance: 0,
        debt: 0,
        totalWinnings: 0,
        totalBets: 0,
        dailyBuyinUsed: 0,
        lastBuyinReset: firebase.firestore.Timestamp.now()
    };

    try {
        showBuffering();
        
        // Generate SHA256 login code with better error handling
        let loginCode;
        try {
            loginCode = await generateSHA256(formData.nickname + Date.now());
        } catch (hashError) {
            console.error('Hash generation error:', hashError);
            // Fallback to simpler hash if crypto.subtle fails
            loginCode = btoa(formData.nickname + Date.now() + Math.random()).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32);
        }
        formData.loginCode = loginCode;

        // Check if nickname exists
        const nicknameQuery = await db.collection('users').where('nickname', '==', formData.nickname).get();
        if (!nicknameQuery.empty) {
            showNotification('Nickname already exists', 'error');
            hideBuffering();
            return;
        }

        // Create user
        const docRef = await db.collection('users').add(formData);
        
        // Store user ID for later reference
        window.currentUserId = docRef.id;
        
        // Store login code in browser storage immediately
        localStorage.setItem('userCode', loginCode);
        localStorage.setItem('savedUsername', formData.nickname);
        localStorage.setItem('userSHA256', loginCode); // Store for profile access
        
        // Store in cookies as backup (expires in 1 year)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `predictking_code=${loginCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        document.cookie = `predictking_username=${formData.nickname}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        
        // Show login code modal
        document.getElementById('generated-code').value = loginCode;
        closeModal('register-modal');
        showModal('code-modal');
        
        // Set registration variables but DON'T auto-login
        window.registrationInProgress = true;
        window.currentRegistrationCode = loginCode;
        window.currentRegistrationUsername = formData.nickname;
        
        // Log registration
        logActivity('registration', { userId: docRef.id, nickname: formData.nickname });
        
        // Trigger browser password save after modal is shown - this should prompt save dialog
        setTimeout(() => {
            triggerPasswordSaveForRegistration(formData.nickname, loginCode);
        }, 1500);
        
        hideBuffering();
        showNotification('Account created successfully! IMPORTANT: Save your login code now!', 'success');
        
    } catch (error) {
        console.error('Registration error:', error);
        showNotification('Registration failed. Please try again.', 'error');
        hideBuffering();
    }
}

// ADD this new function after registerUser:
function triggerPasswordSave(username, password) {
    // Don't interfere with registration process
    if (window.registrationInProgress) {
        return;
    }
    
    // Use the enhanced registration function for consistency
    triggerPasswordSaveForRegistration(username, password);
}

async function generateSHA256(text) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Make sure this is called after login check
function updateLayoutBasedOnLoginStatus() {
    if (currentUser) {
        showLoggedInLayout();
    } else {
        showLoggedOutLayout();
    }
}

// Call this in your checkLoginStatus success callback
function checkLoginStatus() {
    return new Promise((resolve) => {
        const savedCode = localStorage.getItem('userCode');
        if (savedCode) {
            loginUser(savedCode, true)  // silent login - no refresh
                .then(() => { 
                    updateLayoutBasedOnLoginStatus();
                    resolve();
                })
                .catch(() => {
                    updateLayoutBasedOnLoginStatus();
                    resolve();
                });
        } else {
            updateLayoutBasedOnLoginStatus();
            resolve();
        }
    });
}




function updateUIForLoggedInUser() {
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('register-btn');
    const walletBtn = document.getElementById('wallet-btn');
    
    if (loginBtn) loginBtn.classList.add('hidden');
    if (registerBtn) registerBtn.classList.add('hidden');
    if (walletBtn) walletBtn.classList.remove('hidden');
    
    updateBalance();
}

// Modal Functions
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.style.display = 'block';
    // Remove any animation classes to ensure no animation
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.classList.remove('slide-out');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        
        // Stop ad video if closing ad modal
        if (modalId === 'ad-modal') {
            cleanupAdTimer();
        }
        
        // Clean up any animation classes
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.classList.remove('slide-out');
        }
    }
}

// Clean up ad timer when modal closes
function cleanupAdTimer() {
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
        claimBtn.textContent = 'CLAIM REWARD'; // Reset to default text
    }
    const adVideo = document.getElementById('ad-video');
    if (adVideo) {
        adVideo.src = 'about:blank';
        adVideo.remove();
        const adContainer = document.querySelector('.ad-container');
        if (adContainer) {
            const newIframe = document.createElement('iframe');
            newIframe.id = 'ad-video';
            newIframe.width = '100%';
            newIframe.height = '300';
            newIframe.frameBorder = '0';
            newIframe.allowFullscreen = true;
            newIframe.allow = 'autoplay; fullscreen';
            adContainer.appendChild(newIframe);
        }
    }
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = '30';
    }
    
    // Clear any pending buy-in amount if ad is closed without claiming
    if (window.adPurpose === 'buyin') {
        window.pendingBuyinAmount = null;
    }
}

// Wallet Functions
function showWallet() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const walletBalance = currentUser.balance - currentUser.debt;
    const balanceEl = document.getElementById('wallet-balance');
    
    balanceEl.innerHTML = formatCurrency(walletBalance);
    
    // Set color based on wallet balance and user theme
    if (walletBalance < 0) {
        balanceEl.style.color = '#ffc857'; // Debt color (amber)
    } else {
        // Use theme-specific colors
        if (currentUser.gender === 'male') {
            balanceEl.style.color = '#9ef01a'; // Male theme green
        } else if (currentUser.gender === 'female') {
            balanceEl.style.color = '#ff0a54'; // Female theme pink
        } else {
            balanceEl.style.color = '#FFF3DA'; // Default warm white
        }
    }
    
    showModal('wallet-modal');
}

function updateEVCWalletBalance() {
    const evcWalletBalance = document.getElementById('wallet-balance');
    if (evcWalletBalance && currentUser) {
        const walletBalance = currentUser.balance - currentUser.debt;
        evcWalletBalance.innerHTML = formatCurrency(walletBalance);
        
        // Set color based on wallet balance and user theme
        if (walletBalance < 0) {
            evcWalletBalance.style.color = '#ffc857'; // Debt color (amber)
        } else {
            // Use theme-specific colors
            if (currentUser.gender === 'male') {
                evcWalletBalance.style.color = '#9ef01a'; // Male theme green
            } else if (currentUser.gender === 'female') {
                evcWalletBalance.style.color = '#ff0a54'; // Female theme pink
            } else {
                evcWalletBalance.style.color = '#FFF3DA'; // Default warm white for non-gendered users
            }
        }
    }
}

function updateBalance() {
    if (currentUser) {
        const walletBalance = currentUser.balance - currentUser.debt;
        const balanceText = formatCurrency(walletBalance);
        
        const balanceEl = document.getElementById('balance');
        if (balanceEl) {
            balanceEl.innerHTML = balanceText;
            balanceEl.style.display = 'none'; // Always hide on homepage
            
            // Set color based on wallet balance
            if (walletBalance < 0) {
                balanceEl.style.color = '#ffc857'; // Debt color
            } else {
                balanceEl.style.color = 'var(--primary-color)'; // Theme color
            }
        }
    }
}

// Quero (₮Ξ) - Universal currency for PredictKing
// Etymology: "Quero" derives from Latin "quaero" meaning "I seek/desire"
// symbolizing the player's quest for victory and rewards in prediction gaming
function formatCurrency(amount) {
    const flooredAmount = Math.floor(amount); // Floor the amount to remove decimals
    return `<span class="currency-coin">₮Ξ</span>${flooredAmount}`;
}

function getStatusColor(status) {
    if (!status) return '#9ef01a'; // default to active color
    
    const statusLower = status.toLowerCase().trim();
    
    switch(statusLower) {
        case 'active':
            return '#9ef01a';
        case 'settled':
            return '#2ec4b6';
        case 'cancelled':
            return '#ff0a54';
        case 'delayed':
            return '#3a86ff';
        case 'upcoming':
            return '#ffd400';
        default:
            // For other statuses, use the event's custom statusColor or default
            return '#9ef01a';
    }
}

// ADD this function after formatCurrency:
function checkUserDebt() {
    if (!currentUser) return false;
    
    const walletBalance = currentUser.balance - currentUser.debt;
    return walletBalance < 0; // Returns true if user is in debt
}

function showAmberNotification(message) {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    // Clear any existing timers
    if (window.notificationTimer) {
        clearTimeout(window.notificationTimer);
    }
    if (window.notificationHideTimer) {
        clearTimeout(window.notificationHideTimer);
    }
    
    text.textContent = message;
    notification.className = 'notification warning'; // Use warning class for amber color
    
    // Swoosh animation from left to right
    notification.classList.remove('hidden', 'hide');
    notification.classList.add('show');
    
    // Set timers with proper cleanup
    window.notificationTimer = setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        window.notificationHideTimer = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('hide');
            window.notificationTimer = null;
            window.notificationHideTimer = null;
        }, 600);
    }, 3000); // Longer display time for debt warning
}

async function settleDebtAutomatically(userId, amountToAdd) {
    try {
        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        
        const currentBalance = userData.balance || 0;
        const currentDebt = userData.debt || 0;
        
        if (currentDebt > 0) {
            const totalAvailable = currentBalance + amountToAdd;
            
            if (totalAvailable >= currentDebt) {
                // Can settle all debt
                const remainingBalance = totalAvailable - currentDebt;
                await userRef.update({
                    balance: Math.floor(remainingBalance),
                    debt: 0
                });
                
                showNotification(`Debt of ${formatCurrency(currentDebt, userData.currency)} settled! Remaining balance: ${formatCurrency(remainingBalance, userData.currency)}`, 'success');
                
                return { balance: Math.floor(remainingBalance), debt: 0 };
            } else {
                // Partial debt settlement
                const remainingDebt = currentDebt - totalAvailable;
                await userRef.update({
                    balance: 0,
                    debt: Math.floor(remainingDebt)
                });
                
                showNotification(`Partial debt settlement: ${formatCurrency(totalAvailable, userData.currency)} applied. Remaining debt: ${formatCurrency(remainingDebt, userData.currency)}`, 'info');
                
                return { balance: 0, debt: Math.floor(remainingDebt) };
            }
        } else {
            // No debt, just add to balance
            const newBalance = currentBalance + amountToAdd;
            await userRef.update({
                balance: Math.floor(newBalance)
            });
            
            return { balance: Math.floor(newBalance), debt: 0 };
        }
    } catch (error) {
        console.error('Error settling debt:', error);
        throw error;
    }
}

// Events and Betting Functions
async function loadEvents() {
    try {
        const eventsSnapshot = await db.collection('events')
            .where('display_status', '==', 'visible')
            .get();
        events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayEvents();
    } catch (error) {
        console.error('Error loading events:', error);
    }
}

function displayEvents() {
    const grid = document.getElementById('events-grid');
    if (!grid) return;
    
    grid.innerHTML = '';
    grid.className = 'events-list'; // Change from grid to list
    
    events.forEach(event => {
        const eventCard = createEventCard(event);
        grid.appendChild(eventCard);
    });
}

function createEventCard(event) {
    const card = document.createElement('div');
    card.className = 'event-bar';
    card.onclick = () => handleEventBarClick(event);
    
    // Calculate time remaining for upcoming events and auto-update status
    let statusText = event.status || 'active';
    let statusColor = getStatusColor(event.status);
    
    if (event.status && event.status.toLowerCase() === 'settled') {
        // Show winner instead of "settled"
        if (event.winner) {
            statusText = `${event.winner} won`;
            statusColor = '#2ec4b6'; // Keep settled color
        } else {
            statusText = 'Settled';
            statusColor = '#2ec4b6';
        }
    } else if (event.status && event.status.toLowerCase() === 'upcoming' && event.startTime) {
        const now = new Date();
        const startTime = event.startTime.toDate();
        const timeDiff = startTime - now;
        
        if (timeDiff <= 0) {
            // Time has elapsed, auto-update to active
            statusText = 'active';
            statusColor = getStatusColor('active');
            
            // Update Firebase document automatically
            db.collection('events').doc(event.id).update({
                status: 'active'
            }).then(() => {
                console.log(`Event ${event.id} auto-updated from upcoming to active`);
                // Update local events array
                const eventIndex = events.findIndex(e => e.id === event.id);
                if (eventIndex !== -1) {
                    events[eventIndex].status = 'active';
                }
            }).catch(error => {
                console.error('Error auto-updating event status:', error);
            });
        } else {
            // Show countdown - keep upcoming color
            const hours = Math.floor(timeDiff / (1000 * 60 * 60));
            const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
            
            if (hours > 0) {
                statusText = `T-Minus ${hours}hrs`;
            } else if (minutes > 0) {
                statusText = `T-Minus ${minutes}mins`;
            } else {
                statusText = 'Starting Soon';
            }
            statusColor = getStatusColor('upcoming'); // Amber color for upcoming
        }
    }
    
    // Get team information
    const teams = event.options || ['Team A', 'Team B'];
    const team1 = teams[0] || 'Team A';
    const team2 = teams[1] || 'Team B';
    
    const currentOdds = event.currentOdds || event.initialOdds || {};
    const team1Odds = currentOdds[team1] || 2.0;
    const team2Odds = currentOdds[team2] || 2.0;
    
    const team1Logo = event.team1Logo || 'https://api.dicebear.com/7.x/shapes/svg?seed=team1&backgroundColor=9ef01a';
    const team2Logo = event.team2Logo || 'https://api.dicebear.com/7.x/shapes/svg?seed=team2&backgroundColor=ff0a54';
    
    card.innerHTML = `
        <div class="event-bar-header">
            <div class="event-title-section">
                <span class="event-title-text">${event.title}</span>
                <img src="${event.profilePic}" alt="Event" class="event-profile-mini">
            </div>
        </div>
        
        <div class="event-bar-content">
            <div class="team-section team-left">
                <img src="${team1Logo}" alt="Team 1" class="team-logo" style="object-fit: contain;">
                <div class="team-info">
                    <div class="team-name">${team1}</div>
                    <div class="team-odds">${team1Odds.toFixed(2)}</div>
                    <div class="team-score">-</div>
                </div>
            </div>
            
            <div class="center-section">
                <div class="vs-pool-display" id="vs-${event.id}">VS</div>
            </div>
            
            <div class="team-section team-right">
                <img src="${team2Logo}" alt="Team 2" class="team-logo" style="object-fit: contain;">
                <div class="team-info team-info-right">
                    <div class="team-name">${team2}</div>
                    <div class="team-odds">${team2Odds.toFixed(2)}</div>
                    <div class="team-score">-</div>
                </div>
            </div>
        </div>
        
        <div class="event-bar-footer">
            <div class="status-section">
                <div class="status-indicator" style="background-color: ${statusColor};"></div>
                <span class="status-text">${statusText}</span>
            </div>
        </div>
    `;
    
    setTimeout(() => startVsPoolAnimation(event.id, event.totalPot || 0), 1000);
    
    return card;
}

function handleEventBarClick(event) {
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    // Check if event is settled
    if (event.status === 'settled') {
        showNotification('This event has been settled. Betting is closed.', 'warning');
        return;
    }
    
    // Check if event is not active
    if (event.status !== 'active') {
        showNotification(`Event is ${event.status}. Betting is not available.`, 'warning');
        return;
    }
    
    // Check user status
    if (currentUser.kycStatus !== 'approved') {
        showAmberNotification('Account awaiting approval (~8hrs)');
        return;
    }
    
    if (checkUserDebt()) {
        showAmberNotification('Clear your debt first!');
        return;
    }
    
    const walletBalance = currentUser.balance - currentUser.debt;
    if (walletBalance <= 0) {
        showAmberNotification('Insufficient balance! Add funds to start betting.');
        return;
    }
    
    // Open new betting modal
    showNewBettingModal(event);
}

function startVsPoolAnimation(eventId, totalPot) {
    const element = document.getElementById(`vs-${eventId}`);
    if (!element) return;
    
    let showingVS = true;
    
    const updateDisplay = () => {
        // Get current pot from local event data (updated instantly)
        const currentEvent = events.find(e => e.id === eventId);
        const currentPot = currentEvent ? currentEvent.totalPot || 0 : totalPot;
        
        if (showingVS) {
            element.innerHTML = `Pool ${formatCurrency(currentPot)}`;
            element.classList.add('pool-text');
        } else {
            element.textContent = 'VS';
            element.classList.remove('pool-text');
        }
        showingVS = !showingVS;
    };
    
    updateDisplay(); // Initial display
    setInterval(updateDisplay, 3000 + Math.random() * 2000);
}

async function showNewBettingModal(event) {
    window.currentEventId = event.id;
    window.selectedTeam = null;
    window.selectedAmount = '';
    
    const teams = event.options || ['Team A', 'Team B'];
    const currentOdds = event.currentOdds || event.initialOdds || {};
    
    // Get actual bet counts from betting_slips collection
    let team1Bets = 0;
    let team2Bets = 0;
    
    try {
        const betsQuery = await db.collection('betting_slips')
            .where('eventId', '==', event.id)
            .get();
        
        betsQuery.docs.forEach(doc => {
            const betData = doc.data();
            if (betData.selectedOption === teams[0]) {
                team1Bets++;
            } else if (betData.selectedOption === teams[1]) {
                team2Bets++;
            }
        });
    } catch (error) {
        console.error('Error loading bet counts:', error);
        // Continue with 0 counts if error
    }
    
    const modalHTML = `
        <div class="fullscreen-betting-modal" id="betting-modal-new">
            <div class="betting-modal-content">
                <div class="betting-header">
                    <div class="betting-title">${event.title}</div>
                    <div class="betting-datetime">${formatEventTime(event.startTime)}</div>
                </div>
                
                <div class="team-options">
                    <div class="team-option" onclick="selectTeam('${teams[0]}', 0)" onmousedown="startVoteTimer('${teams[0]}', this)" onmouseup="cancelVoteTimer()" onmouseleave="cancelVoteTimer()" ontouchstart="startVoteTimer('${teams[0]}', this)" ontouchend="cancelVoteTimer()">
                        <div class="team-option-left">
                            <div class="team-option-name">${teams[0]}</div>
                            <div class="team-option-bets">${team1Bets} bets</div>
                        </div>
                        <img src="${event.team1Logo || 'https://api.dicebear.com/7.x/shapes/svg?seed=team1'}" class="team-option-logo">
                        <div class="team-option-odds">${(currentOdds[teams[0]] || 2.0).toFixed(2)}</div>
                    </div>
                    
                    <div class="team-option" onclick="selectTeam('${teams[1]}', 1)" onmousedown="startVoteTimer('${teams[1]}', this)" onmouseup="cancelVoteTimer()" onmouseleave="cancelVoteTimer()" ontouchstart="startVoteTimer('${teams[1]}', this)" ontouchend="cancelVoteTimer()">
                        <div class="team-option-left">
                            <div class="team-option-name">${teams[1]}</div>
                            <div class="team-option-bets">${team2Bets} bets</div>
                        </div>
                        <img src="${event.team2Logo || 'https://api.dicebear.com/7.x/shapes/svg?seed=team2'}" class="team-option-logo">
                        <div class="team-option-odds">${(currentOdds[teams[1]] || 2.0).toFixed(2)}</div>
                    </div>
                </div>
                
                <div class="amount-input-section">
                    <input type="text" id="bet-amount-display" readonly placeholder="Enter amount" class="amount-display">
                </div>
                
                <div class="keypad">
                    <div class="keypad-row">
                        <button class="keypad-btn" onclick="addToAmount('1')">1</button>
                        <button class="keypad-btn" onclick="addToAmount('2')">2</button>
                        <button class="keypad-btn" onclick="addToAmount('3')">3</button>
                    </div>
                    <div class="keypad-row">
                        <button class="keypad-btn" onclick="addToAmount('4')">4</button>
                        <button class="keypad-btn" onclick="addToAmount('5')">5</button>
                        <button class="keypad-btn" onclick="addToAmount('6')">6</button>
                    </div>
                    <div class="keypad-row">
                        <button class="keypad-btn" onclick="addToAmount('7')">7</button>
                        <button class="keypad-btn" onclick="addToAmount('8')">8</button>
                        <button class="keypad-btn" onclick="addToAmount('9')">9</button>
                    </div>
                    <div class="keypad-row">
                        <button class="keypad-btn" onclick="addToAmount('0')">0</button>
                        <button class="keypad-btn" onclick="addToAmount('00')">00</button>
                        <button class="keypad-btn clear-btn" onclick="clearAmount()">C</button>
                    </div>
                </div>
                
                <button class="place-bet-btn" id="place-bet-btn" onclick="placeBetNew()" disabled>
                    Place Bet
                </button>
                
                <button class="stats-btn" onclick="showStatsModal()">Stats</button>
                
                <div class="modal-tabs">
                    <div class="tab-item active" onclick="switchTab('pool')">Pool</div>
                    <button class="modal-close-btn" onclick="closeNewBettingModal()">
                        <i class="fas fa-times"></i>
                    </button>
                    <div class="tab-item" onclick="switchTab('1v1')">1v1</div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('betting-modal-new');
    if (existingModal) {
        existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.body.style.overflow = 'hidden';

    // Start real-time odds updates
    setTimeout(() => {
        startOddsPolling(event.id);
        // Also start team options updates
        const teamOptionsListener = db.collection('events').doc(event.id).onSnapshot((doc) => {
            if (doc.exists) {
                const eventData = doc.data();
                if (eventData.currentOdds) {
                    updateTeamOptionsOdds(event.id, eventData.currentOdds);
                }
            }
        });
        window.teamOptionsListener = teamOptionsListener;
    }, 1000);
}

// VFR Voting System
let voteTimer = null;
let votingInProgress = false;

function startVoteTimer(teamName, element) {
    // Only allow voting if user has bet on this event
    if (!currentUser || !window.currentEventId) return;
    
    // Prevent multiple timers
    if (voteTimer) {
        clearTimeout(voteTimer);
    }
    
    votingInProgress = true;
    
    // Visual feedback - add voting class
    element.classList.add('voting-active');
    
    voteTimer = setTimeout(async () => {
        // Check if user has bet on this event
        const userHasBet = await userHadBetOnEvent(window.currentEventId);
        
        if (!userHasBet) {
            showNotification('You can only vote if you have placed a bet on this event', 'warning');
            element.classList.remove('voting-active');
            votingInProgress = false;
            return;
        }
        
        // Check if user already voted
        try {
            const existingVote = await db.collection('event_votes')
                .where('userId', '==', currentUser.id)
                .where('eventId', '==', window.currentEventId)
                .get();
                
            if (!existingVote.empty) {
                showNotification('You have already voted for this event result', 'warning');
                element.classList.remove('voting-active');
                votingInProgress = false;
                return;
            }
            
            // Submit vote
            await submitVFRVote(teamName);
            element.classList.remove('voting-active');
            votingInProgress = false;
            
        } catch (error) {
            console.error('Error checking/submitting vote:', error);
            showNotification('Error submitting vote', 'error');
            element.classList.remove('voting-active');
            votingInProgress = false;
        }
    }, 2000); // 2 second hold
}

function cancelVoteTimer() {
    if (voteTimer) {
        clearTimeout(voteTimer);
        voteTimer = null;
    }
    
    // Remove visual feedback
    document.querySelectorAll('.team-option').forEach(option => {
        option.classList.remove('voting-active');
    });
    
    votingInProgress = false;
}

async function submitVFRVote(selectedWinner) {
    try {
        // Submit vote to Firebase
        await db.collection('event_votes').add({
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            eventId: window.currentEventId,
            selectedWinner: selectedWinner,
            timestamp: firebase.firestore.Timestamp.now(),
            userHadBet: true // We already verified this
        });
        
        showNotification(`Vote submitted: ${selectedWinner} to win!`, 'success');
        
        // Log the voting activity
        logActivity('vfr_vote', { 
            userId: currentUser.id, 
            eventId: window.currentEventId,
            selectedWinner: selectedWinner
        });
        
    } catch (error) {
        console.error('Error submitting VFR vote:', error);
        showNotification('Failed to submit vote', 'error');
    }
}



function updateTeamOptionsOdds(eventId, newOdds) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    // Update team options in new betting modal
    const teamOptions = document.querySelectorAll('.team-option');
    teamOptions.forEach((option, index) => {
        const teamName = currentEvent.options[index];
        if (teamName && newOdds[teamName]) {
            const oddsEl = option.querySelector('.team-option-odds');
            if (oddsEl) {
                const oldOdds = parseFloat(oddsEl.textContent) || 0;
                // Only show indicator if odds actually changed significantly
                if (Math.abs(oldOdds - newOdds[teamName]) > 0.01) {
                    updateBettingModalOddsWithIndicator(oddsEl, oldOdds, newOdds[teamName]);
                } else {
                    // Just update the text without indicator
                    oddsEl.textContent = newOdds[teamName].toFixed(2);
                }
            }
        }
    });
}

function addToAmount(value) {
    const display = document.getElementById('bet-amount-display');
    let current = display.value || '';
    
    if (current === '0' && value !== '00') {
        current = '';
    }
    
    current += value;
    display.value = current;
    window.selectedAmount = current;
    updatePlaceBetButton();
}

function clearAmount() {
    const display = document.getElementById('bet-amount-display');
    display.value = '';
    window.selectedAmount = '';
    updatePlaceBetButton();
}

function updatePlaceBetButton() {
    const btn = document.getElementById('place-bet-btn');
    const amount = window.selectedAmount;
    const team = window.selectedTeam;
    
    if (amount && team && parseInt(amount) > 0) {
        btn.disabled = false;
        // Truncate team name if too long to prevent button width issues
        const truncatedTeam = team.length > 8 ? team.substring(0, 8) + '...' : team;
        btn.innerHTML = `Bet ${formatCurrency(parseInt(amount))} on ${truncatedTeam}`;
    } else {
        btn.disabled = true;
        btn.textContent = 'Place Bet';
    }
}

function switchTab(tabName) {
    const currentEvent = events.find(e => e.id === window.currentEventId);
    if (!currentEvent) return;
    
    if (tabName === '1v1') {
        // Show 1v1 coming soon content but keep the structure
        const modalContent = document.querySelector('.betting-modal-content');
        modalContent.innerHTML = `
            <div class="betting-header">
                <div class="betting-title">${currentEvent.title}</div>
                <div class="betting-datetime">${formatEventTime(currentEvent.startTime)}</div>
            </div>
            
            <div class="tab-content-area">
                <div class="coming-soon-tab-content">
                    <h3>1v1 Betting</h3>
                    <p>Coming Soon!</p>
                </div>
            </div>
            
            <div class="modal-tabs">
                <div class="tab-item" onclick="switchTab('pool')">Pool</div>
                <button class="modal-close-btn" onclick="closeNewBettingModal()">
                    <i class="fas fa-times"></i>
                </button>
                <div class="tab-item active" onclick="switchTab('1v1')">1v1</div>
            </div>
        `;
    } else {
        // Show pool content - recreate the full betting interface
        showNewBettingModal(currentEvent);
        
        // Set the Pool tab as active after recreation
        setTimeout(() => {
            document.querySelectorAll('.modal-tabs .tab-item').forEach(tab => {
                tab.classList.remove('active');
            });
            const poolTab = Array.from(document.querySelectorAll('.modal-tabs .tab-item'))
                .find(tab => tab.textContent.trim() === 'Pool');
            if (poolTab) {
                poolTab.classList.add('active');
            }
        }, 100);
    }
}

function showComingSoonInModal() {
    // Replace content with coming soon message
    const content = document.querySelector('.betting-modal-content');
    content.innerHTML = `
        <div class="coming-soon-content">
            <h2>1v1 Betting</h2>
            <p>Coming Soon!</p>
            <button class="secondary-btn" onclick="closeNewBettingModal()">Close</button>
        </div>
    `;
}

function showStatsModal() {
    const statsModalHTML = `
        <div class="stats-overlay-modal" id="stats-overlay">
            <div class="stats-modal-content">
                <h3>Event Statistics</h3>
                <p>Coming Soon!</p>
                <button class="stats-close-btn-bottom" onclick="closeStatsModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', statsModalHTML);
}

function closeStatsModal() {
    const modal = document.getElementById('stats-overlay');
    if (modal) {
        modal.remove();
    }
}

function placeBetNew() {
    if (!window.selectedTeam || !window.selectedAmount) {
        showNotification('Please select team and amount', 'error');
        return;
    }
    
    const amount = parseInt(window.selectedAmount);
    if (amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    const walletBalance = currentUser.balance - currentUser.debt;
    if (amount > walletBalance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        showBuffering();
        
        const eventId = window.currentEventId;
        const currentEvent = events.find(e => e.id === eventId);
        
        if (!currentEvent) {
            showNotification('Event not found', 'error');
            hideBuffering();
            return;
        }
        
        const optionIndex = currentEvent.options.findIndex(option => option === window.selectedTeam);
        if (optionIndex === -1) {
            showNotification('Selected team not found', 'error');
            hideBuffering();
            return;
        }
        
        const currentOdds = currentEvent.currentOdds || currentEvent.initialOdds || {};
        const lockedOdds = currentOdds[window.selectedTeam] || 2.0;
        
        if (isNaN(lockedOdds) || lockedOdds <= 0) {
            showNotification('Invalid odds. Please try again.', 'error');
            hideBuffering();
            return;
        }
        
        const potentialWinning = Math.floor(amount * lockedOdds);
        
        // INSTANT LOCAL UPDATES
        currentUser.balance -= amount;
        currentUser.totalBets = (currentUser.totalBets || 0) + 1;
        updateBalance();
        updateEVCWalletBalance();
        
        // Update event data instantly
        if (!currentEvent.totalPot) currentEvent.totalPot = 0;
        if (!currentEvent.totalBets) currentEvent.totalBets = 0;
        currentEvent.totalPot += amount;
        currentEvent.totalBets += 1;
        
        // Update odds instantly
        const updatedOdds = calculateInstantOdds(currentEvent, window.selectedTeam, amount);
        currentEvent.currentOdds = updatedOdds;
        
        // Close modal and show success immediately
        closeNewBettingModal();
        hideBuffering();
        
        showNotification(
            `Bet placed: ${formatCurrency(amount)} on ${window.selectedTeam}. Potential win: ${formatCurrency(potentialWinning)}`,
            'success'
        );
        
        // Update UI instantly
        displayEvents(); // Refresh event bars immediately

        // Update bet counts in the betting modal if it's still open
        if (window.currentEventId === eventId) {
            setTimeout(() => updateBetCounts(eventId), 500);
        }
        
        // Firebase transaction in background (no await)
        db.runTransaction(async (transaction) => {
            const poolRef = db.collection('betting_pools').doc(eventId);
            const poolDoc = await transaction.get(poolRef);
            
            let poolData;
            if (!poolDoc.exists) {
                poolData = {
                    eventId: eventId,
                    eventTitle: currentEvent.title,
                    eventStartTime: currentEvent.startTime,
                    eventOptions: currentEvent.options,
                    totalPool: 0,
                    totalBets: 0,
                    totalWagered: 0,
                    optionPools: {},
                    optionBetCounts: {},
                    vigPercentage: currentEvent.vigPercentage || 5,
                    status: 'active',
                    createdAt: firebase.firestore.Timestamp.now()
                };
                
                if (currentEvent.options && Array.isArray(currentEvent.options)) {
                    currentEvent.options.forEach((option) => {
                        poolData.optionPools[option] = 100;
                        poolData.optionBetCounts[option] = 0;
                    });
                }
            } else {
                poolData = poolDoc.data();
                if (!poolData.optionPools) poolData.optionPools = {};
                if (!poolData.optionBetCounts) poolData.optionBetCounts = {};
                if (!poolData.totalWagered) poolData.totalWagered = poolData.totalPool || 0;
            }
            
            const bettingSlip = {
                userId: currentUser.id,
                userNickname: currentUser.nickname,
                userDisplayName: currentUser.displayName,
                eventId: eventId,
                eventTitle: currentEvent.title,
                eventStartTime: currentEvent.startTime,
                selectedOption: window.selectedTeam,
                betAmount: amount,
                currency: 'INR',
                timestamp: firebase.firestore.Timestamp.now(),
                status: 'placed',
                betType: 'pool',
                odds: lockedOdds,
                potentialWinning: potentialWinning
            };
            
            poolData.totalPool += amount;
            poolData.totalBets += 1;
            poolData.totalWagered += amount;
            
            if (!poolData.optionPools[window.selectedTeam]) {
                poolData.optionPools[window.selectedTeam] = 100;
            }
            if (!poolData.optionBetCounts[window.selectedTeam]) {
                poolData.optionBetCounts[window.selectedTeam] = 0;
            }
            
            poolData.optionPools[window.selectedTeam] += amount;
            poolData.optionBetCounts[window.selectedTeam] += 1;
            
            const userRef = db.collection('users').doc(currentUser.id);
            transaction.update(userRef, {
                balance: currentUser.balance,
                totalBets: currentUser.totalBets
            });
            
            transaction.set(poolRef, poolData);
            
            const slipRef = db.collection('betting_slips').doc();
            transaction.set(slipRef, bettingSlip);
            
            const eventRef = db.collection('events').doc(eventId);
            transaction.update(eventRef, {
                totalPot: poolData.totalPool,
                totalBets: poolData.totalBets,
                currentOdds: updatedOdds,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            
            return bettingSlip;
        }).then((result) => {
            logActivity('bet_placed', {
                userId: currentUser.id,
                eventId: eventId,
                amount: amount,
                option: window.selectedTeam,
                lockedOdds: result.odds,
                potentialWinning: result.potentialWinning,
                status: 'placed'
            });
        }).catch((error) => {
            console.error('Firebase transaction failed:', error);
            // Revert local changes if Firebase fails
            currentUser.balance += amount;
            currentUser.totalBets -= 1;
            currentEvent.totalPot -= amount;
            currentEvent.totalBets -= 1;
            updateBalance();
            updateEVCWalletBalance();
            displayEvents();
            showNotification('Transaction failed, bet cancelled', 'error');
        });
        
    } catch (error) {
        console.error('Error placing bet:', error);
        showNotification('Failed to place bet', 'error');
        hideBuffering();
    }
}


function selectTeam(teamName, index) {
    // Don't select if voting is in progress
    if (votingInProgress) return;
    
    window.selectedTeam = teamName;
    
    // Update UI
    document.querySelectorAll('.team-option').forEach((option, idx) => {
        if (idx === index) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    
    updatePlaceBetButton();
}

function closeNewBettingModal() {
    // Cancel any ongoing vote timer
    cancelVoteTimer();
    
    // Stop odds polling when modal closes
    stopOddsPolling();
    
    const modal = document.getElementById('betting-modal-new');
    if (modal) {
        modal.remove();
    }
    document.body.style.overflow = '';
}

// REPLACE the showEventModal function with this improved version:
async function showEventModal(event) {
    if (!currentUser) {
        showNotification('Please login to view event details', 'error');
        return;
    }
    
    // Check if event is settled - no betting allowed
    if (event.status === 'settled') {
        showNotification('This event has been settled. View results in event history.', 'info');
        return;
    }
    
    // Check if event is not active - show status but no betting
    if (event.status !== 'active') {
        showNotification(`Event is ${event.status}. Betting is not available.`, 'warning');
        return;
    }
    
    // Continue with existing modal logic for active events only
    if (checkUserDebt()) {
        showAmberNotification('Clear your debt first!');
        showDebtResolutionModal();
        return;
    }
    
    window.currentEventId = event.id;
    
    // Existing modal code continues here...
    const now = new Date();
    const eventStart = event.startTime ? event.startTime.toDate() : new Date(0);
    const hasStarted = now > eventStart;
    
    // Check if user has wagered on this event
    const userHasWagered = await userHadBetOnEvent(event.id);
    
    let vfrButton = '';
    let bettingContent = '';
    
    if (currentUser.kycStatus !== 'approved') {
        bettingContent = `
            <div class="kyc-required">
                <h3>Account Approval Required</h3>
                <p>Your account is awaiting approval (~8hrs)</p>
            </div>
        `;
    } else if (currentUser.balance - currentUser.debt <= 0) {
        bettingContent = `
            <div class="insufficient-balance">
                <h3>Insufficient Balance</h3>
                <p>Add funds to your wallet to start betting</p>
            </div>
        `;
    } else {
        if (hasStarted && userHasWagered) {
            vfrButton = `<button class="vfr-btn" onclick="showVFRModal('${event.id}')">VOTE FOR RESULT</button>`;
        }
        
        bettingContent = `
            <div class="betting-tabs">
                <button class="tab-btn" onclick="showBettingTab('pool')">Pool Betting</button>
                <button class="tab-btn" onclick="showBettingTab('1v1')">1v1 Betting</button>
            </div>
            <div id="betting-content">
                <div class="select-betting-type">
                    <h3>Select Betting Type</h3>
                    <p>Please select Pool Betting or 1v1 Betting to continue</p>
                </div>
            </div>
        `;
    }
    
    document.getElementById('event-modal').querySelector('.modal-content').innerHTML = `
        <span class="close" onclick="closeModal('event-modal')">&times;</span>
        <h2 id="event-title">${event.title}</h2>
        <p>Start Time: <span id="event-time">${formatEventTime(event.startTime)}</span></p>
        <p>Status: <span id="event-status">ACTIVE</span></p>
        ${vfrButton}
        ${bettingContent}
    `;
    
    showModal('event-modal');
    logActivity('event_view', { userId: currentUser.id, eventId: event.id });
}

// ADD this new function after showEventModal:
function showDebtResolutionModal() {
    const debtAmount = currentUser.debt;
    
    let modal = document.getElementById('debt-resolution-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'debt-resolution-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('debt-resolution-modal')">&times;</span>
                <h2 style="color: #ffc857;">Clear Your Debt First!</h2>
                <div class="debt-info" style="background: rgba(255, 200, 87, 0.1); padding: 1.5rem; border-radius: 8px; margin: 1rem 0;">
                    <h3 style="color: #ffc857; margin-bottom: 1rem;">Outstanding Debt</h3>
                    <div style="font-size: 1.5rem; font-weight: bold; color: #ffc857; margin-bottom: 1rem;">
                        ${formatCurrency(debtAmount)}
                    </div>
                    <p style="color: #FFF3DA; margin-bottom: 1.5rem;">
                        You cannot place bets while you have outstanding debt. Please clear your debt to continue wagering.
                    </p>
                    <div class="debt-resolution-buttons">
                        <button class="primary-btn" onclick="closeModal('debt-resolution-modal'); watchAdForDebtClear();" style="margin-right: 1rem;">
                            WATCH ADS
                        </button>
                        <button class="secondary-btn" onclick="closeModal('debt-resolution-modal'); showBuyIn();">
                            BUY IN
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        // Update debt amount in existing modal
        const debtAmountEl = modal.querySelector('.debt-info div');
        if (debtAmountEl) {
            debtAmountEl.innerHTML = formatCurrency(debtAmount);
        }
    }
    
    showModal('debt-resolution-modal');
}

function watchAdForDebtClear() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Set flag to track this is for debt clearing
    window.adPurpose = 'debt_clear';
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const iframe = document.getElementById('ad-video');
    if (!iframe) {
        console.error('Ad video iframe not found');
        showNotification('Ad system error. Please try again.', 'error');
        return;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl, purpose: 'debt_clear' });
    
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
    }
    
    let timeLeft = 32;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft;
    }
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            if (claimBtn) {
                claimBtn.classList.remove('hidden');
            }
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl, purpose: 'debt_clear' });
        }
    }, 1000);
}

// REPLACE the showBettingTab function with this improved version:
function showBettingTab(type) {
    const content = document.getElementById('betting-content');
    
    if (type === 'pool') {
        content.innerHTML = createPoolBettingUI();
        // Load odds after UI is created
        setTimeout(() => loadPoolOdds(window.currentEventId), 500);
    } else {
        content.innerHTML = create1v1BettingUI();
    }
    
    // Update tab buttons
    document.querySelectorAll('.betting-tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Find the clicked button and mark it active
    const clickedBtn = Array.from(document.querySelectorAll('.betting-tabs .tab-btn'))
        .find(btn => btn.onclick.toString().includes(type));
    if (clickedBtn) {
        clickedBtn.classList.add('active');
    }
}

function createPoolBettingUI() {
    const currentEvent = events.find(e => e.id === window.currentEventId);
    if (!currentEvent || !currentEvent.options) {
        return '<div class="pool-betting">Event options not available</div>';
    }
    
    return `
        <div class="pool-betting">
            <div class="betting-options" id="betting-options">
                ${currentEvent.options.map((option, index) => `
                    <div class="option-card" onclick="selectBettingOption('${option}', ${index})">
                        <h4>${option}</h4>
                        <div class="odds" id="odds-${index}">Loading...</div>
                        <div class="bet-count" id="bets-${index}">0 bets</div>
                        <div class="pool-amount" id="pool-${index}">â‚¹0</div>
                    </div>
                `).join('')}
            </div>
            <div class="bet-input">
                <div class="selected-option" id="selected-option">Select an option first</div>
                <input type="number" id="bet-amount" placeholder="Bet amount" min="1">
                <button class="primary-btn" onclick="confirmPoolBet()">PLACE BET</button>
            </div>
        </div>
    `;
}

function create1v1BettingUI() {
    return `
        <div class="1v1-betting">
            <div class="betting-tabs-sub">
                <button class="tab-btn active" onclick="show1v1Tab('wager')">Wager Ladder</button>
                <button class="tab-btn" onclick="show1v1Tab('contract')">Contract Ladder</button>
            </div>
            <div class="price-ladder" id="price-ladder">
                ${createPriceLadder()}
            </div>
        </div>
    `;
}

// ADD THIS ENTIRE FUNCTION - it's missing from your current code
async function placeBet(option, type, amount = null) {
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    const betAmount = amount || parseInt(document.getElementById('bet-amount')?.value);
    if (!betAmount || betAmount <= 0) {
        showNotification('Enter valid bet amount', 'error');
        return;
    }
    
    if (betAmount > currentUser.balance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        // Get current event (you'll need to pass eventId to this function)
        const currentEventId = window.currentEventId; // You'll need to set this when opening event modal
        
        // Deduct from user balance
        currentUser.balance -= betAmount;
        
        // Update user in Firebase
        await db.collection('users').doc(currentUser.id).update({
            balance: currentUser.balance,
            totalBets: (currentUser.totalBets || 0) + 1
        });
        
        // Create bet record
        await db.collection('bets').add({
            userId: currentUser.id,
            eventId: currentEventId,
            option: option,
            amount: betAmount,
            type: type,
            timestamp: firebase.firestore.Timestamp.now(),
            status: 'placed'
        });
        
        // Update event pot
        const eventRef = db.collection('events').doc(currentEventId);
        const eventDoc = await eventRef.get();
        const currentPot = eventDoc.data().totalPot || 0;
        const currentBets = eventDoc.data().totalBets || 0;
        
        await eventRef.update({
            totalPot: currentPot + betAmount,
            totalBets: currentBets + 1
        });
        
        updateBalance();
        closeModal('event-modal');
        showNotification(`Bet placed: ${formatCurrency(betAmount, currentUser.currency)} on ${option}`, 'success');
        
        // ADD THIS LOGGING CALL
        logActivity('bet_placed', { 
            userId: currentUser.id, 
            eventId: currentEventId,
            amount: betAmount,
            option: option,
            type: type,
            newBalance: currentUser.balance 
        });
        
    } catch (error) {
        console.error('Error placing bet:', error);
        showNotification('Failed to place bet', 'error');
    }
}

function createPriceLadder() {
    return `
        <div class="ladder-header">
            <span>Wager</span>
            <span>Back Team A</span>
            <span>Back Team B</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(100, 'team_a')">
            <span>â‚¹100</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(200, 'team_a')">
            <span>â‚¹200</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
        <div class="ladder-row" onclick="placeLadderBet(500, 'team_a')">
            <span>â‚¹500</span>
            <span class="back-btn">2.0</span>
            <span class="lay-btn">2.0</span>
        </div>
    `;
}

let selectedBettingOption = null;
let selectedOptionIndex = null;

function selectBettingOption(option, index) {
    selectedBettingOption = option;
    selectedOptionIndex = index;
    
    // Update UI
    document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
    document.querySelectorAll('.option-card')[index].classList.add('selected');
    document.getElementById('selected-option').textContent = `Selected: ${option}`;
}

// REPLACE the confirmPoolBet function with this version that includes proper status:
async function confirmPoolBet() {
    console.log('Selected option:', selectedBettingOption, 'Index:', selectedOptionIndex);
    
    if (!currentUser) {
        showNotification('Please login to bet', 'error');
        return;
    }
    
    if (checkUserDebt()) {
        showAmberNotification('Clear your debt first!');
        setTimeout(() => {
            showWallet();
        }, 1000);
        return;
    }
    
    if (!selectedBettingOption) {
        showNotification('Please select a betting option first', 'error');
        return;
    }
    
    const betAmount = parseInt(document.getElementById('bet-amount').value);
    if (!betAmount || betAmount <= 0) {
        showNotification('Enter valid bet amount', 'error');
        return;
    }
    
    const walletBalance = currentUser.balance - currentUser.debt;
    if (betAmount > walletBalance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    try {
        showBuffering();
        
        const eventId = window.currentEventId;
        const currentEvent = events.find(e => e.id === eventId);
        
        if (!currentEvent) {
            showNotification('Event not found', 'error');
            hideBuffering();
            return;
        }
        
        // Get current odds that user sees (these will be locked in)
        const currentOddsElement = document.getElementById(`odds-${selectedOptionIndex}`);
        if (!currentOddsElement) {
            showNotification('Error getting odds. Please try again.', 'error');
            hideBuffering();
            return;
        }
        
        const lockedOdds = parseFloat(currentOddsElement.textContent);
        if (isNaN(lockedOdds) || lockedOdds <= 0) {
            showNotification('Invalid odds. Please try again.', 'error');
            hideBuffering();
            return;
        }
        
        const potentialWinning = Math.floor(betAmount * lockedOdds);
        
        // INSTANT LOCAL UPDATE - Update UI immediately before Firebase
        currentUser.balance -= betAmount;
        currentUser.totalBets = (currentUser.totalBets || 0) + 1;
        updateBalance();
        updateEVCWalletBalance();
        
        // Update local event data immediately
        if (!currentEvent.totalPot) currentEvent.totalPot = 0;
        if (!currentEvent.totalBets) currentEvent.totalBets = 0;
        currentEvent.totalPot += betAmount;
        currentEvent.totalBets += 1;
        
        // Update local odds calculation immediately
        const updatedOdds = calculateInstantOdds(currentEvent, selectedBettingOption, betAmount);
        currentEvent.currentOdds = updatedOdds;
        
        // Update UI instantly
        updateInstantOddsDisplay(eventId, updatedOdds, selectedBettingOption, betAmount);
        displayEvents(); // Refresh event bars immediately
        
        // Close modal and show success immediately
        closeModal('event-modal');
        showNotification(
            `Bet placed: ${formatCurrency(betAmount)} on ${selectedBettingOption}. Locked odds: ${lockedOdds}. Potential win: ${formatCurrency(potentialWinning)}`,
            'success'
        );
        hideBuffering();
        
        // Now do Firebase transaction in background (don't await)
        db.runTransaction(async (transaction) => {
            // Get current pool state
            const poolRef = db.collection('betting_pools').doc(eventId);
            const poolDoc = await transaction.get(poolRef);
            
            let poolData;
            if (!poolDoc.exists) {
                poolData = {
                    eventId: eventId,
                    eventTitle: currentEvent.title,
                    eventStartTime: currentEvent.startTime,
                    eventOptions: currentEvent.options,
                    totalPool: 0,
                    totalBets: 0,
                    totalWagered: 0,
                    optionPools: {},
                    optionBetCounts: {},
                    vigPercentage: currentEvent.vigPercentage || 5,
                    status: 'active',
                    createdAt: firebase.firestore.Timestamp.now()
                };
                
                if (currentEvent.options && Array.isArray(currentEvent.options)) {
                    currentEvent.options.forEach((option) => {
                        poolData.optionPools[option] = 100;
                        poolData.optionBetCounts[option] = 0;
                    });
                }
            } else {
                poolData = poolDoc.data();
                if (!poolData.optionPools) poolData.optionPools = {};
                if (!poolData.optionBetCounts) poolData.optionBetCounts = {};
                if (!poolData.totalWagered) poolData.totalWagered = poolData.totalPool || 0;
            }
            
            // Create betting slip
            const bettingSlip = {
                userId: currentUser.id,
                userNickname: currentUser.nickname,
                userDisplayName: currentUser.displayName,
                eventId: eventId,
                eventTitle: currentEvent.title,
                eventStartTime: currentEvent.startTime,
                selectedOption: selectedBettingOption,
                betAmount: betAmount,
                currency: 'INR',
                timestamp: firebase.firestore.Timestamp.now(),
                status: 'placed',
                betType: 'pool',
                odds: lockedOdds,
                potentialWinning: potentialWinning
            };
            
            // Update pool with new bet
            poolData.totalPool += betAmount;
            poolData.totalBets += 1;
            poolData.totalWagered += betAmount;
            
            if (!poolData.optionPools[selectedBettingOption]) {
                poolData.optionPools[selectedBettingOption] = 100;
            }
            if (!poolData.optionBetCounts[selectedBettingOption]) {
                poolData.optionBetCounts[selectedBettingOption] = 0;
            }
            
            poolData.optionPools[selectedBettingOption] += betAmount;
            poolData.optionBetCounts[selectedBettingOption] += 1;
            
            // Update user balance
            const userRef = db.collection('users').doc(currentUser.id);
            transaction.update(userRef, {
                balance: currentUser.balance,
                totalBets: currentUser.totalBets
            });
            
            // Save pool data
            transaction.set(poolRef, poolData);
            
            // Save betting slip
            const slipRef = db.collection('betting_slips').doc();
            transaction.set(slipRef, bettingSlip);
            
            // Update event total pot
            const eventRef = db.collection('events').doc(eventId);
            transaction.update(eventRef, {
                totalPot: poolData.totalPool,
                totalBets: poolData.totalBets,
                currentOdds: updatedOdds,
                updatedAt: firebase.firestore.Timestamp.now()
            });
            
            return bettingSlip;
        }).then((result) => {
            console.log('Firebase transaction completed successfully');
            
            // Log activity
            logActivity('bet_placed', {
                userId: currentUser.id,
                eventId: eventId,
                amount: betAmount,
                option: selectedBettingOption,
                lockedOdds: lockedOdds,
                potentialWinning: potentialWinning,
                status: 'placed'
            });
        }).catch((error) => {
            console.error('Firebase transaction failed:', error);
            // Revert local changes if Firebase fails
            currentUser.balance += betAmount;
            currentUser.totalBets -= 1;
            currentEvent.totalPot -= betAmount;
            currentEvent.totalBets -= 1;
            updateBalance();
            updateEVCWalletBalance();
            showNotification('Transaction failed, bet cancelled', 'error');
        });
        
    } catch (error) {
        console.error('Error placing bet:', error);
        showNotification('Failed to place bet', 'error');
        hideBuffering();
    }
}

// Calculate odds instantly for immediate UI update
function calculateInstantOdds(event, betOption, betAmount) {
    const currentOdds = event.currentOdds || event.initialOdds || {};
    const updatedOdds = { ...currentOdds };
    
    // Simple instant calculation - more sophisticated than actual parimutuel
    // but good enough for instant feedback
    const totalPot = event.totalPot + betAmount;
    const vigPercentage = event.vigPercentage || 5;
    
    if (totalPot > 0) {
        event.options.forEach(option => {
            if (option === betOption) {
                // Option that was bet on gets slightly lower odds
                const currentOdd = updatedOdds[option] || 2.0;
                updatedOdds[option] = Math.max(1.01, currentOdd * 0.95);
            } else {
                // Other options get slightly higher odds
                const currentOdd = updatedOdds[option] || 2.0;
                updatedOdds[option] = Math.min(10.0, currentOdd * 1.02);
            }
        });
    }
    
    return updatedOdds;
}

// Update odds display instantly without waiting for Firebase
function updateInstantOddsDisplay(eventId, newOdds, betOption, betAmount) {
    // Update betting modal odds if it's open
    const currentEvent = events.find(e => e.id === eventId);
    if (currentEvent && currentEvent.options) {
        currentEvent.options.forEach((option, index) => {
            const oddsEl = document.getElementById(`odds-${index}`);
            const betsEl = document.getElementById(`bets-${index}`);
            const poolEl = document.getElementById(`pool-${index}`);
            
            if (oddsEl && newOdds[option]) {
                oddsEl.textContent = newOdds[option].toFixed(2);
            }
            
            if (option === betOption) {
                if (betsEl) {
                    const currentBets = parseInt(betsEl.textContent) || 0;
                    betsEl.textContent = `${currentBets + 1} bets`;
                }
                if (poolEl) {
                    const currentPool = parseInt(poolEl.textContent.replace(/[^\d]/g, '')) || 0;
                    poolEl.textContent = `₹${currentPool + betAmount}`;
                }
            }
        });
    }
}

async function loadPoolOdds(eventId) {
    try {
        const poolDoc = await db.collection('betting_pools').doc(eventId).get();
        const currentEvent = events.find(e => e.id === eventId);
        
        if (!currentEvent || !currentEvent.options) {
            console.error('Event or options not found');
            return;
        }

        let poolData;
        let calculatedOdds = {};
        
        if (!poolDoc.exists) {
            // No bets placed yet - use initial odds
            currentEvent.options.forEach((option, index) => {
                const initialOdds = currentEvent.initialOdds && currentEvent.initialOdds[option] 
                    ? currentEvent.initialOdds[option] 
                    : 2.0;
                
                calculatedOdds[option] = initialOdds;
                
                const oddsEl = document.getElementById(`odds-${index}`);
                const betsEl = document.getElementById(`bets-${index}`);
                const poolEl = document.getElementById(`pool-${index}`);
                
                // Set odds directly without indicator (initial load)
                if (oddsEl) oddsEl.textContent = initialOdds.toFixed(2);
                if (betsEl) betsEl.textContent = '0 bets';
                if (poolEl) poolEl.textContent = '₹0';
            });
        } else {
            poolData = poolDoc.data();
            
            // Safety checks
            if (!poolData.optionPools) poolData.optionPools = {};
            if (!poolData.optionBetCounts) poolData.optionBetCounts = {};
            
            const totalWagered = poolData.totalWagered || poolData.totalPool || 0;
            const vigPercentage = poolData.vigPercentage || 5;
            
            // TRUE PARIMUTUEL CALCULATION
            if (totalWagered > 0) {
                // Step 1: Calculate net pool after vig deduction
                const vigAmount = totalWagered * (vigPercentage / 100);
                const netPool = totalWagered - vigAmount;
                
                // Step 2: Calculate true parimutuel odds for each option
                currentEvent.options.forEach((option, index) => {
                    const optionPool = poolData.optionPools[option] || 100;
                    const betCount = poolData.optionBetCounts[option] || 0;
                    
                    let odds;
                    
                    if (optionPool > 100) {
                        const actualBetAmount = optionPool - 100;
                        if (actualBetAmount > 0) {
                            const payout = netPool / actualBetAmount;
                            odds = Math.max(1.01, payout);
                        } else {
                            odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
                        }
                    } else {
                        odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
                    }
                    
                    calculatedOdds[option] = odds;
                    const poolAmount = Math.max(0, optionPool);
                    
                    const oddsEl = document.getElementById(`odds-${index}`);
                    const betsEl = document.getElementById(`bets-${index}`);
                    const poolEl = document.getElementById(`pool-${index}`);
                    
                    // Set odds directly without indicator (initial load)
                    if (oddsEl) oddsEl.textContent = odds.toFixed(2);
                    if (betsEl) betsEl.textContent = `${betCount} bets`;
                    if (poolEl) poolEl.textContent = `₹${poolAmount}`;
                });
            } else {
                // Fallback to initial odds
                currentEvent.options.forEach((option, index) => {
                    const initialOdds = currentEvent.initialOdds && currentEvent.initialOdds[option] 
                        ? currentEvent.initialOdds[option] 
                        : 2.0;
                    calculatedOdds[option] = initialOdds;
                    
                    const oddsEl = document.getElementById(`odds-${index}`);
                    const betsEl = document.getElementById(`bets-${index}`);
                    const poolEl = document.getElementById(`pool-${index}`);
                    
                    // Set odds directly without indicator (initial load)
                    if (oddsEl) oddsEl.textContent = initialOdds.toFixed(2);
                    if (betsEl) betsEl.textContent = '0 bets';
                    if (poolEl) poolEl.textContent = '₹0';
                });
            }
        }
        
        // CRITICAL: Update currentOdds in Firebase
        await db.collection('events').doc(eventId).update({
            currentOdds: calculatedOdds,
            updatedAt: firebase.firestore.Timestamp.now()
        });
        
        // Update local events array
        const eventIndex = events.findIndex(e => e.id === eventId);
        if (eventIndex !== -1) {
            events[eventIndex].currentOdds = calculatedOdds;
        }
        
    } catch (error) {
        console.error('Error loading pool odds:', error);
    }
}

// Real-time odds listener instead of polling
let oddsListener = null;

function startOddsPolling(eventId) {
    // Stop any existing polling
    stopOddsPolling();
    
    // Flag to ignore the first update (initial load)
    let isFirstUpdate = true;
    
    // Set up real-time listener for the betting pool
    const poolRef = db.collection('betting_pools').doc(eventId);
    
    oddsListener = poolRef.onSnapshot((doc) => {
        if (doc.exists) {
            const poolData = doc.data();
            
            if (isFirstUpdate) {
                // Skip the first update to avoid fake change indicators
                isFirstUpdate = false;
                return;
            }
            
            // Update betting modal odds directly (only on real changes)
            updateBettingModalOdds(eventId, poolData);
        }
    }, (error) => {
        console.error('Error listening to pool updates:', error);
        // Fallback to polling if real-time fails
        fallbackToPolling(eventId);
    });
    
    // Also listen to event updates for currentOdds (for betting modal)
    const eventRef = db.collection('events').doc(eventId);
    const eventListener = eventRef.onSnapshot((doc) => {
        if (doc.exists) {
            const eventData = doc.data();
            if (eventData.currentOdds && !isFirstUpdate) {
                updateBettingModalOddsFromEventDirect(eventId, eventData.currentOdds);
            }
        }
    });
    
    // Store both listeners for cleanup
    window.currentEventListener = eventListener;
}

function updateBettingModalOddsFromEventDirect(eventId, newOdds) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    // Get the CURRENT odds from the DOM to compare against
    const currentDOMOdds = {};
    currentEvent.options.forEach((option, index) => {
        const oddsEl = document.getElementById(`odds-${index}`);
        if (oddsEl) {
            // Parse only the number, ignore any arrow symbols
            const oddsText = oddsEl.textContent.replace(/[▲▼\s]/g, '');
            currentDOMOdds[option] = parseFloat(oddsText) || 0;
        }
    });
    
    currentEvent.options.forEach((option, index) => {
        if (newOdds[option]) {
            const oddsEl = document.getElementById(`odds-${index}`);
            if (oddsEl) {
                const currentDOMValue = currentDOMOdds[option];
                // Only show indicator if odds actually changed from what's currently displayed
                if (Math.abs(currentDOMValue - newOdds[option]) > 0.01) {
                    updateBettingModalOddsWithIndicator(oddsEl, currentDOMValue, newOdds[option]);
                } else {
                    // Just update the text without indicator
                    oddsEl.textContent = newOdds[option].toFixed(2);
                }
            }
        }
    });
    
    // Update local event data
    currentEvent.currentOdds = newOdds;
}

function updateBettingModalOdds(eventId, poolData) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    const totalWagered = poolData.totalWagered || poolData.totalPool || 0;
    const vigPercentage = poolData.vigPercentage || 5;
    
    let calculatedOdds = {};
    
    if (totalWagered > 0) {
        const vigAmount = totalWagered * (vigPercentage / 100);
        const netPool = totalWagered - vigAmount;
        
        currentEvent.options.forEach((option, index) => {
            const optionPool = poolData.optionPools[option] || 100;
            const betCount = poolData.optionBetCounts[option] || 0;
            
            let odds;
            if (optionPool > 100) {
                const actualBetAmount = optionPool - 100;
                if (actualBetAmount > 0) {
                    const payout = netPool / actualBetAmount;
                    odds = Math.max(1.01, payout);
                } else {
                    odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
                }
            } else {
                odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
            }
            
            calculatedOdds[option] = odds;
            
            // Update betting modal UI elements if they exist
            const oddsEl = document.getElementById(`odds-${index}`);
            const betsEl = document.getElementById(`bets-${index}`);
            const poolEl = document.getElementById(`pool-${index}`);
            
            if (oddsEl) {
                const oldOdds = parseFloat(oddsEl.textContent) || 0;
                // Only show indicator if odds actually changed significantly
                if (Math.abs(oldOdds - odds) > 0.01) {
                    updateOddsWithIndicator(oddsEl, oldOdds, odds);
                } else {
                    // Just update the text without indicator
                    oddsEl.textContent = odds.toFixed(2);
                }
            }
            if (betsEl) betsEl.textContent = `${betCount} bets`;
            if (poolEl) poolEl.textContent = `₹${Math.max(0, optionPool)}`;
        });
    }
    
    // Update local event data (but don't trigger event bar updates from here)
    currentEvent.currentOdds = calculatedOdds;
    currentEvent.totalPot = poolData.totalPool || 0;
    currentEvent.totalBets = poolData.totalBets || 0;
}

// Function to update bet counts in the betting modal
async function updateBetCounts(eventId) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    try {
        const betsQuery = await db.collection('betting_slips')
            .where('eventId', '==', eventId)
            .get();
        
        let team1Bets = 0;
        let team2Bets = 0;
        
        betsQuery.docs.forEach(doc => {
            const betData = doc.data();
            if (betData.selectedOption === currentEvent.options[0]) {
                team1Bets++;
            } else if (betData.selectedOption === currentEvent.options[1]) {
                team2Bets++;
            }
        });
        
        // Update the UI elements
        const team1BetsEl = document.querySelector('.team-option:first-child .team-option-bets');
        const team2BetsEl = document.querySelector('.team-option:last-child .team-option-bets');
        
        if (team1BetsEl) team1BetsEl.textContent = `${team1Bets} bets`;
        if (team2BetsEl) team2BetsEl.textContent = `${team2Bets} bets`;
        
    } catch (error) {
        console.error('Error updating bet counts:', error);
    }
}

function updateBettingModalOddsFromEvent(eventId, newOdds) {
    updateBettingModalOddsFromEventDirect(eventId, newOdds);
}

function stopOddsPolling() {
    if (oddsListener) {
        oddsListener();
        oddsListener = null;
    }
    
    if (window.currentEventListener) {
        window.currentEventListener();
        window.currentEventListener = null;
    }
    
    if (window.teamOptionsListener) {
        window.teamOptionsListener();
        window.teamOptionsListener = null;
    }
    
    // Clear old polling interval if exists
    if (window.oddsPollingInterval) {
        clearInterval(window.oddsPollingInterval);
        window.oddsPollingInterval = null;
    }
}

function fallbackToPolling(eventId) {
    console.log('Falling back to polling for odds updates');
    if (window.oddsPollingInterval) {
        clearInterval(window.oddsPollingInterval);
    }
    window.oddsPollingInterval = setInterval(() => {
        loadPoolOdds(eventId);
    }, 2000); // Faster polling as fallback
}


function updateOddsFromPoolData(eventId, poolData) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    const totalWagered = poolData.totalWagered || poolData.totalPool || 0;
    const vigPercentage = poolData.vigPercentage || 5;
    
    let calculatedOdds = {};
    
    if (totalWagered > 0) {
        const vigAmount = totalWagered * (vigPercentage / 100);
        const netPool = totalWagered - vigAmount;
        
        currentEvent.options.forEach((option, index) => {
            const optionPool = poolData.optionPools[option] || 100;
            const betCount = poolData.optionBetCounts[option] || 0;
            
            let odds;
            if (optionPool > 100) {
                const actualBetAmount = optionPool - 100;
                if (actualBetAmount > 0) {
                    const payout = netPool / actualBetAmount;
                    odds = Math.max(1.01, payout);
                } else {
                    odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
                }
            } else {
                odds = currentEvent.initialOdds && currentEvent.initialOdds[option] ? currentEvent.initialOdds[option] : 2.0;
            }
            
            calculatedOdds[option] = odds;
        });
    }
    
    // Store old odds before updating
    const oldOdds = currentEvent.currentOdds || {};
    
    // Update local event data
    currentEvent.currentOdds = calculatedOdds;
    currentEvent.totalPot = poolData.totalPool || 0;
    currentEvent.totalBets = poolData.totalBets || 0;
    
    // ONLY update event bars in real-time (not betting modal from here)
    updateEventBarsRealTime(eventId, oldOdds, calculatedOdds);
}

function updateOddsWithIndicator(oddsElement, oldOdds, newOdds) {
    if (!oddsElement) return;
    
    // Remove any existing indicators
    const existingIndicator = oddsElement.querySelector('.odds-change-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Check if this is for the right team
    const isRightTeam = oddsElement.closest('.team-info-right');
    
    // Create the content with indicator in correct position
    if (oldOdds && oldOdds !== newOdds && Math.abs(oldOdds - newOdds) > 0.001) {
        const indicator = document.createElement('span');
        indicator.className = 'odds-change-indicator';
        
        if (newOdds > oldOdds) {
            indicator.innerHTML = '▲';
            indicator.classList.add('odds-increase');
        } else {
            indicator.innerHTML = '▼';
            indicator.classList.add('odds-decrease');
        }
        
        if (isRightTeam) {
            // For right team: indicator first, then odds
            oddsElement.innerHTML = '';
            oddsElement.appendChild(indicator);
            oddsElement.appendChild(document.createTextNode(' ' + newOdds.toFixed(2)));
        } else {
            // For left team: odds first, then indicator
            oddsElement.textContent = newOdds.toFixed(2) + ' ';
            oddsElement.appendChild(indicator);
        }
        
        // Fade out indicator after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.classList.add('fade-out');
                setTimeout(() => {
                    if (indicator.parentNode) {
                        // Replace with just the odds text
                        oddsElement.textContent = newOdds.toFixed(2);
                    }
                }, 300);
            }
        }, 3000);
    } else {
        // No change or first load - just show odds
        oddsElement.textContent = newOdds.toFixed(2);
    }
}

function updateBettingModalOddsWithIndicator(oddsElement, oldOdds, newOdds) {
    if (!oddsElement) return;
    
    // Remove any existing indicators
    const existingIndicator = oddsElement.querySelector('.odds-change-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Always set the odds text first (this keeps the element size consistent)
    oddsElement.textContent = newOdds.toFixed(2);
    
    // Add indicator if odds changed, but position it absolutely so it doesn't affect layout
    if (oldOdds && oldOdds !== newOdds && Math.abs(oldOdds - newOdds) > 0.001) {
        const indicator = document.createElement('span');
        indicator.className = 'odds-change-indicator betting-modal-indicator';
        
        if (newOdds > oldOdds) {
            indicator.innerHTML = '▲';
            indicator.classList.add('odds-increase');
        } else {
            indicator.innerHTML = '▼';
            indicator.classList.add('odds-decrease');
        }
        
        oddsElement.appendChild(indicator);
        
        // Fade out indicator after 3 seconds
        setTimeout(() => {
            if (indicator.parentNode) {
                indicator.classList.add('fade-out');
                setTimeout(() => {
                    if (indicator.parentNode) {
                        indicator.remove();
                    }
                }, 300);
            }
        }, 3000);
    }
}

function updateOddsDisplay(eventId, newOdds) {
    const currentEvent = events.find(e => e.id === eventId);
    if (!currentEvent || !currentEvent.options) return;
    
    // Store old odds before updating
    const oldOdds = currentEvent.currentOdds || {};
    
    currentEvent.options.forEach((option, index) => {
        if (newOdds[option]) {
            const oddsEl = document.getElementById(`odds-${index}`);
            if (oddsEl) {
                const oldValue = oldOdds[option] || parseFloat(oddsEl.textContent) || 0;
                updateOddsWithIndicator(oddsEl, oldValue, newOdds[option]);
            }
        }
    });
    
    // Update local event data
    currentEvent.currentOdds = newOdds;
    
    // Update event bars with change indicators
    updateEventBarsRealTime(eventId, oldOdds, newOdds);
}

function updateEventBarsRealTime(eventId = null, oldOdds = {}, newOdds = {}) {
    // Update all event bars with new odds and pot data
    events.forEach(event => {
        // If eventId is specified, only update that event
        if (eventId && event.id !== eventId) return;
        
        const teams = event.options || ['Team A', 'Team B'];
        const currentOdds = event.currentOdds || event.initialOdds || {};
        
        // Get old odds for this specific event
        const eventOldOdds = eventId === event.id ? oldOdds : {};
        const eventNewOdds = eventId === event.id ? newOdds : currentOdds;
        
        // Update odds in event bars
        const team1Odds = eventNewOdds[teams[0]] || currentOdds[teams[0]] || 2.0;
        const team2Odds = eventNewOdds[teams[1]] || currentOdds[teams[1]] || 2.0;
        
        // Find the event bar elements by unique event ID instead of title
        const eventBars = document.querySelectorAll('.event-bar');
        eventBars.forEach(bar => {
            // Use the VS element ID to match the specific event
            const vsPoolEl = bar.querySelector(`#vs-${event.id}`);
            if (vsPoolEl) {
                // This is the correct event bar for this specific event
                const team1OddsEl = bar.querySelector('.team-left .team-odds');
                const team2OddsEl = bar.querySelector('.team-right .team-odds');
                
                if (team1OddsEl) {
                    const oldTeam1Odds = eventOldOdds[teams[0]] || parseFloat(team1OddsEl.textContent) || 0;
                    updateOddsWithIndicator(team1OddsEl, oldTeam1Odds, team1Odds);
                }
                if (team2OddsEl) {
                    const oldTeam2Odds = eventOldOdds[teams[1]] || parseFloat(team2OddsEl.textContent) || 0;
                    updateOddsWithIndicator(team2OddsEl, oldTeam2Odds, team2Odds);
                }
                
                // Update VS/Pool display
                if (vsPoolEl.classList.contains('pool-text')) {
                    vsPoolEl.innerHTML = `Pool ${formatCurrency(event.totalPot || 0)}`;
                }
            }
        });
    });
}

function startGlobalRealTimeListeners() {
    // Listen to all active events for real-time updates
    const eventsRef = db.collection('events')
        .where('status', '==', 'active')
        .where('display_status', '==', 'visible');
    
    window.globalEventsListener = eventsRef.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const eventData = { id: change.doc.id, ...change.doc.data() };
                
                // Update local events array
                const eventIndex = events.findIndex(e => e.id === eventData.id);
                if (eventIndex !== -1) {
                    const oldEventData = events[eventIndex];
                    const oldOdds = oldEventData.currentOdds || {};
                    const newOdds = eventData.currentOdds || {};
                    
                    // Only update if odds actually changed to prevent double updates
                    const oddsChanged = JSON.stringify(oldOdds) !== JSON.stringify(newOdds);
                    
                    events[eventIndex] = eventData;
                    
                    if (oddsChanged) {
                        // Update event bars with change indicators
                        updateEventBarsRealTime(eventData.id, oldOdds, newOdds);
                        
                        // Update betting modal ONLY if this event is currently open
                        if (window.currentEventId === eventData.id) {
                            updateBettingModalOddsFromEvent(eventData.id, newOdds);
                        }
                    }
                }
            }
        });
    }, (error) => {
        console.error('Error listening to global events:', error);
    });
    
    // Listen to betting pools for real-time pool updates (for event bars only)
    const poolsRef = db.collection('betting_pools').where('status', '==', 'active');
    
    window.globalPoolsListener = poolsRef.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const poolData = change.doc.data();
                const eventId = change.doc.id;
                
                // Skip if this is the event currently being viewed in betting modal
                // (betting modal has its own dedicated listener)
                if (window.currentEventId !== eventId) {
                    updateOddsFromPoolData(eventId, poolData);
                }
            }
        });
    }, (error) => {
        console.error('Error listening to global pools:', error);
    });
}

function stopGlobalRealTimeListeners() {
    if (window.globalEventsListener) {
        window.globalEventsListener();
        window.globalEventsListener = null;
    }
    
    if (window.globalPoolsListener) {
        window.globalPoolsListener();
        window.globalPoolsListener = null;
    }
}


function showVFRModal(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    let modal = document.getElementById('vfr-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'vfr-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('vfr-modal')">&times;</span>
                <h2>VOTE FOR RESULT</h2>
                <p>Which option won?</p>
                <div id="vfr-options"></div>
                <button id="submit-vfr" class="primary-btn" onclick="submitVFR()">SUBMIT VOTE</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    const optionsHtml = event.options.map((option, index) => `
        <label class="vfr-option">
            <input type="radio" name="vfr-choice" value="${option}">
            <span>${option}</span>
        </label>
    `).join('');
    
    document.getElementById('vfr-options').innerHTML = optionsHtml;
    window.currentVFREventId = eventId;
    showModal('vfr-modal');
}

// REPLACE the submitVFR function with this improved version:
async function submitVFR() {
    const selectedOption = document.querySelector('input[name="vfr-choice"]:checked');
    if (!selectedOption) {
        showNotification('Please select a result', 'error');
        return;
    }
    
    try {
        // Check if user already voted
        const existingVote = await db.collection('event_votes')
            .where('userId', '==', currentUser.id)
            .where('eventId', '==', window.currentVFREventId)
            .get();
            
        if (!existingVote.empty) {
            showNotification('You have already voted for this event', 'warning');
            return;
        }
        
        // Submit vote (this will auto-create the collection if it doesn't exist)
        await db.collection('event_votes').add({
            userId: currentUser.id,
            userNickname: currentUser.nickname,
            eventId: window.currentVFREventId, // Just store the event document ID
            selectedWinner: selectedOption.value,
            timestamp: firebase.firestore.Timestamp.now(),
            userHadBet: await userHadBetOnEvent(window.currentVFREventId)
        });
        
        closeModal('vfr-modal');
        showNotification('Vote submitted successfully!', 'success');
        
    } catch (error) {
        console.error('Error submitting VFR:', error);
        showNotification('Failed to submit vote', 'error');
    }
}

async function settleEvent(eventId, winningOption) {
    try {
        const settlement = await db.runTransaction(async (transaction) => {
            // Get pool data
            const poolRef = db.collection('betting_pools').doc(eventId);
            const poolDoc = await transaction.get(poolRef);
            
            if (!poolDoc.exists) {
                throw new Error('Pool not found');
            }
            
            const poolData = poolDoc.data();
            const totalPot = poolData.totalPool || 0;
            const vigPercentage = poolData.vigPercentage || 5;
            
            // Get all bets for this event
            const allBetsQuery = await db.collection('betting_slips')
                .where('eventId', '==', eventId)
                .where('status', '==', 'placed')
                .get();
            
            let winnersWin = 0;
            let losersLose = 0;
            const winnerUpdates = [];
            
            // Process all bets
            for (const betDoc of allBetsQuery.docs) {
                const bet = betDoc.data();
                
                if (bet.selectedOption === winningOption) {
                    // Winner - calculate payout using their locked odds
                    const winAmount = Math.floor(bet.betAmount * bet.odds);
                    winnersWin += winAmount;
                    
                    // Update betting slip
                    transaction.update(betDoc.ref, {
                        status: 'placed & won',
                        actualWinning: winAmount,
                        settledAt: firebase.firestore.Timestamp.now()
                    });
                    
                    // Update user balance
                    const userRef = db.collection('users').doc(bet.userId);
                    const userDoc = await transaction.get(userRef);
                    const currentBalance = userDoc.data().balance || 0;
                    const currentWinnings = userDoc.data().totalWinnings || 0;
                    
                    transaction.update(userRef, {
                        balance: currentBalance + winAmount,
                        totalWinnings: currentWinnings + winAmount
                    });
                    
                    winnerUpdates.push({
                        userId: bet.userId,
                        winAmount: winAmount
                    });
                } else {
                    // Loser
                    losersLose += bet.betAmount;
                    
                    // Update betting slip
                    transaction.update(betDoc.ref, {
                        status: 'placed & lost',
                        settledAt: firebase.firestore.Timestamp.now()
                    });
                }
            }
            
            // Calculate actual vig
            const myVig = totalPot - winnersWin;
            
            // Create settlement record
            const settlementData = {
                eventId: eventId,
                eventTitle: poolData.eventTitle,
                winner: winningOption,
                totalPot: totalPot,
                winnersWin: winnersWin,
                losersLose: losersLose,
                myVig: myVig,
                vigPercentage: vigPercentage,
                totalBetsSettled: allBetsQuery.docs.length,
                settledAt: firebase.firestore.Timestamp.now()
            };
            
            const settlementRef = db.collection('event_settlements').doc(eventId);
            transaction.set(settlementRef, settlementData);
            
            // Update event status
            const eventRef = db.collection('events').doc(eventId);
            transaction.update(eventRef, {
                status: 'settled',
                winner: winningOption,
                settledAt: firebase.firestore.Timestamp.now()
            });
            
            return settlementData;
        });
        
        console.log('Event settled:', settlement);
        return settlement;
        
    } catch (error) {
        console.error('Error settling event:', error);
        throw error;
    }
}

// Function to check if bookmaking algorithm is working correctly
function validateBookmakingProfit(totalPot, winnersWin, vigPercentage) {
    const actualVig = totalPot - winnersWin;
    const expectedMinimumVig = totalPot * (vigPercentage / 100);
    
    const isHealthy = actualVig >= expectedMinimumVig;
    const actualVigPercentage = totalPot > 0 ? (actualVig / totalPot) * 100 : 0;
    
    return {
        isHealthy: isHealthy,
        actualVig: actualVig,
        expectedMinimumVig: expectedMinimumVig,
        actualVigPercentage: actualVigPercentage,
        difference: actualVig - expectedMinimumVig
    };
}


// Calculate fair odds with built-in vig for initial event setup
function calculateInitialOddsWithVig(probabilities, vigPercentage) {
    // probabilities should be an object like {A: 0.5, B: 0.5} totaling 1.0
    const targetOverround = 1 + (vigPercentage / 100); // e.g., 1.05 for 5% vig
    
    const fairOdds = {};
    for (const option in probabilities) {
        // Convert probability to odds with vig built in
        const adjustedProbability = probabilities[option] * targetOverround;
        fairOdds[option] = Math.max(1.01, 1 / adjustedProbability);
    }
    
    return fairOdds;
}

async function userHadBetOnEvent(eventId) {
    try {
        const betsQuery = await db.collection('betting_slips')
            .where('userId', '==', currentUser.id)
            .where('eventId', '==', eventId)
            .get(); // Remove status filter to include all bet statuses
        return !betsQuery.empty;
    } catch (error) {
        console.error('Error checking user bets:', error);
        return false;
    }
}


// EVC Functions
function goToEVC() {
    window.location.href = 'fwd.html';
}

function goHome() {
    window.location.href = 'tqpsut.html';
}

function watchAd() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    const iframe = document.getElementById('ad-video');
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl });
    
    const claimBtn = document.getElementById('claim-reward');
    claimBtn.classList.add('hidden');
    
    let timeLeft = 32;
    document.getElementById('ad-timer').textContent = timeLeft;
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        document.getElementById('ad-timer').textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            claimBtn.classList.remove('hidden');
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl });
        }
    }, 1000);
}


async function claimAdReward() {
    if (!currentUser) return;
    
    const reward = adminSettings.perAdReward;
    const adPurpose = window.adPurpose || 'regular';
    
    try {
        if (adPurpose === 'buyin_reset') {
            // Reset daily buyin limit
            await db.collection('users').doc(currentUser.id).update({
                dailyBuyinUsed: 0,
                lastBuyinReset: firebase.firestore.Timestamp.now()
            });
            
            currentUser.dailyBuyinUsed = 0;
            
            const resetBtn = document.querySelector('.reset-limit-btn');
            if (resetBtn) {
                resetBtn.classList.add('hidden');
                resetBtn.classList.remove('pulsing-attract');
            }
            
            showNotification(`Buy-in limit reset! You can now buy in up to ${formatCurrency(adminSettings.dailyBuyinLimit)}`, 'success');
            
            logActivity('buyin_limit_reset', { 
                userId: currentUser.id, 
                resetAt: new Date(),
                previousLimit: adminSettings.dailyBuyinLimit
            });
            
            setTimeout(() => {
                showBuyIn();
            }, 1500);
            
        } else if (adPurpose === 'debt_clear') {
            // Auto settle debt
            const result = await settleDebtAutomatically(currentUser.id, reward);
            currentUser.balance = result.balance;
            currentUser.debt = result.debt;
            
            updateBalance();
            updateEVCWalletBalance();
            
            showNotification(`Earned ${formatCurrency(reward)}! Keep watching ads to clear more debt.`, 'success');
            
        } else if (adPurpose === 'buyin') {
            // NEW: Process the buy-in after watching ad
            const amount = window.pendingBuyinAmount;
            if (!amount) {
                showNotification('Buy-in amount not found', 'error');
                return;
            }
            
            const result = await settleDebtAutomatically(currentUser.id, amount);
            currentUser.balance = result.balance;
            currentUser.debt = result.debt;
            currentUser.dailyBuyinUsed += amount;
            
            await db.collection('users').doc(currentUser.id).update({
                dailyBuyinUsed: currentUser.dailyBuyinUsed
            });
            
            updateBalance();
            updateEVCWalletBalance();
            
            // Clear pending amount
            window.pendingBuyinAmount = null;
            
            // Show success notification with transaction details
            if (result.debt === 0 && currentUser.debt > 0) {
                const settledDebt = currentUser.debt;
                const remainingAmount = amount - settledDebt;
                showNotification(`Buy-in successful! ${formatCurrency(settledDebt)} debt cleared, ${formatCurrency(remainingAmount)} added to wallet.`, 'success');
            } else if (result.debt > 0) {
                const partialDebt = amount;
                const remainingDebt = result.debt;
                showNotification(`Buy-in successful! ${formatCurrency(partialDebt)} applied to debt. Remaining debt: ${formatCurrency(remainingDebt)}`, 'success');
            } else {
                showNotification(`Buy-in successful! ${formatCurrency(amount)} added to your wallet.`, 'success');
            }
            
            logActivity('buyin', { 
                userId: currentUser.id, 
                amount, 
                method: 'test_after_ad',
                newBalance: currentUser.balance,
                debtSettled: result.debt < (currentUser.debt || 0)
            });
            
        } else {
            // Regular ad reward
            const result = await settleDebtAutomatically(currentUser.id, reward);
            currentUser.balance = result.balance;
            currentUser.debt = result.debt;
            
            updateBalance();
            updateEVCWalletBalance();
            
            showNotification(`Earned ${formatCurrency(reward)}!`, 'success');
        }
        
        // Clean up and close modal
        window.adPurpose = null;
        cleanupAdTimer();
        closeModal('ad-modal');
        
        // Log reward claim
        logActivity('ad_reward_claimed', { 
            userId: currentUser.id, 
            reward: adPurpose === 'buyin' ? window.pendingBuyinAmount || reward : reward,
            purpose: adPurpose,
            newBalance: currentUser.balance,
            debtSettled: currentUser.debt < (currentUser.debt || 0)
        });
        
    } catch (error) {
        console.error('Error claiming ad reward:', error);
        showNotification('Failed to process request', 'error');
    }
}

async function showRecentEarnings() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    try {
        // Load earnings history from activity logs
        const earningsSnapshot = await db.collection('activity_logs')
            .where('data.userId', '==', currentUser.id)
            .where('action', 'in', ['ad_reward_claimed', 'daily_bonus', 'task_completed'])
            .orderBy('timestamp', 'desc')
            .limit(50)
            .get();
        
        let earningsHTML = '<h3>Recent Earnings History</h3><div class="earnings-history">';
        let totalEarnings = 0;
        
        if (earningsSnapshot.empty) {
            earningsHTML += '<p>No earnings yet. Watch ads to start earning!</p>';
        } else {
            earningsSnapshot.docs.forEach(doc => {
                const data = doc.data();
                const timestamp = data.timestamp.toDate().toLocaleString();
                const amount = data.data.reward || data.data.bonus || data.data.amount || 0;
                totalEarnings += amount;
                
                let actionText = '';
                switch(data.action) {
                    case 'ad_reward_claimed': actionText = 'Watched Ad'; break;
                    case 'daily_bonus': actionText = 'Daily Bonus'; break;
                    case 'task_completed': actionText = 'Task Completed'; break;
                    default: actionText = data.action;
                }
                
                earningsHTML += `
                    <div class="earning-item">
                        <div class="earning-action">${actionText}</div>
                        <div class="earning-amount">+${formatCurrency(amount)}</div>
                        <div class="earning-time">${timestamp}</div>
                    </div>
                `;
            });
        }
        
        earningsHTML += `</div><div class="total-earnings">Total Earned: ${formatCurrency(totalEarnings, currentUser.currency)}</div>`;
        
        // Create and show modal
        showEarningsModal(earningsHTML);
        
    } catch (error) {
        console.error('Error loading earnings:', error);
        showNotification('Error loading earnings history', 'error');
    }
}

function showEarningsModal(content) {
    // Create modal if it doesn't exist
    let modal = document.getElementById('earnings-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'earnings-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('earnings-modal')">&times;</span>
                <div id="earnings-content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    document.getElementById('earnings-content').innerHTML = content;
    showModal('earnings-modal');
}

// Profile Functions
function showProfile() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    showModal('profile-modal');
    showTab('balance');
}

// REPLACE the showTab function with this fixed version:
async function showTab(tabName) {
    const content = document.getElementById('tab-content');
    const tabBtns = document.querySelectorAll('.tab-btn');
    
    // Remove active class from all tabs
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // Find and activate the clicked tab
    const clickedTab = Array.from(tabBtns).find(btn => btn.onclick.toString().includes(tabName));
    if (clickedTab) clickedTab.classList.add('active');
    
    // Show loading while content loads
    content.innerHTML = '<div class="loading-content">Loading...</div>';
    
    switch(tabName) {
        case 'balance':
            content.innerHTML = createBalanceTab();
            break;
        case 'history':
            content.innerHTML = createHistoryTab();
            break;
        case 'settings':
            content.innerHTML = createSettingsTab();
            break;
        case 'notifications':
            try {
                const notifs = await loadUserNotifications();
                const html = await createNotificationsTab();
                content.innerHTML = html;
            } catch (error) {
                content.innerHTML = '<div class="error-content">Error loading notifications</div>';
            }
            break;
        case 'complaints':
            content.innerHTML = createComplaintsTab();
            break;
        case 'slips':
            try {
                const slipsHtml = await createSlipsTab();
                content.innerHTML = slipsHtml;
            } catch (error) {
                content.innerHTML = '<div class="error-content">Error loading betting slips</div>';
            }
            break;
    }
}

function createBalanceTab() {
    const walletBalance = currentUser.balance - currentUser.debt;
    const balanceColor = walletBalance < 0 ? '#ffc857' : 'var(--primary-color)';
    const debtDisplay = currentUser.debt > 0 ? 
        `<div class="debt-warning">Debt: ${formatCurrency(currentUser.debt)}</div>` : '';
    
    return `
        <div class="balance-tab">
            <div class="profile-pic-display">
                <img src="${currentUser.profilePic || getRandomProfilePic(currentUser.gender)}" alt="Profile" class="profile-image ${currentUser.gender}">
                <div class="profile-names">
                    <div class="display-name">${currentUser.displayName}</div>
                    <div class="nickname">@${currentUser.nickname}</div>
                </div>
            </div>
            <div class="balance-info">
                <h3>Wallet Balance</h3>
                <div class="balance-amount" style="color: ${balanceColor};">${formatCurrency(walletBalance)}</div>
                ${debtDisplay}
                <div class="rep-score ${currentUser.repScore.toLowerCase()}">
                    Rep Score: ${currentUser.repScore}
                </div>
            </div>
            <div class="balance-stats">
                <div class="stat">
                    <label>Total Winnings:</label>
                    <span>${formatCurrency(currentUser.totalWinnings || 0)}</span>
                </div>
                <div class="stat">
                    <label>Total Bets:</label>
                    <span>${currentUser.totalBets || 0}</span>
                </div>
            </div>
        </div>
    `;
}

function createSettingsTab() {
    return `
        <div class="settings-tab">
            <div class="setting-item">
                <label for="display-name-change">Display Name:</label>
                <input type="text" id="display-name-change" value="${currentUser.displayName}">
                <button onclick="updateDisplayName()">UPDATE</button>
            </div>
            <div class="setting-item">
                <label>Current Profile Picture:</label>
                <img src="${currentUser.profilePic}" alt="Profile" class="current-profile-pic">
                <button onclick="changeProfilePic()">CHANGE PICTURE</button>
            </div>
            <div class="setting-item">
                <label>Login Code Access:</label>
                <button class="sha-reveal-btn" onclick="showMySHA256()">SHOW MY SHA256</button>
                <div id="sha-display" class="sha-display hidden">
                    <input type="text" id="user-sha-code" readonly>
                    <button onclick="copySHAFromSettings()" class="copy-sha-btn">COPY</button>
                </div>
            </div>
            <div class="setting-item">
                <button class="danger-btn" onclick="logout()">LOGOUT</button>
            </div>
        </div>
    `;
}

function changeProfilePic() {
    // Create file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    
    fileInput.onchange = async function() {
        const file = this.files[0];
        if (file) {
            try {
                showBuffering();
                
                const newPic = await handleProfilePicUpload(file, currentUser.gender);
                
                // Update in Firebase
                await db.collection('users').doc(currentUser.id).update({
                    profilePic: newPic
                });
                
                currentUser.profilePic = newPic;
                showNotification('Profile picture updated!', 'success');
                showTab('settings'); // Refresh settings tab
                hideBuffering();
                
            } catch (error) {
                console.error('Error updating profile pic:', error);
                showNotification('Failed to update profile picture', 'error');
                hideBuffering();
            }
        }
    };
    
    document.body.appendChild(fileInput);
    fileInput.click();
    document.body.removeChild(fileInput);
}

async function createNotificationsTab() {
    const notifications = await loadUserNotifications();

    if (!notifications.length) {
        return `<div class="notifications-tab"><p>No notifications yet</p></div>`;
    }

    return `
        <div class="notifications-tab">
            ${notifications.map(n => `
                <div class="notification-item" onclick="openNotificationModal('${n.message}', '${n.title}'); markNotificationAsRead('${n.id}')">
                    <div class="notification-content">
                        <h4>${n.title}</h4>
                        <p>${n.message}</p>
                        <span class="notification-time">
                            ${n.timestamp?.toDate().toLocaleString() || ''}
                        </span>
                    </div>
                </div>
            `).join("")}
        </div>
    `;
}


function createComplaintsTab() {
    return `
        <div class="complaints-tab">
            <form class="complaint-form" onsubmit="submitComplaint(event)">
                <textarea 
                    id="complaint-text" 
                    class="complaint-textarea" 
                    placeholder="Describe your complaint or issue in detail..."
                    required
                ></textarea>
                <button type="submit" class="complaint-submit-btn">SUBMIT COMPLAINT</button>
            </form>
        </div>
    `;
}

function createHistoryTab() {
    return `
        <div class="history-tab">
            <h3>Betting History</h3>
            <div class="history-content">
                <div class="history-item">
                    <p>No betting history available yet.</p>
                    <p>Start placing bets to see your history here!</p>
                </div>
            </div>
        </div>
    `;
}

// REPLACE the createSlipsTab function (remove async from the function signature):
function createSlipsTab() {
    if (!currentUser) {
        return Promise.resolve('<div class="slips-tab"><p>Please login to view betting slips</p></div>');
    }
    
    return new Promise(async (resolve) => {
        try {
            const slipsQuery = await db.collection('betting_slips')
                .where('userId', '==', currentUser.id)
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();
                
            if (slipsQuery.empty) {
                resolve(`
                    <div class="slips-tab">
                        <div class="slip-item">
                            <div class="slip-info">
                                <p>No betting slips yet.</p>
                                <p>Place bets to see your slips here!</p>
                            </div>
                        </div>
                    </div>
                `);
                return;
            }
            
            let slipsHtml = '<div class="slips-tab">';
            slipsQuery.docs.forEach(doc => {
                const slip = doc.data();
                const timestamp = slip.timestamp.toDate().toLocaleString();
                
                // Determine status display
                let statusDisplay = slip.status || 'placed';
                let statusClass = statusDisplay.toLowerCase();
                
                // Map status for display
                if (statusDisplay.includes('&')) {
                    const parts = statusDisplay.split('&').map(p => p.trim());
                    const mainStatus = parts[0].toUpperCase();
                    const resultStatus = parts[1].toUpperCase();
                    
                    let resultColor = '#FFF3DA';
                    if (resultStatus === 'WON') resultColor = '#9ef01a';
                    if (resultStatus === 'LOST') resultColor = '#ff0a54';
                    
                    statusDisplay = `${mainStatus} & <span style="color: ${resultColor};">${resultStatus}</span>`;
                    statusClass = 'compound-status';
                } else {
                    switch(statusDisplay.toLowerCase()) {
                        case 'placed': statusDisplay = 'PLACED'; break;
                        case 'rejected': statusDisplay = 'REJECTED'; statusClass = 'rejected'; break;
                        case 'queued': statusDisplay = 'QUEUED'; statusClass = 'queued'; break;
                        case 'won': statusDisplay = 'WON'; statusClass = 'won'; break;
                        case 'lost': statusDisplay = 'LOST'; statusClass = 'lost'; break;
                        default: statusDisplay = statusDisplay.toUpperCase();
                    }
                }
                
                slipsHtml += `
                    <div class="slip-item">
                        <div class="slip-info">
                            <h4>Event: ${slip.eventTitle}</h4>
                            <p>Bet: ${formatCurrency(slip.betAmount)} on ${slip.selectedOption}</p>
                            <p>Odds: ${slip.odds} | Potential Win: ${formatCurrency(slip.potentialWinning)}</p>
                            <p>Time: ${timestamp}</p>
                            <p>Type: ${slip.betType || 'pool'}</p>
                        </div>
                        <span class="slip-status ${statusClass}">${statusDisplay}</span>
                    </div>
                `;
            });
            slipsHtml += '</div>';
            
            resolve(slipsHtml);
            
        } catch (error) {
            console.error('Error loading betting slips:', error);
            resolve('<div class="slips-tab"><p>Error loading betting slips</p></div>');
        }
    });
}

// ADD this function to update slip status (for admin use later):
async function updateSlipStatus(slipId, newStatus) {
    try {
        await db.collection('betting_slips').doc(slipId).update({
            status: newStatus,
            statusUpdatedAt: firebase.firestore.Timestamp.now()
        });
        
        console.log(`Slip ${slipId} status updated to ${newStatus}`);
    } catch (error) {
        console.error('Error updating slip status:', error);
    }
}

async function submitComplaint(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    const complaintText = document.getElementById('complaint-text').value.trim();
    if (!complaintText) {
        showNotification('Please enter your complaint', 'error');
        return;
    }

    try {
        showBuffering();

        const userRef = db.collection("users").doc(currentUser.id);

        // Run in transaction so complaintCount is safe
        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            let complaintCount = userDoc.exists && userDoc.data().complaintCount ? userDoc.data().complaintCount : 0;
            complaintCount += 1;

            // Update complaintCount in user document
            transaction.update(userRef, { complaintCount });

            // Save complaint
            const complaintRef = db.collection("admin_complaints").doc();
            transaction.set(complaintRef, {
                userId: currentUser.id,
                userNickname: currentUser.nickname,
                userDisplayName: currentUser.displayName,
                complaintText: complaintText,
                complaintNumber: complaintCount,
                status: 'pending',
                timestamp: firebase.firestore.Timestamp.now(),
                read: false
            });

            // Also add notification for the user
            const notifRef = db.collection("notifications").doc();
            transaction.set(notifRef, {
                userId: currentUser.id,
                title: "Complaint Submitted",
                message: `Your complaint has been submitted. Complaint #${complaintCount}`,
                type: "system",
                read: false,
                timestamp: firebase.firestore.Timestamp.now()
            });
        });

        // Clear the form
        document.getElementById('complaint-text').value = '';

        showNotification('Complaint submitted successfully!', 'success');
        hideBuffering();

    } catch (error) {
        console.error('Error submitting complaint:', error);
        showNotification('Failed to submit complaint', 'error');
        hideBuffering();
    }
}



// Leaderboard Functions
function showLeaderboard() {
    loadLeaderboard();
    showModal('leaderboard-modal');
}

async function loadLeaderboard() {
    try {
        const usersSnapshot = await db.collection('users')
            .orderBy('totalWinnings', 'desc')
            .limit(50)
            .get();
        
        const leaderboardEl = document.getElementById('leaderboard');
        leaderboardEl.innerHTML = '';
        
        usersSnapshot.docs.forEach((doc, index) => {
            const user = doc.data();
            const position = index + 1;
            
            // Determine position color based on rep score
            const positionColor = user.repScore === 'BAD' ? '#ff0a54' : '#9ef01a';
            
            const row = document.createElement('div');
            row.className = 'leaderboard-row';
            row.innerHTML = `
                <span class="position" style="color: ${positionColor};">#${position}</span>
                <div class="leaderboard-profile" onclick="toggleLeaderboardName(this, '${user.displayName}')">
                    <img src="${user.profilePic || getRandomProfilePic(user.gender)}" 
                         alt="Profile" 
                         class="leaderboard-pic ${user.gender}">
                </div>
                <span class="winnings">${formatCurrency(user.totalWinnings || 0, user.currency)}</span>
            `;
            
            leaderboardEl.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading leaderboard:', error);
    }
}

function toggleLeaderboardName(element, displayName) {
    // Remove any existing popups
    document.querySelectorAll('.leaderboard-name-popup').forEach(popup => popup.remove());
    
    // Create new popup
    const popup = document.createElement('div');
    popup.className = 'leaderboard-name-popup';
    popup.textContent = displayName;
    
    // Add popup to the leaderboard row instead of inside the profile div
    const row = element.closest('.leaderboard-row');
    row.style.position = 'relative';
    row.appendChild(popup);
    
    // Remove popup after 2 seconds
    setTimeout(() => popup.remove(), 2000);
}

// Buy-in Functions
function showBuyIn() {
    // Ensure button starts with clean state (no animation)
    const resetBtn = document.querySelector('.reset-limit-btn');
    if (resetBtn) {
        resetBtn.classList.remove('pulsing-attract');
    }
    
    showModal('buyin-modal');
}

async function testBuyIn() {
    const amount = parseInt(document.getElementById('buyin-amount').value);
    if (!amount || amount <= 0) {
        showNotification('Enter valid amount', 'error');
        return;
    }
    
    if (currentUser.dailyBuyinUsed + amount > adminSettings.dailyBuyinLimit) {
        const resetBtn = document.querySelector('.reset-limit-btn');
        
        if (resetBtn) {
            resetBtn.classList.remove('hidden');
            resetBtn.classList.remove('pulsing-attract');
        }
        
        showNotification('Daily buy-in limit reached. Reset your limit by watching an ad!', 'warning');
        
        setTimeout(() => {
            if (resetBtn) {
                resetBtn.classList.add('pulsing-attract');
                setTimeout(() => {
                    resetBtn.classList.remove('pulsing-attract');
                }, 1100);
            }
        }, 1500);
        
        return;
    }

    // NEW: Store the buy-in amount and show ad modal instead of processing immediately
    window.pendingBuyinAmount = amount;
    watchAdForBuyIn();
}

function watchAdForBuyIn() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Set flag to track this is for buy-in
    window.adPurpose = 'buyin';
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const iframe = document.getElementById('ad-video');
    if (!iframe) {
        console.error('Ad video iframe not found');
        showNotification('Ad system error. Please try again.', 'error');
        return;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    closeModal('buyin-modal');
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl, purpose: 'buyin' });
    
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
        // Change button text for buy-in
        claimBtn.textContent = 'BUY-IN';
    }
    
    let timeLeft = 32;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft;
    }
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            if (claimBtn) {
                claimBtn.classList.remove('hidden');
            }
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl, purpose: 'buyin' });
        }
    }, 1000);
}

function watchAdForBuyinReset() {
    if (!currentUser) {
        showNotification('Please login first', 'error');
        return;
    }
    
    // Set flag to track this is for buyin reset
    window.adPurpose = 'buyin_reset';
    
    if (window.currentAdTimer) {
        clearInterval(window.currentAdTimer);
        window.currentAdTimer = null;
    }
    
    const iframe = document.getElementById('ad-video');
    if (!iframe) {
        console.error('Ad video iframe not found');
        showNotification('Ad system error. Please try again.', 'error');
        return;
    }
    
    const adUrl = adminSettings.activeAds[Math.floor(Math.random() * adminSettings.activeAds.length)];
    iframe.src = adUrl + '?autoplay=1&controls=0&disablekb=1&modestbranding=1&rel=0&enablejsapi=1';
    iframe.style.pointerEvents = 'none';
    iframe.allow = 'autoplay; fullscreen';
    
    closeModal('buyin-modal');
    showModal('ad-modal');
    
    // Log ad_click immediately when modal opens
    logActivity('ad_click', { userId: currentUser.id, adUrl, purpose: 'buyin_reset' });
    
    const claimBtn = document.getElementById('claim-reward');
    if (claimBtn) {
        claimBtn.classList.add('hidden');
        // Change button text for buyin reset
        claimBtn.textContent = 'CLAIM RESET';
    }
    
    let timeLeft = 32;
    const timerEl = document.getElementById('ad-timer');
    if (timerEl) {
        timerEl.textContent = timeLeft;
    }
    
    window.currentAdTimer = setInterval(() => {
        timeLeft--;
        if (timerEl) {
            timerEl.textContent = timeLeft;
        }
        
        if (timeLeft <= 0) {
            clearInterval(window.currentAdTimer);
            window.currentAdTimer = null;
            if (claimBtn) {
                claimBtn.classList.remove('hidden');
            }
            
            // Log ad_view only when timer completes (user watched full ad)
            logActivity('ad_view', { userId: currentUser.id, adUrl, purpose: 'buyin_reset' });
        }
    }, 1000);
}

// Stats and Real-time Updates
async function loadStats() {
    try {
        const stats = await db.collection('stats').doc('global').get();
        let activePlayers = 0;
        let totalPot = 0;
        
        if (stats.exists) {
            const data = stats.data();
            activePlayers = data.activePlayers || 0;
        }
        
        // Calculate total pot from active visible events
        const activeEventsSnapshot = await db.collection('events')
            .where('status', '==', 'active')
            .where('display_status', '==', 'visible')
            .get();
            
        activeEventsSnapshot.docs.forEach(doc => {
            const eventData = doc.data();
            totalPot += eventData.totalPot || 0;
        });
        
        // Update all stat displays
        const activePlayersEls = ['active-players', 'active-players-sticky', 'active-players-bottom'];
        const totalPotEls = ['total-pot', 'total-pot-sticky', 'total-pot-bottom'];
        
        activePlayersEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = activePlayers;
        });
        
        totalPotEls.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = formatCurrency(totalPot, 'INR');
        });
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function startRealTimeUpdates() {
    // Update stats every 30 seconds
    setInterval(loadStats, 30000);
    
    // Update events every minute
    setInterval(loadEvents, 60000);
}

// Auto-check and update upcoming events every minute
function startUpcomingEventsChecker() {
    setInterval(() => {
        events.forEach(event => {
            if (event.status && event.status.toLowerCase() === 'upcoming' && event.startTime) {
                const now = new Date();
                const startTime = event.startTime.toDate();
                
                if (now >= startTime) {
                    // Auto-update to active
                    db.collection('events').doc(event.id).update({
                        status: 'active'
                    }).then(() => {
                        console.log(`Event ${event.id} auto-updated from upcoming to active`);
                        // Update local events array
                        const eventIndex = events.findIndex(e => e.id === event.id);
                        if (eventIndex !== -1) {
                            events[eventIndex].status = 'active';
                        }
                        // Refresh display
                        displayEvents();
                    }).catch(error => {
                        console.error('Error auto-updating event status:', error);
                    });
                }
            }
        });
    }, 60000); // Check every minute
}

// ADD THE FUNCTION HERE:
// Show welcome message after page refresh if needed
function showPostRefreshWelcomeMessage() {
    const welcomeFlag = localStorage.getItem('showWelcomeMessage');
    if (welcomeFlag) {
        localStorage.removeItem('showWelcomeMessage'); // Clear flag
        
        setTimeout(() => {
            if (welcomeFlag === 'registration') {
                showNotification('Welcome to PredictKing! Your account is ready.', 'success');
            } else if (welcomeFlag === 'true') {
                showNotification('Welcome back!', 'success');
            }
        }, 500); // Show after everything loads
    }
}

// Utility Functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    const text = document.getElementById('notification-text');
    
    // Clear any existing timers
    if (window.notificationTimer) {
        clearTimeout(window.notificationTimer);
    }
    if (window.notificationHideTimer) {
        clearTimeout(window.notificationHideTimer);
    }
    
    text.innerHTML = message;
    notification.className = `notification ${type}`;
    
    // Swoosh animation from left to right
    notification.classList.remove('hidden', 'hide');
    notification.classList.add('show');
    
    // Set timers with proper cleanup
    window.notificationTimer = setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');
        
        window.notificationHideTimer = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('hide');
            window.notificationTimer = null;
            window.notificationHideTimer = null;
        }, 600);
    }, 2500);
}

async function showNotifications() {
    if (!currentUser) {
        showNotification("Please login first", "error");
        return;
    }

    let modal = document.getElementById("notifications-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "notifications-modal";
        modal.className = "modal";
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('notifications-modal')">&times;</span>
                <h2>NOTIFICATIONS</h2>
                <div id="notifications-list" class="notifications-tab"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // load notifications dynamically
    const notifications = await loadUserNotifications();
    const list = document.getElementById("notifications-list");

    if (!notifications.length) {
        list.innerHTML = "<p>No notifications yet</p>";
    } else {
        list.innerHTML = notifications.map(n => `
            <div class="notification-item" onclick="openNotificationModal('${n.message}', '${n.title}'); markNotificationAsRead('${n.id}')">
                <div class="notification-content">
                    <h4>${n.title}</h4>
                    <p>${n.message}</p>
                    <span class="notification-time">${n.timestamp?.toDate().toLocaleString() || ''}</span>
                </div>
            </div>
        `).join("");
    }

    showModal("notifications-modal");
}

async function markNotificationAsRead(notificationId) {
    try {
        await db.collection("notifications").doc(notificationId).update({ read: true });
    } catch (error) {
        console.error("Error marking notification as read:", error);
    }
}


function showBuffering() {
    // Add buffering indicator
    document.body.classList.add('loading');
}

function hideBuffering() {
    document.body.classList.remove('loading');
}

function formatEventTime(timestamp) {
    if (!timestamp) return 'TBD';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
}

function copyCode() {
    const codeInput = document.getElementById('generated-code');
    codeInput.select();
    document.execCommand('copy');
    showNotification('Code copied to clipboard!', 'success');
}

function downloadCode() {
    const code = document.getElementById('generated-code').value;
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(code));
    element.setAttribute('download', 'predictking-login-code.txt');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function logout() {
    //updateActivePlayersCount(-1); // Decrease count
    currentUser = null;
    localStorage.removeItem('userCode');
    
    closeModal('profile-modal');
    showNotification('Logged out successfully', 'success');
    
    // Redirect to homepage after a brief delay
    setTimeout(() => {
        window.location.href = 'tqpsut.html';
    }, 1000);
}

// Activity Logging
async function logActivity(action, data) {
    try {
        await db.collection('activity_logs').add({
            action,
            data,
            timestamp: firebase.firestore.Timestamp.now(),
            userAgent: navigator.userAgent,
            ip: 'client-side' // IP will be logged server-side in production
        });
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ADD THE FUNCTION HERE:
async function initializeCollections() {
    try {
        // Check if betting_pools collection exists by trying to get it
        const poolsTest = await db.collection('betting_pools').limit(1).get();
        console.log('betting_pools collection exists or was created');
        
        // Check if betting_slips collection exists
        const slipsTest = await db.collection('betting_slips').limit(1).get();
        console.log('betting_slips collection exists or was created');
        
        // Check if event_votes collection exists
        const votesTest = await db.collection('event_votes').limit(1).get();
        console.log('event_votes collection exists or was created');
        
        // Check if event_settlements collection exists
        const settlementsTest = await db.collection('event_settlements').limit(1).get();
        console.log('event_settlements collection exists or was created');
        
    } catch (error) {
        console.error('Error initializing collections:', error);
    }
}


// Daily Bonus
function claimDailyBonus() {
    if (!currentUser) return;
    
    const lastClaim = currentUser.lastDailyBonus;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (lastClaim && lastClaim.toDate() >= today) {
        showNotification('Daily bonus already claimed!', 'warning');
        return;
    }
    
    const bonus = 100; // Daily bonus amount
    currentUser.balance += bonus;
    currentUser.lastDailyBonus = firebase.firestore.Timestamp.now();
    
    // Update in Firebase
    db.collection('users').doc(currentUser.id).update({
        balance: currentUser.balance,
        lastDailyBonus: currentUser.lastDailyBonus
    });
    
    updateBalance();
    showNotification(`Daily bonus claimed: ${formatCurrency(bonus, currentUser.currency)}!`, 'success');
    
    // Log daily bonus
    logActivity('daily_bonus', { userId: currentUser.id, bonus });
}

function showCasino() {
    let modal = document.getElementById('casino-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'casino-modal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('casino-modal')">&times;</span>
                <h2>CASINO</h2>
                <div style="text-align: center; padding: 2rem;">
                    <p style="font-size: 1.2rem; margin-bottom: 2rem;">Coming Soon!</p>
                    <p>Casino games are under development.</p>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    showModal('casino-modal');
}

// Update the theme switching function
function updateThemeBasedOnUser() {
    if (!currentUser) {
        setTheme('default');
        // Hide logged in elements
        document.querySelectorAll('.logged-in-only').forEach(el => el.classList.add('hidden'));
        // Show logged out elements
        document.querySelectorAll('.logged-out-only').forEach(el => el.classList.remove('hidden'));
    } else {
        // Show logged in elements
        document.querySelectorAll('.logged-in-only').forEach(el => el.classList.remove('hidden'));
        // Hide logged out elements
        document.querySelectorAll('.logged-out-only').forEach(el => el.classList.add('hidden'));
        
        if (currentUser.gender === 'male') {
            setTheme('male');
        } else if (currentUser.gender === 'female') {
            setTheme('female');
        }
    }
}

// Navigation toggle functionality
let navigationOpen = false;

function toggleNavigation() {
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    
    // Check if we're on EVC page or main page
    const isEVCPage = document.body.classList.contains('evc-page') || 
                      window.location.pathname.includes('fwd.html');
    
    let visibleIcons;
    
    if (isEVCPage) {
        // EVC page always shows 2 icons
        visibleIcons = document.querySelectorAll('.nav-icon.evc-1, .nav-icon.evc-2');
    } else {
        // Main page depends on login status
        if (currentUser) {
            visibleIcons = document.querySelectorAll('.nav-icon.logged-in-only:not(.hidden)');
        } else {
            visibleIcons = document.querySelectorAll('.nav-icon.logged-out-only:not(.hidden)');
        }
    }
    
    navigationOpen = !navigationOpen;
    
    const statsSection = document.getElementById('stats-section');
    const earnCoinsBtn = document.getElementById('earn-coins-btn');
    
    if (navigationOpen) {
        toggleBtn.classList.add('active');
        visibleIcons.forEach(icon => {
            icon.classList.add('visible');
        });
        // Hide stats and earn button immediately
        if (statsSection) statsSection.classList.add('hidden');
        if (earnCoinsBtn) earnCoinsBtn.classList.add('hidden');
    } else {
        toggleBtn.classList.remove('active');
        visibleIcons.forEach(icon => {
            icon.classList.remove('visible');
        });
        
        // Two-step fade-in process after nav icons disappear
        // Two-step fade-in process after nav icons disappear
        setTimeout(() => {
            // Step 1: Remove hidden class and add fade-in class (makes them visible but transparent)
            if (statsSection) {
                statsSection.classList.remove('hidden');
                statsSection.classList.add('fade-in');
            }
            // Only show earn coins button if user is logged in
            if (earnCoinsBtn && currentUser) {
                earnCoinsBtn.classList.remove('hidden');
                earnCoinsBtn.classList.add('fade-in');
            }
            
            // Step 2: Remove fade-in class to trigger fade animation (small delay)
            setTimeout(() => {
                if (statsSection) statsSection.classList.remove('fade-in');
                if (earnCoinsBtn && currentUser) earnCoinsBtn.classList.remove('fade-in');
            }, 50);
            
        }, 700); // Wait for nav icon animation to complete
    }
}

function showLoggedInLayout() {
    // Hide logged out elements
    document.querySelectorAll('.logged-out-only').forEach(el => el.classList.add('hidden'));
    
    // Show logged in elements  
    document.querySelectorAll('.logged-in-only').forEach(el => el.classList.remove('hidden'));
    
    // Close navigation if open
    closeNavigation();
}

function showLoggedOutLayout() {
    // Hide logged in elements
    document.querySelectorAll('.logged-in-only').forEach(el => el.classList.add('hidden'));
    
    // Show logged out elements
    document.querySelectorAll('.logged-out-only').forEach(el => el.classList.remove('hidden'));
    
    // Close navigation if open
    closeNavigation();
}

function closeNavigation() {
    navigationOpen = false;
    const toggleBtn = document.querySelector('.nav-toggle-btn');
    if (toggleBtn) toggleBtn.classList.remove('active');
    
    document.querySelectorAll('.nav-icon').forEach(icon => {
        icon.classList.remove('visible');
    });
}


// Enhanced password save function for registration
function triggerPasswordSaveForRegistration(username, password) {
    try {
        // Create a visible form to properly trigger browser's save password dialog
        const form = document.createElement('form');
        form.id = 'password-save-form';
        form.style.position = 'fixed';
        form.style.top = '-200px';
        form.style.left = '50%';
        form.style.transform = 'translateX(-50%)';
        form.style.zIndex = '10001';
        form.style.background = 'transparent';
        form.style.border = 'none';
        form.action = '/login'; // Fake action
        form.method = 'post';
        form.autocomplete = 'on';
        
        const usernameInput = document.createElement('input');
        usernameInput.type = 'text';
        usernameInput.name = 'username';
        usernameInput.id = 'temp-username';
        usernameInput.value = username;
        usernameInput.autocomplete = 'username';
        usernameInput.style.opacity = '0.01';
        usernameInput.style.height = '1px';
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.name = 'password';
        passwordInput.id = 'temp-password';
        passwordInput.value = password;
        passwordInput.autocomplete = 'new-password';
        passwordInput.style.opacity = '0.01';
        passwordInput.style.height = '1px';
        
        form.appendChild(usernameInput);
        form.appendChild(passwordInput);
        document.body.appendChild(form);
        
        // Simulate a login attempt to trigger password manager
        setTimeout(() => {
            usernameInput.focus();
            setTimeout(() => {
                passwordInput.focus();
                setTimeout(() => {
                    // Create a submit event
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    form.dispatchEvent(submitEvent);
                    
                    // Prevent actual submission
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        console.log('Password manager should be triggered');
                    });
                    
                    // Clean up
                    setTimeout(() => {
                        if (document.body.contains(form)) {
                            document.body.removeChild(form);
                        }
                    }, 3000);
                }, 100);
            }, 100);
        }, 100);
        
    } catch (error) {
        console.error('Error triggering password save:', error);
    }
}

// Function to complete registration process
// Function to complete registration process
function finishRegistration() {
    if (!window.currentRegistrationCode) {
        closeModal('code-modal');
        showNotification('Registration completed!', 'success');
        return;
    }
    
    // Final attempt to save credentials
    if (window.currentRegistrationUsername && window.currentRegistrationCode) {
        // Store in multiple locations for maximum safety
        localStorage.setItem('userCode', window.currentRegistrationCode);
        localStorage.setItem('savedUsername', window.currentRegistrationUsername);
        localStorage.setItem('userSHA256', window.currentRegistrationCode); // Store for profile access
        
        // Update cookies
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        document.cookie = `predictking_code=${window.currentRegistrationCode}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax`;
        
        // Try to save in sessionStorage as well
        try {
            sessionStorage.setItem('tempUserCode', window.currentRegistrationCode);
        } catch (e) {
            console.log('SessionStorage not available');
        }
    }
    
    closeModal('code-modal');
    window.registrationInProgress = false;
    
    // Store flag to show welcome message after refresh for new registration
    localStorage.setItem('showWelcomeMessage', 'registration');
    
    showNotification('Registration completed! Logging you in...', 'success');
    
    // Auto-login the user with their new code after a shorter delay
    setTimeout(() => {
        if (window.currentRegistrationCode) {
            // Set flag to indicate this login should trigger refresh
            window.shouldRefreshAfterLogin = true;
            loginUser(window.currentRegistrationCode, false);
        }
        // Clear the temporary variables
        window.currentRegistrationCode = null;
        window.currentRegistrationUsername = null;
    }, 800);
}

// Function to recover saved codes from browser storage
function recoverSavedCredentials() {
    // Try localStorage first
    let savedCode = localStorage.getItem('userCode');
    let savedUsername = localStorage.getItem('savedUsername');
    
    if (savedCode) {
        return { code: savedCode, username: savedUsername };
    }
    
    // Try cookies
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'predictking_code') {
            savedCode = value;
        }
        if (name === 'predictking_username') {
            savedUsername = value;
        }
    }
    
    if (savedCode) {
        return { code: savedCode, username: savedUsername };
    }
    
    // Try sessionStorage as last resort
    try {
        savedCode = sessionStorage.getItem('tempUserCode');
        if (savedCode) {
            return { code: savedCode, username: null };
        }
    } catch (e) {
        console.log('SessionStorage not available');
    }
    
    return null;
}

// Enhanced copy function that also shows recovery info
function copyCode() {
    const codeInput = document.getElementById('generated-code');
    codeInput.select();
    codeInput.setSelectionRange(0, 99999); // For mobile devices
    
    try {
        document.execCommand('copy');
        showNotification('Code copied! Also saved in your browser automatically.', 'success');
    } catch (err) {
        // Fallback for newer browsers
        navigator.clipboard.writeText(codeInput.value).then(() => {
            showNotification('Code copied! Also saved in your browser automatically.', 'success');
        }).catch(() => {
            showNotification('Please manually select and copy the code', 'warning');
        });
    }
}

// Function to show user's SHA256 code in settings
function showMySHA256() {
    const shaDisplay = document.getElementById('sha-display');
    const shaCodeInput = document.getElementById('user-sha-code');
    const shaButton = document.querySelector('.sha-reveal-btn');
    
    if (shaDisplay.classList.contains('hidden')) {
        // Try to get SHA256 from storage
        let userSHA = localStorage.getItem('userSHA256') || localStorage.getItem('userCode');
        
        if (!userSHA) {
            // Try from cookies
            const cookies = document.cookie.split(';');
            for (let cookie of cookies) {
                const [name, value] = cookie.trim().split('=');
                if (name === 'predictking_code') {
                    userSHA = value;
                    break;
                }
            }
        }
        
        if (userSHA) {
            shaCodeInput.value = userSHA;
            shaDisplay.classList.remove('hidden');
            shaButton.textContent = 'HIDE SHA256';
        } else {
            showNotification('SHA256 code not found in browser storage', 'error');
        }
    } else {
        shaDisplay.classList.add('hidden');
        shaButton.textContent = 'SHOW MY SHA256';
        shaCodeInput.value = '';
    }
}

// Function to copy SHA256 from settings
function copySHAFromSettings() {
    const shaCodeInput = document.getElementById('user-sha-code');
    if (!shaCodeInput.value) {
        showNotification('No code to copy', 'error');
        return;
    }
    
    shaCodeInput.select();
    shaCodeInput.setSelectionRange(0, 99999);
    
    try {
        document.execCommand('copy');
        showNotification('SHA256 code copied to clipboard!', 'success');
    } catch (err) {
        navigator.clipboard.writeText(shaCodeInput.value).then(() => {
            showNotification('SHA256 code copied to clipboard!', 'success');
        }).catch(() => {
            showNotification('Failed to copy. Please select and copy manually.', 'error');
        });
    }
}

// Add these functions if they don't exist
function goToEVC() {
    console.log('Going to EVC page...'); // Debug log
    window.location.href = 'fwd.html';
}

function goHome() {
    console.log('Going to homepage...'); // Debug log
    window.location.href = 'tqpsut.html';
}


// Close modals when clicking outside
// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        const modalId = event.target.id;
        
        // Special handling for code modal during registration OR regular close
        if (modalId === 'code-modal') {
            if (window.registrationInProgress) {
                finishRegistration(); // Handles registration completion
            } else {
                // Regular code modal close - still trigger refresh if user was logging in
                event.target.style.display = 'none';
                if (window.shouldRefreshAfterLogin) {
                    setTimeout(() => {
                        window.shouldRefreshAfterLogin = false;
                        window.location.reload();
                    }, 300);
                }
            }
            return;
        }
        
        if (modalId === 'ad-modal') {
            cleanupAdTimer();
        }
        event.target.style.display = 'none';
    }
}

// Handle code modal close button specifically
function closeCodeModal() {
    if (window.registrationInProgress) {
        finishRegistration();
    } else {
        closeModal('code-modal');
        if (window.shouldRefreshAfterLogin) {
            setTimeout(() => {
                window.shouldRefreshAfterLogin = false;
                window.location.reload();
            }, 300);
        }
    }
}