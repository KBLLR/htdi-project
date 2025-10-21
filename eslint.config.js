import globals from "globals";
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        THREE: 'readonly',
        gsap: 'readonly',
        GUI: 'readonly',
        Stats: 'readonly',
        dat: 'readonly',
        random: 'readonly',
        hsl: 'readonly',
      }
    }
  }
];
