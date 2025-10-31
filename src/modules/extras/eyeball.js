const container = document.querySelector('.container');

let config = {
  zoomLevel: 600,
  zoomLevelBounds: [100, 1000],
  shrink: 0,
  fstBaseColor: '#03565c',
  scdBaseColor: '#42cf44',
  midColor: '#f2aa00',
  vignette: .65,
  brightness: .6,
  darkness: .5,
};


class Controls {
  constructor() {
    this.gui = new GUI();
    this.shrinkContol = this.gui.add(viz.eyeShaderMaterial.uniforms.u_shrink, 'value', -0.9, 0.3, 0.05).name('shrink');
    this.gui.addColor({ color: config.fstBaseColor }, 'color').onChange(v => {
      viz.eyeShaderMaterial.uniforms.u_base_color_1.value = new THREE.Color(v);
    }).name('base color #1');
    this.gui.addColor({ color: config.scdBaseColor }, 'color').onChange(v => {
      viz.eyeShaderMaterial.uniforms.u_base_color_2.value = new THREE.Color(v);
    }).name('base color #2');
    this.gui.addColor({ color: config.midColor }, 'color').onChange(v => {
      viz.eyeShaderMaterial.uniforms.u_mid_color.value = new THREE.Color(v);
    }).name('middle color');
    this.gui.add(viz.eyeShaderMaterial.uniforms.u_vignette, 'value', 0, 1, 0.05).name('vignette');
    this.gui.add(viz.eyeShaderMaterial.uniforms.u_brightness, 'value', 0.2, 0.65, 0.05).name('brightness');
    this.gui.add(viz.eyeShaderMaterial.uniforms.u_darkness, 'value', 0, 1, 0.05).name('darkness');
  }
}

class Animations {
  constructor() {
    this.playShrink = gsap.timeline({
      paused: true,
      onUpdate: () => {
        controls.shrinkContol.setValue(viz.eyeShaderMaterial.uniforms.u_shrink.value)
      }
    })
      .timeScale(2)
      .to(viz.eyeShaderMaterial.uniforms.u_shrink, {
        duration: .5,
        value: -.9,
        ease: 'power2.out'
      })
      .to(viz.eyeShaderMaterial.uniforms.u_shrink, {
        duration: 3,
        value: 0,
        ease: 'power2.inOut'
      });

    this.eyeAppear = gsap.timeline({
      paused: true
    })
      .from(viz.eyeGroup.position, {
        duration: 2,
        y: 1000,
        ease: 'power4.out'
      })
      .from(viz.eyeGroup.rotation, {
        duration: 2,
        x: 25,
        z: 5,
        ease: 'power3.out'
      }, 0)
      .from(viz.shadowMesh.scale, {
        duration: 2,
        x: 2.5,
      }, 0)
  }

}

class Viz {

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.eyeGroup = new THREE.Group();
    this.eyeRadius = 30;
    this.camera = new THREE.PerspectiveCamera(20, window.innerWidth / window.innerHeight, 1, 10000);

    this.mouse = new THREE.Vector2(0, 0);
    this.setupScene();
    this.createEyeball();
    this.createShadow();
    this.render();
  }

  setupScene() {
    this.scene.background = new THREE.Color(0xffffff);
    this.setCameraPosition(config.zoomLevel);

    const ambientLight = new THREE.AmbientLight(0x999999, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(-1, 1, 1);
    this.scene.add(directionalLight);
  }

  setCameraOffsetY() {
    this.camera.position.y = window.innerWidth > 800 ? 0 : 25;
  }

  setCameraPosition(cp) {
    this.camera.position.z = cp;
    this.setCameraOffsetY();
    config.zoomLevel = cp;
  }

  createEyeball() {
    const eyeBallTexture = new THREE.TextureLoader().load('https://ksenia-k.com/img/eyeball.jpg');
    const eyeAddonGeometry = new THREE.SphereGeometry(this.eyeRadius, 32, 32);
    const eyeAddonMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      emissive: 0x220000,
      opacity: .25,
      shininess: 100,
      transparent: true,
      map: eyeBallTexture
    });
    const eyeAddon = new THREE.Mesh(eyeAddonGeometry, eyeAddonMaterial);
    this.eyeGroup.add(eyeAddon);

    const eyeGeometry = new THREE.SphereGeometry(this.eyeRadius - .1, 32, 32);
    this.eyeShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        u_shrink: { type: 'f', value: config.shrink },
        u_base_color_1: { type: 'v3', value: new THREE.Color(config.fstBaseColor) },
        u_base_color_2: { type: 'v3', value: new THREE.Color(config.scdBaseColor) },
        u_mid_color: { type: 'v3', value: new THREE.Color(config.midColor) },
        u_vignette: { type: 'f', value: config.vignette },
        u_brightness: { type: 'f', value: config.brightness },
        u_darkness: { type: 'f', value: config.darkness },
      },
      vertexShader: document.getElementById('vertexShader').textContent,
      fragmentShader: document.getElementById('fragmentShader').textContent,
    });
    const eye = new THREE.Mesh(eyeGeometry, this.eyeShaderMaterial);
    eye.rotation.y = -Math.PI / 2;
    this.eyeGroup.add(eye);

    this.scene.add(this.eyeGroup);
  }

  createShadow() {
    const canvas = document.createElement('canvas');
    const canvasSize = canvas.width = canvas.height = this.eyeRadius * 2.5;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(canvasSize * .5, canvasSize * .5, 0, canvasSize * .5, canvasSize * .5, canvasSize * 0.4);
    gradient.addColorStop(0.2, 'rgba(210,210,210,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,1)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shadowTexture = new THREE.CanvasTexture(canvas);
    const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowTexture });
    const shadowGeo = new THREE.PlaneBufferGeometry(canvasSize, canvasSize, 1, 1);
    this.shadowMesh = new THREE.Mesh(shadowGeo, shadowMaterial);
    this.shadowMesh.position.y = - 2 * this.eyeRadius;
    this.shadowMesh.rotation.x = - Math.PI / 2.05;
    this.scene.add(this.shadowMesh);
  }

  addCanvasEvents() {
    container.addEventListener('wheel', (e) => {
      config.zoomLevel += (0.1 * e.deltaY);
      config.zoomLevel = Math.min(config.zoomLevel, config.zoomLevelBounds[1]);
      config.zoomLevel = Math.max(config.zoomLevel, config.zoomLevelBounds[0]);
      viz.setCameraPosition(config.zoomLevel);
    });
    container.querySelector('canvas').addEventListener('click', () => {
      animations.playShrink.play(0);
    });
    container.addEventListener('mousemove', (e) => {
      updateMousePosition(e.clientX, e.clientY, this);
    });
    container.addEventListener('touchmove', (e) => {
      updateMousePosition(e.touches[0].pageX, e.touches[0].pageY, this);
    });
    function updateMousePosition(eX, eY, viz) {
      viz.mouse = {
        x: (eX - viz.windowHalf.x) / viz.windowHalf.x,
        y: (eY - viz.windowHalf.y) / viz.windowHalf.y
      };
    }
  }

  render() {
    this.eyeGroup.rotation.x += (this.mouse.y * 0.3 - this.eyeGroup.rotation.x) * .2;
    this.eyeGroup.rotation.y += (this.mouse.x * 0.6 - this.eyeGroup.rotation.y) * .2;
    this.renderer.render(this.scene, this.camera);
  }

  loop() {
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  }

  updateSize() {
    this.windowHalf = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.setCameraOffsetY();
  }
}

const viz = new Viz();
const controls = new Controls();
const animations = new Animations();

viz.updateSize();
viz.addCanvasEvents();

window.addEventListener('resize', () => viz.updateSize());
viz.loop();

animations.eyeAppear.play(0);
