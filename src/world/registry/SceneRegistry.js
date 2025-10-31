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
      characters: {},
      videos: {},
      postprocessing: {},
      particles: {}
    };
    this.listeners = new Set();
    this.categoryListeners = new Map();
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
    this.notify(category, name, data);
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

  /**
   * Subscribe to all register events.
   * @param {(event: { category: string, name: string, data: object }) => void} handler
   * @returns {() => void} Cleanup function.
   */
  onRegister(handler) {
    if (typeof handler !== 'function') return () => {};
    this.listeners.add(handler);
    return () => this.listeners.delete(handler);
  }

  /**
   * Subscribe to register events for a specific category.
   * @param {string} category
   * @param {(event: { category: string, name: string, data: object }) => void} handler
   * @returns {() => void} Cleanup function.
   */
  onRegisterCategory(category, handler) {
    if (!category || typeof handler !== 'function') return () => {};
    const key = category.toString();
    const subscribers = this.categoryListeners.get(key) ?? new Set();
    subscribers.add(handler);
    this.categoryListeners.set(key, subscribers);
    return () => {
      const set = this.categoryListeners.get(key);
      if (!set) return;
      set.delete(handler);
      if (set.size === 0) {
        this.categoryListeners.delete(key);
      }
    };
  }

  notify(category, name, data) {
    if (this.listeners.size > 0) {
      for (const handler of this.listeners) {
        try {
          handler({ category, name, data });
        } catch (error) {
          console.error('SceneRegistry listener failed', error);
        }
      }
    }

    const subscribers = this.categoryListeners.get(category);
    if (subscribers?.size) {
      for (const handler of subscribers) {
        try {
          handler({ category, name, data });
        } catch (error) {
          console.error(`SceneRegistry listener failed for category "${category}"`, error);
        }
      }
    }
  }
}
