import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next already registers the jsx-a11y plugin for these files; only raise
    // its rules to strict. Plain .cjs config files are outside its scope and stay on the base rules.
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts}"],
    rules: {
      ...jsxA11y.flatConfigs.strict.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "lucide-react", message: "Use @phosphor-icons/react only." },
            { name: "react-icons", message: "Use @phosphor-icons/react only." },
            { name: "@heroicons/react", message: "Use @phosphor-icons/react only." },
          ],
        },
      ],
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["scripts/**/*.ts", "tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    ".content-collections/**",
    "public/content/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    ".impeccable/**",
  ]),
]);

export default eslintConfig;
