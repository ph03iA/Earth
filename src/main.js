import * as THREE from 'three';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import getStarfield from "./getStarfield.js";
import { getFresnelMat } from "./getFresnelMat.js";

let camera, scene, renderer, controls, clock;

// Create canvas element if it doesn't exist
let canvas = document.querySelector("canvas.threejs");
if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.classList.add('threejs');
    document.body.appendChild(canvas);
}

// Initialize the scene
function init() {
    // Initialize clock
    clock = new THREE.Clock();

    // Renderer setup
    renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

    // Camera setup
    camera = new THREE.PerspectiveCamera(25, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(4.5, 2, 3);

    // Scene setup
    scene = new THREE.Scene();

    // Lighting setup
    const sun = new THREE.DirectionalLight('#ffffff', 2);
    sun.position.set(0, 0, 3);
    scene.add(sun);

    // Controls setup
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.maxDistance = 300;
    controls.minDistance = 2;

    // Earth group
    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.4 * Math.PI / 180;
    scene.add(earthGroup);

    // Earth mesh
    const detail = 12;
    const loader = new THREE.TextureLoader();
    const geometry = new THREE.IcosahedronGeometry(1, detail);
    const material = new THREE.MeshPhongMaterial({
        map: loader.load("textures/8k_earth_daymap.jpg"),
        specularMap: loader.load("textures/8k_earth_specular_map.jpg"),
        bumpMap: loader.load("textures/8081_earthbump10k.jpg"),
        bumpScale: 0.09,
    });
    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    // Lights mesh
    const lightsMat = new THREE.MeshBasicMaterial({
        map: loader.load("textures/8081_earthlights10k.jpg"),
        blending: THREE.AdditiveBlending,
        transparent: true, // Enable transparency
        opacity: 0,       // Start with lights off
    });
    const lightsMesh = new THREE.Mesh(geometry, lightsMat);
    earthGroup.add(lightsMesh);

    // Clouds mesh
    const cloudsMat = new THREE.MeshStandardMaterial({
        map: loader.load("textures/8k_earth_clouds.jpg"),
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
        alphaMap: loader.load('textures/8k_earth_clouds.jpg'),
    });
    const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
    cloudsMesh.scale.setScalar(1.003);
    earthGroup.add(cloudsMesh);

    // Fresnel (atmosphere glow) mesh
    const fresnelMat = getFresnelMat();
    const glowMesh = new THREE.Mesh(geometry, fresnelMat);
    glowMesh.scale.setScalar(1.01);
    earthGroup.add(glowMesh);

    // Stars
    const stars = getStarfield({ numStars: 2000 });
    scene.add(stars);

    // GUI controls
    const gui = new GUI();
    const params = {
        rotationSpeed: 0.025,
        cloudsSpeed: 0.027,
        starsSpeed: 0.002,
        sunIntensity: 2.0
    };

    gui.add(params, 'rotationSpeed', 0, 0.1).name('Earth Rotation');
    gui.add(params, 'cloudsSpeed', 0, 0.1).name('Clouds Speed');
    gui.add(params, 'starsSpeed', 0, 0.01).name('Stars Speed');
    gui.add(params, 'sunIntensity', 0, 5).name('Sun Intensity').onChange((value) => {
        sun.intensity = value;
    });

    // Animation
    function animate() {
        requestAnimationFrame(animate);

        // Get delta time
        const delta = clock.getDelta();

        // Update controls
        controls.update();

        // Rotate meshes with delta time
        earthMesh.rotation.y += delta * params.rotationSpeed;
        lightsMesh.rotation.y += delta * params.rotationSpeed;
        cloudsMesh.rotation.y += delta * params.cloudsSpeed;
        glowMesh.rotation.y += delta * params.rotationSpeed;
        stars.rotation.y -= delta * params.starsSpeed;

        // Day/Night Cycle Logic (Opacity-Based)
        const dotProduct = sun.position.clone().normalize().dot(new THREE.Vector3(0, 0, 1));

        // Map the dot product to an opacity value between 0 and 1.
        // Use a smoothstep function for a smoother transition.
        let opacity = THREE.MathUtils.smoothstep(dotProduct, -0.4, 0.1);  // Adjust these values

        // Set the opacity of the lights material.
        lightsMesh.material.opacity = opacity;

        // Render
        renderer.render(scene, camera);
    }

    // Start animation
    animate();
}

// Window resize handler
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Add event listener
window.addEventListener('resize', onWindowResize);

// Initialize the scene
init();
