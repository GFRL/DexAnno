export function loadOBJ(scene, url, callback, config){
    const loader = new window.THREE.OBJLoader();

    const defaultConfig = {
        color: 0x2194CE,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0x333333,//deep gray
        emissiveIntensity: 0.5,
        transparent: false,
        opacity: 1.0,
    };
    const mergedConfig = { ...defaultConfig, ...config };
    loader.load(url, (object) => {
        object.traverse((child) => {
            if (child.isMesh) {
                child.material = new THREE.MeshStandardMaterial({
                    color: mergedConfig.color,
                    roughness: mergedConfig.roughness,
                    metalness: mergedConfig.metalness,
                    emissive: mergedConfig.emissive,
                    emissiveIntensity: mergedConfig.emissiveIntensity,
                    transparent: mergedConfig.transparent,
                    opacity: mergedConfig.opacity,
                });

                if(!child.geometry.attributes.normal){
                    child.geometry.computeVertexNormals();
                }
            }
        });
        scene.add(object);
        if (callback) callback(object);
    }, undefined, (error) => {
        console.error('An error happened', error);
    });
}

export function loadOBJFromContent(scene, content, callback, config) {
    const loader = new window.THREE.OBJLoader();

    const defaultConfig = {
        color: 0x2194CE,
        roughness: 0.3,
        metalness: 0.8,
        emissive: 0x333333,//deep gray
        emissiveIntensity: 0.5,
        transparent: false,
        opacity: 1.0,
    };
    const mergedConfig = { ...defaultConfig, ...config };
    const object = loader.parse(content);
    object.traverse((child) => {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
                color: mergedConfig.color,
                roughness: mergedConfig.roughness,
                metalness: mergedConfig.metalness,
                emissive: mergedConfig.emissive,
                emissiveIntensity: mergedConfig.emissiveIntensity,
                transparent: mergedConfig.transparent,
                opacity: mergedConfig.opacity,
            });

            if(!child.geometry.attributes.normal){
                child.geometry.computeVertexNormals();
            }
        }
    });
    scene.add(object);
    if (callback) callback(object);
}