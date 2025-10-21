# Project Overview: HTDI Project

This project, "Hard To Debug Issues Project," is a web application focused on creating interactive 3D and WebGL experiences. It serves as a platform for various experiments in creative coding, leveraging libraries such as Three.js, Postprocessing, and other animation and UI tools. The application features dynamic 3D scenes, VR support, a custom cursor, and interactive UI elements for scene selection, deployment viewing, and music playback.

## Technologies Used

*   **Frontend:** HTML, CSS, JavaScript (ES Modules)
*   **Build Tool:** Vite
*   **3D Graphics:** Three.js, Postprocessing
*   **UI/Styling:** Radix UI colors, custom CSS, Tippy.js (for tooltips)
*   **Animation:** GSAP, Tween.js, Popmotion
*   **Asset Management:** Custom asset registry, GLTF, FBX, video textures
*   **Backend (API):** Vercel serverless functions (for deployment data)

## Architecture Highlights

*   **Entry Point:** `src/main.js` orchestrates the initialization of the 3D experience, UI components, and global event listeners.
*   **3D Experience:** `src/app/experience.js` contains the core Three.js setup, including scene, camera, lighting, model loading (FBX, GLTF), animations, and post-processing effects (Bloom, Depth of Field). It also includes VR integration.
*   **Asset Configuration:** `src/config/assets.js` defines a structured manifest for various project assets, including images, 3D models, fonts, and environment maps.
*   **Scene Management:** `src/data/scenes.js` defines different interactive 3D scenes with their unique environmental, material, and UI configurations.
*   **Preloading:** `src/controllers/Preloader.js` manages the loading of initial assets and application setup.
*   **Modular UI:** UI components like `deploymentTimelineUI.js`, `scenePickerUI.js`, and `musicPlayerUI.js` are organized within `src/modules`.
*   **API Integration:** `api/vercel-deployments.mjs` provides a serverless function to fetch Vercel deployment data, which is then visualized in the UI.

## Building and Running

The project uses `npm` scripts for common development tasks.

*   **Development Server:**
    ```bash
    npm run dev
    ```
    Starts a development server with Vite, typically accessible at `http://localhost:5175`.
*   **Build for Production:**
    ```bash
    npm run build
    ```
    Compiles and bundles the project for production, outputting files to the `dist` directory.
*   **Preview Production Build:**
    ```bash
    npm run preview
    ```
    Serves the production build locally for testing.
*   **Start Development Server (Alias):**
    ```bash
    npm run start
    ```
    An alias for `npm run dev`.
*   **Linting:**
    ```bash
    npm run lint
    ```
    Runs ESLint to check JavaScript files in the `src` directory for code quality and style issues.
*   **Testing:**
    ```bash
    npm run test
    ```
    Currently, this command is a placeholder and indicates that no specific tests are configured.

## Development Conventions

*   **Module System:** The project utilizes ES Modules (`import`/`export`).
*   **Tooling:** Vite is the primary build tool and development server. ESLint is used for code linting.
*   **3D Development:** Three.js is central to the project's interactive 3D aspects, with a clear separation of concerns for scene creation and management.
*   **UI/UX:** Custom CSS, Radix UI colors, and Tippy.js are used for styling and interactive elements. A custom cursor enhances the user experience.
*   **Asset Organization:** Assets are categorized and managed through `src/config/assets.js` and loaded via `src/modules/assetRegistry.js`.
*   **Modals:** A consistent modal system is implemented for displaying various information and interactive panels.
