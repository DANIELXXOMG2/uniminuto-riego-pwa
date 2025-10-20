import js from "@eslint/js";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  // Base recommended rules
  js.configs.recommended,

  // TypeScript rules
  ...tseslint.configs.recommendedTypeChecked,

  // Configuration
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    rules: {
      // Mantén tus reglas personalizadas
      quotes: ["error", "double"],
      indent: ["error", 2],
      "import/no-unresolved": 0,
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Disable type-checking for JS files
  {
    files: ["**/*.js", "**/*.mjs"],
    ...tseslint.configs.disableTypeChecked,
  },

  // Ignore patterns
  {
    ignores: [
      "lib/**",
      "generated/**",
      "node_modules/**",
      "eslint.config.mjs", // Ignore config file itself
    ],
  }
);
