import {loadOBJFromContent } from "./util.js";
class SceneController{
    constructor(){
        this.appState = {
            obj_config: {
                url: './assets/debug/original.obj',
                obj_material_config: { color: 0x2194CE, roughness: 0.5, metalness: 0.5 },
                obj_content: null,
                hand_content: null,
                hand_material_config: { color: 0x98FB98, roughness: 0.5, metalness: 0.5 },
                meta: null,
            },
            ui_config:{
                selectedType: null,
                selectedPoint: null,
                button_config_path:'./js/config.json'
            },
            meta:{
                raw_state: "QueryObj",
                query_id: null
            } 
        }
        this.initscene()
        this.initWindow()
        this.initUI()

        this.targetObject = null;
        this.QueryObj()
    }
    initscene(){
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true , alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xEEEEEE); // set light gray background
        document.body.appendChild(this.renderer.domElement);
        // 添加光源
        const ambientLight = new THREE.AmbientLight(0xEEEEEE, 0.3); // 环境光
        this.scene.add(ambientLight);
        const lightPositions = [
            [10, 10, 10],[-10, -10, -10],[10, -10, -10],[-10, 10, -10],
            [10, 10, -10],[-10, -10, 10],[10, -10, 10],[-10, 10, 10]
        ];
        lightPositions.forEach(pos => {
            const light = new THREE.DirectionalLight(0xffffff, 0.3);
            light.position.set(...pos);
            this.scene.add(light);
        });
        // 相机位置
        this.camera.position.z = 15;
        this.camera.contrast = 1.5; // 设置对比度
        // 添加控制器
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.enableDamping = true;
        // this.controls.dampingFactor = 0.0;
        // 高亮标记
        this.highlightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        this.highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.highlightSphere = new THREE.Mesh(this.highlightGeometry, this.highlightMaterial);
        this.scene.add(this.highlightSphere);
        this.highlightSphere.visible = false;
        // 射线检测器
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        // load OBJ model
        //create a line with 10cm length in document
        const p1 = new THREE.Vector3(-2, 0, 0).project(this.camera);
        const p2 = new THREE.Vector3(2, 0, 0).project(this.camera);
        this.basePixelLength = Math.abs(p2.x - p1.x);
        this.baseDistance=this.camera.position.length();
    }
    updateRuler(){
        const nowdistance = this.camera.position.length();
        const length = this.basePixelLength * (this.baseDistance/nowdistance)*window.innerWidth/2;
        document.getElementById("scale_line").style.width= `${length}px`;
    }
    initWindow(){
        window.addEventListener('contextmenu', (event) => {
            event.preventDefault(); // avoid the default context menu
            if (!this.targetObject) return; 
            // Get mouse position in normalized device coordinates
            this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
        
            this.raycaster.setFromCamera(this.mouse, this.camera);
            
            // check if the ray intersects with the object
            const intersects = this.raycaster.intersectObject(this.targetObject, true);
            if (intersects.length > 0) {
                const point = intersects[0].point;
                this.highlightSphere.position.copy(point);
                this.highlightSphere.visible = true;
                this.appState.ui_config.selectedPoint = point
                
                // 添加动画效果
                document.getElementById('point-coord').textContent = `(${point.x.toFixed(2)}, ${point.y.toFixed(2)}, ${point.z.toFixed(2)})`;
            }
        })
        // 窗口自适应
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    async QueryObj(){
        this.appState.obj_config.obj_content = null;
        this.appState.obj_config.hand_content = null;
        try{
            const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
            this.appState.meta.query_id = timestamp;
            const payload = {
                metadata: {
                    query_id: timestamp,
                    raw_state: this.appState.meta.raw_state,
                    userAgent: navigator.userAgent
                },
            };
            const response = await fetch('https://emerging-stork-primarily.ngrok-free.app/api/annotations', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if ('busynum' in result){
                document.getElementById('user-count').textContent = result.busynum;
            }
            if (result.success) {
                this.appState.obj_config.obj_content = result.data.objdata           
                this.ReloadObj(); // Reload the object after successful submission
                this.appState.meta.raw_state = "QueryHand";
                //将HTML里面的"Get Grasp","Skip"按钮改成"Success","Fail"
                document.querySelectorAll('.action-btn').forEach(btn => {
                    const actionType = btn.dataset.action;
                    btn.textContent = actionType === 'success' ? 'Get Grasp' : 'Skip';
                });
            } else {
                console.error("QueryObj failed:", result.message);
                //wait for 5 seconds and try again
                setTimeout(() => {
                    this.QueryObj();
                }, 5000);
                // this.QueryObj();
            }
        }catch(error){
            console.error('QueryObj error:', error);
            //wait for 5 seconds and try again
            setTimeout(() => {
                this.QueryObj();
            }, 5000);
            // this.QueryObj();
        }
    }
    async QueryHand(){
        try{
            //check raw_state
            if(this.appState.meta.raw_state != "QueryHand"){
                console.log("QueryHand error: raw_state is not QueryHand");
                return;
            }

            //禁用按钮
            document.querySelectorAll('.action-btn').forEach(btn => {
                btn.disabled = true;
                btn.style.opacity = 0.5;
            });

            const timestamp = this.appState.meta.query_id;  
            const payload = {
                metadata: {
                    query_id: timestamp,
                    raw_state: this.appState.meta.raw_state,
                    userAgent: navigator.userAgent,
                    annotation: {
                        point: {
                            x: this.appState.ui_config.selectedPoint.x / 40,
                            y: this.appState.ui_config.selectedPoint.y / 40,
                            z: this.appState.ui_config.selectedPoint.z / 40
                        },
                        type: this.appState.ui_config.selectedType
                    }
                },
            };
            const response = await fetch('https://emerging-stork-primarily.ngrok-free.app/api/annotations', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if ('busynum' in result){
                document.getElementById('user-count').textContent = result.busynum;
            }
            if (result.success) {
                this.appState.obj_config.hand_content = result.data.handdata    
                // console.log("QueryHand success:", this.appState.obj_config.obj_content);      
                this.ReloadObj(); // Reload the object after successful submission
                this.appState.meta.raw_state = "Annotate";
                document.querySelectorAll('.action-btn').forEach(btn => {
                    const actionType = btn.dataset.action;
                    btn.textContent = actionType === 'success' ? 'Success' : 'Fail';
                });
            } else {
                console.error("QueryHand failed:", result.message);
                //wait for 5 seconds and try again
                alert("QueryHand failed, please reannotate!");
                this.resetState(); // Reset the state after failed submission
                // this.QueryObj();
            }
        }catch(error){
            console.error('QueryHand error:', error);
            //wait for 5 seconds and try again
            // setTimeout(() => {
            //     this.QueryHand();
            // }, 5000);
            this.resetState();
            // this.QueryObj();
        }
    }
    ReloadObj(){
        if (this.targetObject) {
            this.scene.remove(this.targetObject);
            this.targetObject = null;
        }
        if (this.targetHand) {
            this.scene.remove(this.targetHand);
            this.targetHand = null;
        }

        if (this.appState.obj_config.obj_content) {
            loadOBJFromContent(this.scene, this.appState.obj_config.obj_content, (obj) => {
                this.targetObject = obj;
                obj.scale.multiplyScalar(40); // 缩放
                this.targetObject.rotation.set(0, 0, 0); // 设置旋转
                this.targetObject.position.set(0, 0, 0); // 设置位置
            }, this.appState.obj_config.obj_material_config);
        }
        else{
            alert("No object data received, please check the server!");
            setTimeout(() => {
                this.QueryObj();
            }, 5000);
        }
        if (this.appState.obj_config.hand_content) {
            loadOBJFromContent(this.scene, this.appState.obj_config.hand_content, (obj) => {
                this.targetHand = obj;
                obj.scale.multiplyScalar(40); // 缩放
                this.targetHand.rotation.set(0, 0, 0); // 设置旋转
                this.targetHand.position.set(0, 0, 0); // 设置位置
            }, this.appState.obj_config.hand_material_config);
        }
        this.resetState(); // Reset the state after loading a new object
    }
    async loaduiconfig(){
        try{
            const response = await fetch(this.appState.ui_config.button_config_path);   
            return await response.json();
        }catch(error){
            console.error('Error loading UI config:', error);
            return {
                types: [
                    { id: 1, name: '默认类型A' },
                    { id: 2, name: '默认类型B' }
                ],
                actions: [
                    { type: 'success', label: '成功', color: '#4CAF50' },
                    { type: 'fail', label: '失败', color: '#F44336' }
                ]
            };
        }
    }
    async initUI(){
        const config = await this.loaduiconfig();
        //clear the old UI
        ['type-container', 'action-container'].forEach(className => {
            const existing = document.querySelector(`.${className}`);
            if (existing) existing.remove();
        });
        // 类型选择按钮
        const typeContainer = document.createElement('div');
        typeContainer.style.position = 'fixed';
        typeContainer.style.right = '20px';
        typeContainer.style.top = '20px';

        const typeButtonsHTML = config.types.map(type => `
            <div style="display: flex; align-items: center; gap: 8px;">
                <button 
                    data-type="${type.name}"
                    class="type-btn"
                    style="
                        width: 80px; /* 充满容器 */
                        height: 80px;
                        padding: 0;
                        border: 2px solid #3AF2DA;
                        border-radius: 12px;
                        background: rgba(255,255,255,0.9);
                        cursor: pointer;
                        overflow: hidden;
                        flex-shrink: 0; /* 禁止按钮缩小 */
                    ">
                    <img 
                        src="${type.icon}" 
                        alt="${type.name}" 
                        style="
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            pointer-events: none;
                        ">
                </button>
                <div style="
                    flex: 1;
                    font-size: 20px; 
                    line-height: 1.4; 
                ">
                    ${type.description}
                </div>
            </div>
        `).join('');

        typeContainer.innerHTML = `
            <div style="
                background: rgba(58, 242, 218, 0.9);
                padding:15px;
                border-radius:8px;
                box-shadow:0 2px 10px rgba(0,0,0,0.1);
                width: 400px; /* 固定宽度 */
            ">
                <div style="
                    margin-bottom:10px;
                    font-weight:bold;
                    white-space: nowrap; /* 防止标题换行 */
                ">
                    Grasp Type / Suitable Object Type
                </div>
                <div style="
                    height: 1px;
                    background-color: black;
                    margin: 8px 0;
                "></div>
                <div class="scroll-container" style="
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    max-height: 60vh;
                    overflow-y: auto;
                ">
                    ${typeButtonsHTML}
                </div>
            </div>
        `;
        document.body.appendChild(typeContainer);

        // 操作按钮
        const actionContainer = document.createElement('div');
        actionContainer.style.position = 'fixed';
        actionContainer.style.right = '20px';
        actionContainer.style.bottom = '20px';
        const actionButtonsHTML = config.actions.map(action => `
            <button class="action-btn" 
                    data-action="${action.type}"
                    style="background:${action.color}; padding:8px 16px; border:none; border-radius:4px;">
                ${action.label}
            </button>
        `).join('');

        actionContainer.innerHTML = `
            <div style="background: rgba(255,255,255,0.9); padding:15px; border-radius:8px; box-shadow:0 2px 10px rgba(0,0,0,0.1); display:flex; gap:10px;">
                ${actionButtonsHTML}
            </div>
        `;

        document.body.appendChild(actionContainer);
        // 事件绑定
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', this.handleTypeSelect.bind(this));
        });
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', this.handleAction.bind(this));
        });
    }
    handleTypeSelect(event) {
        const button = event.currentTarget;
        const typeId = event.target.dataset.type;
        this.appState.ui_config.selectedType = typeId;
        
        // 更新按钮状态
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.style.background = btn.dataset.type === typeId ? '#2196F3' : '#f0f0f0';
            btn.style.color = btn.dataset.type === typeId ? 'white' : 'black';
        });
        
        const coordElem = document.getElementById('coord-panel');
        coordElem.querySelector('#current-type').textContent = `Type ${typeId}`;

    }
    async SendAnnotation(type){
        try{
            //check raw_state
            const timestamp = this.appState.meta.query_id;  
            const payload = {
                metadata: {
                    query_id: timestamp,
                    raw_state: "Annotate",
                    Anno_type: type,
                    userAgent: navigator.userAgent
                },
            };
            const response = await fetch('https://emerging-stork-primarily.ngrok-free.app/api/annotations', {
                method: 'POST',
                mode: 'cors',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            if ('busynum' in result){
                document.getElementById('user-count').textContent = result.busynum;
            }
        }catch(error){
            console.error('SendAnnotation error:', error);
        }
        this.appState.meta.raw_state = "QueryObj";
        this.appState.obj_config.obj_content = null; // Clear the object content after submission
        this.appState.obj_config.hand_content = null; // Clear the hand content after submission
        this.QueryObj(); // Reload the object after successful submission
        
    }
    async handleAction(event) {
        const actionType = event.target.dataset.action;
        if(this.appState.meta.raw_state == "QueryHand"){
            if (actionType === 'success') {
                if(!this.appState.ui_config.selectedPoint){
                    alert('right click to select a point first!')
                    return;
                }
                if(!this.appState.ui_config.selectedType){
                    alert('select a type first!')
                    return;
                }
                console.log('Send QueryHand:', this.appState.ui_config.selectedPoint, this.appState.ui_config.selectedType);
                this.QueryHand(); // 发送数据到服务器
            }
            else if (actionType === 'fail') {
                this.SendAnnotation('skip'); // 发送数据到服务器
            }
        }
        else if(this.appState.meta.raw_state == "Annotate"){
            if (actionType === 'success') {
                this.SendAnnotation('success'); // 发送数据到服务器
            }
            else if (actionType === 'fail') {
                this.SendAnnotation('fail'); // 发送数据到服务器
            }
        }
    }
    resetState() {
        this.appState.ui_config.selectedType = null;
        this.appState.ui_config.selectedPoint = null;
        this.highlightSphere.visible = false;
        document.querySelectorAll('.type-btn').forEach(btn => {
            btn.style.background = '#f0f0f0';
            btn.style.color = 'black';
        });
        //启用按钮
        document.querySelectorAll('.action-btn').forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = 1;
        });

        const coordElem = document.getElementById('coord-panel');
        coordElem.querySelector('#current-type').textContent = 'None';
        document.getElementById('point-coord').textContent = 'None';
    }
    

}




// 创建场景控制器实例
const sceneController = new SceneController();


// 动画循环
function animate() {
    requestAnimationFrame(animate);
    sceneController.updateRuler();
    sceneController.controls.update();
    sceneController.renderer.render(sceneController.scene, sceneController.camera);
}
animate();