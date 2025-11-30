import * as THREE from 'three';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0e27);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 8, 12); // Adjusted for higher tree
camera.lookAt(0, 4.5, 0); // Look at center of tree

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 25;

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 5);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 50;
directionalLight.shadow.camera.left = -10;
directionalLight.shadow.camera.right = 10;
directionalLight.shadow.camera.top = 10;
directionalLight.shadow.camera.bottom = -10;
scene.add(directionalLight);

// Ground
const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x2d5016,
    roughness: 0.8,
    metalness: 0.2
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0; // Shifted up from -2
ground.receiveShadow = true;
scene.add(ground);

// Tree (Cone) - made configurable
let treeHeight = 6;
let treeRadius = 2.5;
let treeGeometry = new THREE.ConeGeometry(treeRadius, treeHeight, 32);
const treeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x1a5f1a,
    roughness: 0.9,
    metalness: 0.1
});
const tree = new THREE.Mesh(treeGeometry, treeMaterial);
tree.position.y = 4.5; // Moved higher
tree.castShadow = true;
tree.receiveShadow = true;
scene.add(tree);

// Trunk (Brown cylinder) - extends from tree base to ground
const treeBaseY = tree.position.y - (treeHeight / 2); // Tree base position
const groundY = 0; // Ground level
const trunkHeight = treeBaseY - groundY; // Trunk height = distance from tree base to ground
const trunkRadius = 0.35;
const trunkGeometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 16);
const trunkMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x8b4513,
    roughness: 0.9,
    metalness: 0.1
});
const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
// Position trunk so its top is at tree base and bottom is at ground
trunk.position.y = (treeBaseY + groundY) / 2; // Center of trunk between tree base and ground
trunk.castShadow = true;
trunk.receiveShadow = true;
scene.add(trunk);

// Star at the top
let starMaterial;
let yanukovychTexture = null;
let starSize = 0.4;
let starGroup = null;

function createStar(size = starSize) {
    if (starGroup) {
        scene.remove(starGroup);
        starGroup.children.forEach(child => {
            if (child.geometry) child.geometry.dispose();
            if (child.material && child.material !== starMaterial) child.material.dispose();
        });
    }
    
    starGroup = new THREE.Group();
    const currentStarSize = size;
    
    // Create a 5-pointed star shape using Shape
    const starShape = new THREE.Shape();
    const outerRadius = starSize;
    const innerRadius = starSize * 0.4;
    
    for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2; // Rotate so one point is up
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
            starShape.moveTo(x, y);
        } else {
            starShape.lineTo(x, y);
        }
    }
    starShape.closePath();
    
    const starGeometry = new THREE.ShapeGeometry(starShape);
    
    // Compute bounding box for UV mapping
    starGeometry.computeBoundingBox();
    const bbox = starGeometry.boundingBox;
    const sizeX = bbox.max.x - bbox.min.x;
    const sizeY = bbox.max.y - bbox.min.y;
    
    // Manually set UV coordinates to properly map texture
    const positions = starGeometry.attributes.position;
    const uvs = [];
    for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        // Map to 0-1 UV space, centered
        const u = (x - bbox.min.x) / sizeX;
        const v = (y - bbox.min.y) / sizeY;
        uvs.push(u, v);
    }
    starGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    
    starMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffd700,
        emissive: 0xffd700,
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.2,
        side: THREE.DoubleSide
    });
    
    const starMesh = new THREE.Mesh(starGeometry, starMaterial);
    starMesh.rotation.z = Math.PI / 2; // Rotate to face forward
    starGroup.add(starMesh);
    
    // Position at top of tree
    starGroup.position.y = tree.position.y + (treeHeight / 2) + currentStarSize * 0.5;
    starGroup.castShadow = true;
    
    // Create Yanukovych texture from canvas (fallback if image doesn't load)
    function createYanukovychTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        
        // Create a simple representation - you can replace this with actual image loading
        // For now, using a colored background with text as placeholder
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = '#333';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Я бачу', 128, 100);
        ctx.fillText('світло!', 128, 140);
        ctx.font = '16px Arial';
        ctx.fillText('В.Ф. Янукович', 128, 180);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.flipY = false;
        return texture;
    }
    
    // Try to load actual image from local file first, then remote, fallback to canvas
    const textureLoader = new THREE.TextureLoader();
    const imagePaths = [
        'yanukovych.jpg',
        'yanukovych.png',
        'yanukovych.webp',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/Viktor_Yanukovych_%282010%29.jpg/220px-Viktor_Yanukovych_%282010%29.jpg'
    ];
    
    let currentPathIndex = 0;
    function tryLoadNextImage() {
        if (currentPathIndex >= imagePaths.length) {
            console.log('Using canvas fallback for Yanukovych texture');
            yanukovychTexture = createYanukovychTexture();
            // Apply texture if lights are already on
            if (lightsOn) {
                toggleLights(true);
            }
            return;
        }
        
        textureLoader.load(
            imagePaths[currentPathIndex],
            (texture) => {
                // Create a cropped/centered version of the image on canvas
                const img = texture.image;
                const canvas = document.createElement('canvas');
                const size = 512; // Use a square canvas
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                
                // Calculate crop to center the face/important part
                // Assuming portrait orientation, crop to center square
                const imgAspect = img.width / img.height;
                let sourceX = 0;
                let sourceY = 0;
                let sourceWidth = img.width;
                let sourceHeight = img.height;
                
                if (imgAspect > 1) {
                    // Landscape: crop width to make it square
                    sourceWidth = img.height;
                    sourceX = (img.width - sourceWidth) / 2;
                } else {
                    // Portrait: crop height to make it square, focus on upper portion (face)
                    sourceHeight = img.width;
                    sourceY = Math.max(0, (img.height - sourceHeight) * 0.1); // Focus on top 10-90% for face
                }
                
                // Draw cropped image to canvas, centered
                ctx.drawImage(
                    img,
                    sourceX, sourceY, sourceWidth, sourceHeight,
                    0, 0, size, size
                );
                
                // Create texture from canvas
                yanukovychTexture = new THREE.CanvasTexture(canvas);
                yanukovychTexture.flipY = false;
                yanukovychTexture.wrapS = THREE.ClampToEdgeWrapping;
                yanukovychTexture.wrapT = THREE.ClampToEdgeWrapping;
                yanukovychTexture.minFilter = THREE.LinearFilter;
                yanukovychTexture.magFilter = THREE.LinearFilter;
                console.log('Loaded and cropped Yanukovych texture from:', imagePaths[currentPathIndex]);
                // Apply texture if lights are already on
                if (lightsOn) {
                    toggleLights(true);
                }
            },
            undefined,
            (error) => {
                console.log('Failed to load from:', imagePaths[currentPathIndex]);
                currentPathIndex++;
                tryLoadNextImage();
            }
        );
    }
    
    // Only load texture if not already loaded
    if (!yanukovychTexture) {
        tryLoadNextImage();
    }
    
    scene.add(starGroup);
    return starGroup;
}

createStar();

// Collections for decorations
let balls = [];
let lights = [];
let lightObjects = [];
let lollipops = [];
let lightsOn = true;
let lightIntensity = 0.5;
let rotationSpeed = 0;

// Function to generate evenly distributed points on cone surface
// starPadding: space to leave at top for star (0-1, where 1 is full height)
// angleOffset: offset in radians to avoid overlapping with other decoration types
function getEvenlyDistributedPointsOnCone(radius, height, yOffset, count, starPadding = 0.15, angleOffset = 0) {
    const points = [];
    
    if (count === 0) return points;
    if (count === 1) {
        // Single point at middle height
        const y = height * 0.5 + yOffset;
        points.push(new THREE.Vector3(0, y, radius * 0.5 * 0.85));
        return points;
    }
    
    // Calculate optimal number of levels for even distribution
    // Use golden ratio spacing for better visual distribution
    const numLevels = Math.max(2, Math.ceil(Math.sqrt(count * 1.5)));
    const pointsPerLevel = Math.ceil(count / numLevels);
    
    let pointIndex = 0;
    for (let level = 0; level < numLevels && pointIndex < count; level++) {
        // Distribute levels evenly from bottom to top, leaving space at top for star
        // Adjusted to leave padding at top
        const normalizedY = 0.1 + (level + 0.5) / numLevels * (0.8 - starPadding); // 10% to (90% - starPadding) of height
        const actualY = normalizedY * height + yOffset;
        const radiusAtY = radius * (1 - normalizedY);
        
        // Calculate points for this level
        const pointsThisLevel = Math.min(pointsPerLevel, count - pointIndex);
        
        // For better symmetry, adjust points per level based on radius
        // Larger radius = more points can fit
        const adjustedPointsThisLevel = Math.max(
            1,
            Math.min(pointsThisLevel, Math.ceil(radiusAtY * 4))
        );
        
        // Distribute evenly around the circle with offset for visual interest
        const angleStep = (Math.PI * 2) / adjustedPointsThisLevel;
        const levelOffset = (level % 2) * (angleStep / 2); // Alternate levels offset for better coverage
        
        for (let i = 0; i < adjustedPointsThisLevel && pointIndex < count; i++) {
            const angle = i * angleStep + levelOffset + angleOffset;
            // Position slightly outside the surface for visibility
            const offset = 0.15; // Push decorations outward
            const x = Math.cos(angle) * (radiusAtY + offset);
            const z = Math.sin(angle) * (radiusAtY + offset);
            points.push(new THREE.Vector3(x, actualY, z));
            pointIndex++;
        }
    }
    
    return points;
}

// Function to create a Christmas ball
function createBall(position) {
    const ballGeometry = new THREE.SphereGeometry(0.15, 16, 16);
    const colors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xff8800];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const ballMaterial = new THREE.MeshStandardMaterial({ 
        color: color,
        metalness: 0.8,
        roughness: 0.2
    });
    const ball = new THREE.Mesh(ballGeometry, ballMaterial);
    
    // Position ball hanging down from tree surface
    const horizontalDist = Math.sqrt(position.x * position.x + position.z * position.z);
    const coneSlope = treeRadius / treeHeight; // Slope of the cone
    
    // Calculate hanging direction (downward along cone slope)
    const hangDirection = new THREE.Vector3(
        (position.x / horizontalDist) * 0.2, // Slight outward
        -0.98, // Strongly downward
        (position.z / horizontalDist) * 0.2  // Slight outward
    ).normalize();
    
    // Position ball hanging down from surface
    const hangDistance = 0.25;
    ball.position.copy(position);
    ball.position.add(hangDirection.multiplyScalar(hangDistance));
    
    ball.castShadow = true;
    ball.receiveShadow = true;
    return ball;
}

// Function to create a light
function createLight(position) {
    const lightGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const lightMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffaa,
        emissive: 0xffffaa,
        emissiveIntensity: 0.5
    });
    const lightMesh = new THREE.Mesh(lightGeometry, lightMaterial);
    
    // Position light hanging down from tree surface
    const horizontalDist = Math.sqrt(position.x * position.x + position.z * position.z);
    
    // Calculate hanging direction (downward along cone slope)
    const hangDirection = new THREE.Vector3(
        (position.x / horizontalDist) * 0.2, // Slight outward
        -0.98, // Strongly downward
        (position.z / horizontalDist) * 0.2  // Slight outward
    ).normalize();
    
    // Position light hanging down from surface
    const hangDistance = 0.2;
    lightMesh.position.copy(position);
    lightMesh.position.add(hangDirection.multiplyScalar(hangDistance));
    
    // Add point light at the position
    const pointLight = new THREE.PointLight(0xffffaa, 0.5, 2);
    pointLight.position.copy(lightMesh.position);
    pointLight.castShadow = false;
    
    return { mesh: lightMesh, light: pointLight };
}

// Function to create a Christmas candy stick (candy cane)
function createCandyStick(position) {
    const candyStickGroup = new THREE.Group();
    
    // Candy stick (straight stick with red and white stripes)
    const stickLength = 0.35;
    const stickRadius = 0.025;
    const hookCurveRadius = 0.12; // Radius of the hook curve - larger for more visible hook
    
    // Create red and white striped materials
    const redMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xff0000,
        roughness: 0.3,
        metalness: 0.1
    });
    const whiteMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1
    });
    
    // Create striped segments for the straight part
    const segments = 5; // Fewer segments to leave room for hook
    const segmentHeight = stickLength / (segments + 1);
    
    for (let i = 0; i < segments; i++) {
        const segmentGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, segmentHeight, 8);
        const segment = new THREE.Mesh(
            segmentGeometry,
            i % 2 === 0 ? redMaterial : whiteMaterial
        );
        segment.position.y = (i - segments / 2 + 0.5) * segmentHeight;
        candyStickGroup.add(segment);
    }
    
    // Create hook at the bottom using a curved path (candy cane style)
    const hookSegments = 12; // More segments for smoother curve
    const hookAngle = Math.PI / 2; // 90 degree hook
    const hookSegmentAngle = hookAngle / hookSegments;
    
    for (let i = 0; i < hookSegments; i++) {
        const angle = i * hookSegmentAngle;
        const nextAngle = (i + 1) * hookSegmentAngle;
        
        // Calculate positions along the curve (hook curves to the right)
        const startX = Math.cos(angle) * hookCurveRadius;
        const startY = Math.sin(angle) * hookCurveRadius;
        const endX = Math.cos(nextAngle) * hookCurveRadius;
        const endY = Math.sin(nextAngle) * hookCurveRadius;
        
        // Create segment for this part of the hook
        const segmentLength = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2);
        const segmentGeometry = new THREE.CylinderGeometry(stickRadius, stickRadius, segmentLength, 8);
        const segment = new THREE.Mesh(
            segmentGeometry,
            (segments + i) % 2 === 0 ? redMaterial : whiteMaterial
        );
        
        // Position and rotate segment
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        segment.position.x = midX;
        segment.position.y = -stickLength / 2 - hookCurveRadius + midY;
        segment.rotation.z = Math.atan2(endY - startY, endX - startX) + Math.PI / 2;
        
        candyStickGroup.add(segment);
    }
    
    // Add rounded tip at the end of the hook
    const tipRadius = stickRadius * 1.3;
    const tipGeometry = new THREE.SphereGeometry(tipRadius, 8, 8);
    const tipColor = (segments + hookSegments) % 2 === 0 ? redMaterial : whiteMaterial;
    const tip = new THREE.Mesh(tipGeometry, tipColor);
    tip.position.x = hookCurveRadius;
    tip.position.y = -stickLength / 2 - hookCurveRadius;
    candyStickGroup.add(tip);
    
    // Calculate hanging direction (downward along cone slope)
    const horizontalDist = Math.sqrt(position.x * position.x + position.z * position.z);
    
    // Direction pointing downward along the cone surface
    const hangDirection = new THREE.Vector3(
        (position.x / horizontalDist) * 0.2, // Slight outward component
        -0.98, // Strongly downward
        (position.z / horizontalDist) * 0.2
    ).normalize();
    
    // Position candy stick hanging from tree surface
    const hangDistance = 0.2;
    candyStickGroup.position.copy(position);
    candyStickGroup.position.add(hangDirection.multiplyScalar(hangDistance));
    
    // Rotate to hang downward
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, hangDirection);
    candyStickGroup.quaternion.copy(quaternion);
    
    candyStickGroup.castShadow = true;
    candyStickGroup.receiveShadow = true;
    
    return candyStickGroup;
}

// Function to update decorations
function updateDecorations(numBalls, numLights, numLollipops) {
    // Remove existing balls
    balls.forEach(ball => {
        scene.remove(ball);
    });
    balls = [];

    // Remove existing lights
    lights.forEach(light => {
        scene.remove(light.mesh);
        scene.remove(light.light);
    });
    lights = [];
    lightObjects = [];

    // Remove existing lollipops
    lollipops.forEach(lollipop => {
        scene.remove(lollipop);
    });
    lollipops = [];

    // Get evenly distributed positions for balls (with star padding and angle offset to avoid overlap)
    // yOffset adjusted: tree.position.y - treeHeight/2 = 3 - 3 = 0
    const ballPositions = getEvenlyDistributedPointsOnCone(treeRadius, treeHeight, tree.position.y - treeHeight/2, numBalls, 0.15, 0);
    ballPositions.forEach(position => {
        const ball = createBall(position);
        scene.add(ball);
        balls.push(ball);
    });

    // Get evenly distributed positions for lights (with star padding and different angle offset)
    const lightPositions = getEvenlyDistributedPointsOnCone(treeRadius, treeHeight, tree.position.y - treeHeight/2, numLights, 0.15, Math.PI / 3); // 60 degree offset
    
    lightPositions.forEach((position) => {
        const lightObj = createLight(position);
        scene.add(lightObj.mesh);
        scene.add(lightObj.light);
        lights.push(lightObj);
        lightObjects.push(lightObj.light);
    });

    // Get evenly distributed positions for candy sticks (with star padding and different angle offset)
    const candyStickPositions = getEvenlyDistributedPointsOnCone(treeRadius, treeHeight, tree.position.y - treeHeight/2, numLollipops, 0.15, Math.PI * 2 / 3); // 120 degree offset
    candyStickPositions.forEach(position => {
        const candyStick = createCandyStick(position);
        scene.add(candyStick);
        lollipops.push(candyStick);
    });
}

// Initial decorations
updateDecorations(15, 10, 8);
// Set initial lights state
toggleLights(true);

// Function to update tree size
function updateTreeSize(height, radius) {
    treeHeight = height;
    treeRadius = radius;
    
    // Update tree geometry
    tree.geometry.dispose();
    tree.geometry = new THREE.ConeGeometry(treeRadius, treeHeight, 32);
    
    // Update tree position to keep base at same relative position
    tree.position.y = 4.5;
    
    // Update trunk
    const treeBaseY = tree.position.y - (treeHeight / 2);
    const groundY = 0;
    const trunkHeight = treeBaseY - groundY;
    trunk.geometry.dispose();
    trunk.geometry = new THREE.CylinderGeometry(trunkRadius, trunkRadius, trunkHeight, 16);
    trunk.position.y = (treeBaseY + groundY) / 2;
    
    // Update star position
    if (starGroup) {
        starGroup.position.y = tree.position.y + (treeHeight / 2) + starSize * 0.5;
    }
    
    // Update all decorations
    updateDecorations(
        parseInt(document.getElementById('balls').value),
        parseInt(document.getElementById('lights').value),
        parseInt(document.getElementById('lollipops').value)
    );
    toggleLights(lightsOn);
}

// Function to update star size
function updateStarSize(size) {
    starSize = size;
    createStar(starSize);
    if (lightsOn) {
        toggleLights(true);
    }
}

// Function to update light intensity
function updateLightIntensity(intensity) {
    lightIntensity = intensity;
    if (lightsOn) {
        lights.forEach((lightObj) => {
            lightObj.light.intensity = intensity;
            lightObj.mesh.material.emissiveIntensity = intensity;
        });
    }
}

// Function to toggle lights on/off
function toggleLights(on) {
    lightsOn = on;
    lights.forEach((lightObj) => {
        if (on) {
            lightObj.light.intensity = lightIntensity;
            lightObj.mesh.material.emissiveIntensity = lightIntensity;
            lightObj.mesh.material.emissive = 0xffffaa;
            lightObj.mesh.material.color = new THREE.Color(0xffffaa); // Keep color bright
        } else {
            lightObj.light.intensity = 0;
            lightObj.mesh.material.emissiveIntensity = 0;
            lightObj.mesh.material.emissive = 0x000000;
            lightObj.mesh.material.color = new THREE.Color(0x333333); // Dark gray when off
        }
    });
    
    // Update star texture based on lights state
    if (starMaterial) {
        if (on && yanukovychTexture) {
            // Use Yanukovych image when lights are on
            starMaterial.map = yanukovychTexture;
            starMaterial.color = new THREE.Color(0xffffff); // White to show texture colors
            starMaterial.emissive = new THREE.Color(0x000000); // No emissive to show texture better
            starMaterial.emissiveIntensity = 0;
            starMaterial.roughness = 0.5; // Less reflective to show texture
            starMaterial.metalness = 0.1; // Less metallic to show texture
            // Ensure texture is visible
            starMaterial.transparent = false;
        } else {
            // Use yellow color when lights are off
            starMaterial.map = null;
            starMaterial.color = new THREE.Color(0xffd700);
            starMaterial.emissive = new THREE.Color(0xffd700);
            starMaterial.emissiveIntensity = 0.5;
            starMaterial.roughness = 0.2;
            starMaterial.metalness = 0.8;
        }
        starMaterial.needsUpdate = true;
    }
}

// Animate lights
function animateLights() {
    if (!lightsOn) return;
    
    const time = Date.now() * 0.001;
    lights.forEach((lightObj, index) => {
        // Twinkling effect
        const intensity = lightIntensity * 0.6 + Math.sin(time * 2 + index) * lightIntensity * 0.4;
        lightObj.light.intensity = intensity;
        lightObj.mesh.material.emissiveIntensity = intensity;
        // Preserve the bright color when animating
        lightObj.mesh.material.color = new THREE.Color(0xffffaa);
        lightObj.mesh.material.emissive = new THREE.Color(0xffffaa);
    });
}

// Controls UI
const ballsSlider = document.getElementById('balls');
const lightsSlider = document.getElementById('lights');
const lollipopsSlider = document.getElementById('lollipops');
const treeHeightSlider = document.getElementById('tree-height');
const treeRadiusSlider = document.getElementById('tree-radius');
const starSizeSlider = document.getElementById('star-size');
const lightIntensitySlider = document.getElementById('light-intensity');
const rotationSpeedSlider = document.getElementById('rotation-speed');

const ballsValue = document.getElementById('balls-value');
const lightsValue = document.getElementById('lights-value');
const lollipopsValue = document.getElementById('lollipops-value');
const treeHeightValue = document.getElementById('tree-height-value');
const treeRadiusValue = document.getElementById('tree-radius-value');
const starSizeValue = document.getElementById('star-size-value');
const lightIntensityValue = document.getElementById('light-intensity-value');
const rotationSpeedValue = document.getElementById('rotation-speed-value');

ballsSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    ballsValue.textContent = value;
    updateDecorations(value, parseInt(lightsSlider.value), parseInt(lollipopsSlider.value));
});

lightsSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    lightsValue.textContent = value;
    updateDecorations(parseInt(ballsSlider.value), value, parseInt(lollipopsSlider.value));
    // Restore lights state after updating decorations
    toggleLights(lightsOn);
});

lollipopsSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    lollipopsValue.textContent = value;
    updateDecorations(parseInt(ballsSlider.value), parseInt(lightsSlider.value), value);
    // Restore lights state after updating decorations
    toggleLights(lightsOn);
});

// Tree size controls
treeHeightSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    treeHeightValue.textContent = value;
    updateTreeSize(value, treeRadius);
});

treeRadiusSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    treeRadiusValue.textContent = value;
    updateTreeSize(treeHeight, value);
});

// Star size control
starSizeSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    starSizeValue.textContent = value;
    updateStarSize(value);
});

// Light intensity control
lightIntensitySlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    lightIntensityValue.textContent = value;
    updateLightIntensity(value);
});

// Rotation speed control
rotationSpeedSlider.addEventListener('input', (e) => {
    const value = parseFloat(e.target.value);
    rotationSpeedValue.textContent = value;
    rotationSpeed = value;
});

// Lights toggle switch
const lightsToggle = document.getElementById('lights-on');
lightsToggle.addEventListener('change', (e) => {
    toggleLights(e.target.checked);
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Collapsible controls for mobile
const controlsPanel = document.getElementById('controls');
const controlsToggle = document.getElementById('controls-toggle');
const controlsContent = document.querySelector('.controls-content');

// Toggle controls panel
function toggleControls() {
    controlsPanel.classList.toggle('collapsed');
    controlsToggle.textContent = controlsPanel.classList.contains('collapsed') ? '▶' : '▼';
}

// Click on header or button to toggle
controlsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleControls();
});

document.querySelector('#controls h2').addEventListener('click', (e) => {
    if (e.target !== controlsToggle) {
        toggleControls();
    }
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    controls.update();
    animateLights();
    
    // Auto-rotation
    if (rotationSpeed > 0) {
        tree.rotation.y += rotationSpeed * 0.01;
        if (starGroup) {
            starGroup.rotation.y += rotationSpeed * 0.01;
        }
    }
    
    renderer.render(scene, camera);
}

animate();

