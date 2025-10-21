import { DirectionalLight, PointLight, Vector3, Group } from 'three';

export function createDirectional(options = {}) {
  const {
    intensity = 1.2,
    color = 0xffffff,
    position = new Vector3(6, 8, 6),
    castShadow = true,
  } = options;

  const light = new DirectionalLight(color, intensity);
  light.position.copy(position);
  light.castShadow = castShadow;
  if (castShadow) {
    const cam = light.shadow.camera;
    cam.near = 0.5;
    cam.far = 100;
    cam.left = -15;
    cam.right = 15;
    cam.top = 15;
    cam.bottom = -15;
    light.shadow.mapSize.set(1024, 1024);
  }
  return light;
}

export function createRotatingPoints({
  count = 3,
  radius = 4.5,
  height = 2.0,
  baseIntensity = 1.2,
  decay = 2,
  distance = 30,
} = {}) {
  const group = new Group();
  const items = [];

  for (let i = 0; i < count; i++) {
    const light = new PointLight(0xffe6b3, baseIntensity, distance, decay);
    light.position.set(
      Math.cos((i / count) * Math.PI * 2) * radius,
      height,
      Math.sin((i / count) * Math.PI * 2) * radius
    );
    light.castShadow = false;
    group.add(light);
    items.push({ ref: light, orbitRadius: radius, speed: 0.25 + i * 0.05, phase: (i / count) * Math.PI * 2 });
  }

  function update(dt) {
    for (const it of items) {
      it.phase += dt * it.speed;
      it.ref.position.x = Math.cos(it.phase) * it.orbitRadius;
      it.ref.position.z = Math.sin(it.phase) * it.orbitRadius;
    }
  }

  return { group, items, update };
}

export function attachLightsToScene(scene) {
  const directional = createDirectional();
  scene.add(directional);

  const rp = createRotatingPoints();
  scene.add(rp.group);

  return {
    directional: { ref: directional },
    rotatingPoints: rp.items,
    update: rp.update,
  };
}