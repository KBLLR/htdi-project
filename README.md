# HTDI Project

This project, "Hard To Debug Issues Project," is a web application focused on creating interactive 3D and WebGL experiences. It serves as a platform for various experiments in creative coding, leveraging libraries such as Three.js, Postprocessing, and other animation and UI tools.

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

Make sure you have Node.js and npm installed.

### Installation

1.  Clone the repo:
    ```bash
    git clone https://github.com/your-username/htdi-project.git
    ```
2.  Navigate to the project directory:
    ```bash
    cd htdi-project
    ```
3.  Install NPM packages:
    ```bash
    npm install
    ```

### Running the Development Server

```bash
npm run dev
```

This will start a development server, typically accessible at `http://localhost:5175`.

## Architecture Highlights

*   **Entry Point:** `src/main.js` orchestrates the initialization of the 3D experience, UI components, and global event listeners.
*   **3D Experience:** `src/world/index.js` contains the core Three.js setup, including scene, camera, lighting, model loading (FBX, GLTF), animations, and post-processing effects (Bloom, Depth of Field). It also includes VR integration.
*   **WebGPU/WebGL Dual Pipeline:** NEW! `src/world/core/rendererFactory.js` provides automatic WebGPU detection with WebGL fallback. See `WEBGPU_POSTPROCESSING.md` for details.
*   **Postprocessing Manager:** `src/world/postprocessing/PostProcessingManager.js` provides a unified interface for both WebGL (pmndrs/postprocessing) and WebGPU (TSL-based) rendering pipelines.
*   **Asset Configuration:** `src/config/assetCatalog.js` defines a structured manifest for various project assets, including images, 3D models, fonts, and environment maps.
*   **Scene Management:** `src/data/scenes.js` defines different interactive 3D scenes with their unique environmental, material, and UI configurations.
*   **Preloading:** `src/controllers/Preloader.js` manages the loading of initial assets and application setup.
*   **Modular UI:** UI components like `deploymentTimelineUI.js`, `scenePickerUI.js`, and `musicPlayerUI.js` are organized within `src/modules`.
*   **API Integration:** `api/vercel-deployments.mjs` provides a serverless function to fetch Vercel deployment data, which is then visualized in the UI.
*   **LeAgentDiary Integration:** `src/integrations/leAgentDiaryBridge.js` provides scene export/import with Zod schema validation for diary-based stage management.
