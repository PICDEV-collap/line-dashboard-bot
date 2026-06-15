import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

// Next 16 removed `next lint`, so ESLint runs directly via flat config.
// FlatCompat bridges the eslintrc-style shareable configs from eslint-config-next.
const eslintConfig = [
  {
    ignores: [".next/**", "node_modules/**", "public/**", "coverage/**"],
  },
  ...compat.config({
    extends: ["next/core-web-vitals", "next/typescript"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": "off",
    },
  }),
];

export default eslintConfig;
