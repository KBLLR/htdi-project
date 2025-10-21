/**
 * A simple registry for Three.js scene objects for debugging and inspection.
 * Allows registering and accessing various scene components by category and name.
 */
export class SceneRegistry {
  constructor() {
    this.registry = {
      renderer: {},
      cameras: {},
      controls: {},
      lights: {},
      groups: {},
      meshes: {},
      materials: {},
      textures: {},
      loaders: {},
      mixers: {},
      videos: {}
    };
  }

  /**
   * Registers an item in the scene registry.
   * @param {string} category - The category of the item (e.g., 'cameras', 'lights').
   * @param {string} name - The unique name of the item within its category.
   * @param {object} data - The data to register, typically including a 'ref' to the Three.js object.
   */
  register(category, name, data) {
    if (!this.registry[category]) {
      this.registry[category] = {};
    }
    this.registry[category][name] = data;
  }

  /**
   * Retrieves an item or a category from the scene registry.
   * @param {string} category - The category of the item.
   * @param {string} [name] - The optional name of the item. If omitted, returns the entire category.
   * @returns {object|object.<string, object>|undefined} The registered data, category object, or undefined if not found.
   */
  get(category, name) {
    if (!this.registry[category]) {
      return undefined;
    }
    if (name) {
      return this.registry[category][name];
    }
    return this.registry[category];
  }

  /**
   * Returns the entire registry object.
   * @returns {object} The full scene registry.
   */
  getAll() {
    return this.registry;
  }
}