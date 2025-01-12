import * as React from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import DxfParser from 'dxf-parser';
import styles from './ThreeJsViewer.module.scss';

interface IThreeJsViewerProps {
  stlPath: string;
  width: number;
  height: number;
}

interface IThreeJsViewerState {
  isLoading: boolean;
}

export default class ThreeJsViewer extends React.Component<IThreeJsViewerProps, IThreeJsViewerState> {
  private mount: React.RefObject<HTMLDivElement>;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: OrbitControls | null = null;
  private frameId: number | null = null;

  constructor(props: IThreeJsViewerProps) {
    super(props);
    this.mount = React.createRef();
    this.state = {
      isLoading: true
    };
  }

  componentDidMount() {
    this.initScene();
    this.loadModel();
  }

  private initScene() {
    if (!this.mount.current) return;

    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(75, this.props.width / this.props.height, 0.1, 1000);
    this.camera.position.z = 5;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.props.width, this.props.height);
    this.mount.current.appendChild(this.renderer.domElement);

    // Controls setup
    if (this.camera && this.renderer) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
    }

    // Lighting
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1);
    this.scene.add(light);

    const ambientLight = new THREE.AmbientLight(0x404040);
    this.scene.add(ambientLight);

    this.animate();
  }

  private loadModel() {
    const fileExtension = this.props.stlPath.split('.').pop()?.toLowerCase();
    
    switch(fileExtension) {
      case 'stl':
        this.loadSTL();
        break;
      case 'obj':
        this.loadOBJ();
        break;
      case 'dxf':
        this.loadDXF();
        break;
      default:
        console.error('Unsupported file format');
        this.setState({ isLoading: false });
    }
  }

  private loadSTL() {
    const loader = new STLLoader();
    
    loader.load(
      this.props.stlPath,
      (geometry) => {
        if (!this.scene) return;

        const material = new THREE.MeshPhongMaterial({
          color: 0x00ff00,
          specular: 0x111111,
          shininess: 200
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Center the model
        geometry.computeBoundingBox();
        const center = new THREE.Vector3();
        geometry.boundingBox?.getCenter(center);
        geometry.center();
        
        this.scene.add(mesh);
        this.setState({ isLoading: false });

        this.fitCameraToObject(geometry);
      },
      (xhr) => {
        // Progress callback if needed
      },
      (error) => {
        console.error('Error loading STL:', error);
        this.setState({ isLoading: false });
      }
    );
  }

  private loadOBJ() {
    const loader = new OBJLoader();
    
    loader.load(
      this.props.stlPath,
      (object) => {
        if (!this.scene) return;

        // Применяем материал ко всем частям объекта
        object.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshPhongMaterial({
              color: 0x00ff00,
              specular: 0x111111,
              shininess: 200
            });
          }
        });

        // Центрируем объект
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        object.position.sub(center);
        
        this.scene.add(object);
        this.setState({ isLoading: false });

        // Подгоняем камеру под размер объекта
        this.fitCameraToObject(object);
      },
      (xhr) => {
        // Progress callback if needed
      },
      (error) => {
        console.error('Error loading OBJ:', error);
        this.setState({ isLoading: false });
      }
    );
  }

  private loadDXF() {
    fetch(this.props.stlPath)
      .then(response => response.text())
      .then(data => {
        if (!this.scene) return;

        const parser = new DxfParser();
        const dxf = parser.parseSync(data);
        
        if (!dxf || !dxf.entities) {
          console.error('Invalid DXF data');
          this.setState({ isLoading: false });
          return;
        }

        console.log('DXF parsed:', dxf);

        const material = new THREE.LineBasicMaterial({
          color: 0x000000,
          linewidth: 1
        });

        const group = new THREE.Group();

        // Функция для обработки сущностей
        const processEntities = (entities: any[]) => {
          entities.forEach((entity: any) => {
            console.log('Processing entity:', entity);
            
            if (entity.type === 'LINE') {
              const geometry = new THREE.BufferGeometry();
              const vertices = new Float32Array([
                entity.startPoint.x || 0, entity.startPoint.y || 0, entity.startPoint.z || 0,
                entity.endPoint.x || 0, entity.endPoint.y || 0, entity.endPoint.z || 0
              ]);
              geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
              const line = new THREE.Line(geometry, material);
              group.add(line);
            }
            else if (entity.type === 'LWPOLYLINE' || entity.type === 'POLYLINE') {
              if (entity.vertices && entity.vertices.length > 1) {
                const points = entity.vertices.map((v: any) => 
                  new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0)
                );
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, material);
                group.add(line);
              }
            }
            else if (entity.type === 'INSERT') {
              console.log('Processing INSERT:', entity);
              const blockName = entity.name || entity.block;
              const block = dxf.blocks[blockName];
              
              if (block) {
                console.log('Found block:', block);
                const blockGroup = new THREE.Group();
                
                if (block.entities) {
                  processEntities(block.entities);
                }

                // Применяем трансформации
                if (entity.position) {
                  blockGroup.position.set(
                    entity.position.x || 0,
                    entity.position.y || 0,
                    entity.position.z || 0
                  );
                }
                
                if (entity.rotation) {
                  blockGroup.rotation.z = (entity.rotation * Math.PI) / 180;
                }
                
                if (entity.scale) {
                  const scale = typeof entity.scale === 'number' ? entity.scale : 1;
                  blockGroup.scale.set(scale, scale, scale);
                }

                group.add(blockGroup);
              } else {
                console.warn('Block not found:', blockName);
              }
            }
          });
        };

        // Обрабатываем все сущности
        processEntities(dxf.entities);

        // Центрируем и добавляем группу
        const box = new THREE.Box3().setFromObject(group);
        const center = box.getCenter(new THREE.Vector3());
        group.position.sub(center);
        
        group.rotation.x = -Math.PI / 2;
        
        this.scene.add(group);
        this.setState({ isLoading: false });
        
        this.fitCameraToObject(group);
      })
      .catch(error => {
        console.error('Error loading DXF:', error);
        this.setState({ isLoading: false });
      });
  }

  private fitCameraToObject(object: THREE.Object3D | THREE.BufferGeometry) {
    if (!this.camera) return;

    let boundingBox: THREE.Box3;
    
    if (object instanceof THREE.BufferGeometry) {
      boundingBox = object.boundingBox || new THREE.Box3().setFromObject(new THREE.Mesh(object));
    } else {
      boundingBox = new THREE.Box3().setFromObject(object);
    }

    const size = boundingBox.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = this.camera.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / Math.sin(fov / 2));
    this.camera.position.z = cameraZ * 1.5;
    this.camera.updateProjectionMatrix();
  }

  private animate = () => {
    if (this.controls) this.controls.update();
    
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
    
    this.frameId = window.requestAnimationFrame(this.animate);
  };

  componentWillUnmount() {
    if (this.frameId !== null) {
      window.cancelAnimationFrame(this.frameId);
    }
    if (this.mount.current && this.renderer) {
      this.mount.current.removeChild(this.renderer.domElement);
    }
  }

  render() {
    return (
      <div ref={this.mount} className={styles.viewerContainer}>
        {this.state.isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner}>↻</div>
            <div>Loading model...</div>
          </div>
        )}
      </div>
    );
  }
}