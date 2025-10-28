Today's date is Monday, October 27, 2025

## Performance Optimization Opportunities

The codebase has several potential areas for performance optimization, primarily centered around asset management and Three.js rendering.

**Key Areas for Optimization:**

1.  **Asset Optimization (High Impact):**
    *   **Model Formats:** Convert FBX models to GLTF, and ensure all GLTF models utilize Draco compression. The `public/draco` directory suggests Draco is available, but its integration with `GLTFLoader` should be verified.
    *   **Texture Optimization:** Convert photographic PNG images to more efficient formats like WebP or AVIF. Ensure all images are optimally compressed. Consider using KTX2/Basis Universal for advanced texture compression.
    *   **Texture Atlases:** Combine small, frequently used textures (e.g., gobos, particles) into atlases to reduce draw calls.
    *   **Unused Assets:** Identify and remove any assets listed in `src/config/assets.js` that are not actively used.

2.  **Critical Path Rendering & Loading:**
    *   **Decouple UI from 3D Experience:** The `createExperience()` call in `src/main.js` is a blocking operation. Explore initializing and rendering non-3D UI elements earlier to improve perceived load time.
    *   **Progressive Loading:** Enhance the preloading mechanism (`src/controllers/Preloader.js`) to provide more granular progress feedback during asset loading.
    *   **Character Loading:** Implement background preloading for characters or a clear loading indicator when switching between them, as `setCharacter` currently loads them on demand.

3.  **Three.js Rendering Optimizations:**
    *   **Shadows:** Optimize shadow map resolutions (e.g., reduce `1024x1024` for less critical lights), consider different shadow map types, and implement frustum/shadow culling.
    *   **Instancing:** Utilize `THREE.InstancedMesh` for repeated geometries (e.g., the `outer_Mesh` sphere if multiple are rendered).
    *   **Shader Complexity:** Review custom materials and water shaders for potential simplification.
    *   **Geometry Detail:** Reduce polygon count for objects that are distant or have less visual importance.
    *   **Post-processing:** While effects like Bloom and Depth of Field are disabled by default, ensure their parameters are optimized if enabled, and provide user controls to toggle them.
    *   **Memory Management:** Rigorously verify that `dispose()` methods are called for all Three.js resources (geometries, materials, textures, render targets) when objects are removed or scenes change to prevent memory leaks.

4.  **Bundle Size Reduction:**
    *   **Tree Shaking & Code Splitting:** Confirm Vite is effectively tree-shaking unused code. Consider manual code splitting for large, non-critical modules or scenes.
    *   **Dependency Review:** Re-evaluate the necessity of all third-party dependencies listed in `package.json` to identify any that could be removed or replaced with lighter alternatives.

5.  **Runtime Performance:**
    *   **Custom Cursor:** Monitor the performance of the custom cursor's DOM manipulations; consider a CSS-only solution if it becomes a bottleneck.
    *   **Animation & Tweens:** Ensure all animations are optimized and not causing excessive computations.
    *   **Event Listener Management:** Verify that event listeners are properly added and removed to prevent memory leaks.

These areas represent the most significant opportunities to improve the application's performance, especially its initial load time and real-time rendering frame rates.