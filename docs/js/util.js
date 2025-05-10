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

export function createRuler(actualLengthCM){
    const ruler = new THREE.Group();
    const scaleFactor = 40; // 与obj.scale.multiplyScalar(40)保持一致
    
    // 计算视觉长度（实际厘米转米后乘以缩放倍数）
    const visualLength = (actualLengthCM / 100) * scaleFactor; // 10cm → 0.1m*40=4m
    
    // 主线（红色圆柱）
    const geometry = new THREE.CylinderGeometry(0.05, 0.05, visualLength, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const line = new THREE.Mesh(geometry, material);
    line.rotation.z = Math.PI/2; // 水平放置
    
    // 文字标注（显示实际尺寸）
    const loader = new THREE.FontLoader();
    loader.load('https://cdn.jsdelivr.net/npm/three@0.132.2/examples/fonts/helvetiker_regular.typeface.json', (font) => {
        const textGeometry = new THREE.TextGeometry(
            `${actualLengthCM} cm`, 
            {
                font: font,
                size: 0.5,
                height: 0.1
            }
        );
        const textMesh = new THREE.Mesh(textGeometry, material);
        textMesh.position.set(visualLength/2 + 0.5, 0, 0); // 文字偏移量
        ruler.add(textMesh);
    });

    ruler.add(line);

    // 3. 初始定位（屏幕下方）
    ruler.position.set(0, -8, 0); // 初始位置（屏幕下方）
    
    return ruler;
}