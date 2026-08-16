// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
	{
		ignores: [
			"build/",
			"node_modules/",
			"web/",
			"src/generated/",
			"scripts/",
			"*.config.*",
			"*.mjs",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["src/**/*.ts"],
		languageOptions: {
			globals: { ...globals.node },
		},
		rules: {
			// TypeScript already reports undefined variables; no-undef does not
			// understand TS type-only imports.
			"no-undef": "off",

			// Repo conventions (AGENTS.md) surfaced as warnings: the legacy
			// codebase still carries a backlog of these; new code should not add
			// more. Promoted to errors once the backlog is cleared.
			"no-console": "warn",
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/ban-ts-comment": "warn",

			// High-value, low-noise: keep these as errors.
			"@typescript-eslint/no-unused-vars": [
				"error",
				{ argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
			],
		},
	},
);
