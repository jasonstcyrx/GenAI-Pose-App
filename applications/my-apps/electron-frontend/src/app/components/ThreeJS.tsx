// src/app/components/ThreeJS.tsx

import { Stack, CircularProgress } from '@mui/material';
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const ThreeJSPlayground: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const modelPath = 'assets/models/skeleton/scene.gltf'; // Ensure this path is correct

    // Loading state for the model
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!mountRef.current) return;

        // Scene
        const scene = new THREE.Scene();

        // Set Background Color
        scene.background = new THREE.Color(0x1e1e1e); // Dark gray

        // Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            mountRef.current.clientWidth / mountRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 5);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // Renderer Encoding
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        // renderer.gammaFactor = 2.2; // Deprecated in newer Three.js versions
        mountRef.current.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(5, 5, 5).normalize();
        scene.add(directionalLight);

        // OrbitControls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.25;
        controls.enableZoom = true;

        // Load GLTF Model
        const loader = new GLTFLoader();
        let model: THREE.Object3D | null = null;
        let transformControls: TransformControls | null = null;

        loader.load(
            modelPath,
            (gltf) => {
                model = gltf.scene;

                // Ensure Model Materials are Correctly Loaded
                // Ensure Model Materials are Correctly Loaded
                model.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;

                        // Check if the material is an array
                        if (Array.isArray(mesh.material)) {
                            mesh.material = mesh.material.map((material) => {
                                const clonedMaterial = material.clone();

                                // Optional: Override material properties if needed
                                if (clonedMaterial instanceof THREE.MeshStandardMaterial) {
                                    clonedMaterial.side = THREE.DoubleSide;

                                    // Ensure textures use sRGB color space
                                    if (clonedMaterial.map) {
                                        clonedMaterial.map.colorSpace = THREE.SRGBColorSpace;
                                        clonedMaterial.map.needsUpdate = true;
                                    }
                                    if (clonedMaterial.emissiveMap) {
                                        clonedMaterial.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                                        clonedMaterial.emissiveMap.needsUpdate = true;
                                    }
                                }

                                return clonedMaterial;
                            });
                        } else if (mesh.material) {
                            // Clone single material
                            mesh.material = mesh.material.clone();

                            // Optional: Override material properties if needed
                            if (mesh.material instanceof THREE.MeshStandardMaterial) {
                                mesh.material.side = THREE.DoubleSide;

                                // Ensure textures use sRGB color space
                                if (mesh.material.map) {
                                    mesh.material.map.colorSpace = THREE.SRGBColorSpace;
                                    mesh.material.map.needsUpdate = true;
                                }
                                if (mesh.material.emissiveMap) {
                                    mesh.material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
                                    mesh.material.emissiveMap.needsUpdate = true;
                                }
                            }
                        }
                    }
                });

                model.scale.set(1, 1, 1); // Adjust scale if needed
                scene.add(model);

                // Initialize TransformControls
                transformControls = new TransformControls(camera, renderer.domElement);
                transformControls.attach(model);
                transformControls.setMode('rotate'); // Modes: 'translate', 'rotate', 'scale'
                scene.add(transformControls as unknown as THREE.Object3D);

                // Enable user interaction for rotation
                transformControls.addEventListener('dragging-changed', (event: any) => {
                    controls.enabled = !event.value;
                });

                setIsLoading(false); // Model has loaded
            },
            undefined,
            (error) => {
                console.error('Error loading the model:', error);
                setIsLoading(false); // Even on error, stop loading indicator
            }
        );

        // Handle Window Resize with Debounce
        const handleResize = () => {
            if (!mountRef.current) return;
            const width = mountRef.current.clientWidth;
            const height = mountRef.current.clientHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };

        // Debounce Resize Handler
        const debounce = (func: () => void, wait: number) => {
            let timeout: NodeJS.Timeout;
            return () => {
                clearTimeout(timeout);
                timeout = setTimeout(func, wait);
            };
        };

        const debouncedHandleResize = debounce(handleResize, 100);
        window.addEventListener('resize', debouncedHandleResize);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Cleanup
        return () => {
            window.removeEventListener('resize', debouncedHandleResize);
            mountRef.current?.removeChild(renderer.domElement);
            renderer.dispose();

            controls.dispose();
            if (transformControls) transformControls.dispose();

            // Dispose scene objects
            scene.traverse((object) => {
                if (!(object instanceof THREE.Mesh)) return;
                object.geometry.dispose();
                if (Array.isArray(object.material)) {
                    object.material.forEach((material) => material.dispose());
                } else {
                    object.material.dispose();
                }
            });
        };
    }, [modelPath]);

    return (
        <Stack flexGrow={1} height="100%" position="relative">
            {isLoading && (
                <CircularProgress
                    size={60}
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1,
                    }}
                />
            )}
            <Stack ref={mountRef} flexGrow={1} />
        </Stack>
    );
};

export default ThreeJSPlayground;