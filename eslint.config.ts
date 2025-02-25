import tsParser from "@typescript-eslint/parser";

export default [
    // Base configuration for all files
    {
        files: ["**/*.{js,ts}"],
        ignores: [
            "node_modules/**",
            "dist/**",
            "examples/dist/**",
        ],
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
            },
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": ["warn", {
                "varsIgnorePattern": "^_",
                "argsIgnorePattern": "^_",
                "caughtErrors": "none",
            }],
        },
    },

    // Rules for core utils
    {
        files: ["src/core/**/*.{js,ts}"],
        rules: {
            "no-unused-vars": ["warn", {
                "varsIgnorePattern": "^_",
                "argsIgnorePattern": "^_",
                "caughtErrors": "none",
            }],
        },
    },

    // More lenient rules for endpoints
    {
        files: ["src/endpoints/**/*.{js,ts}"],
        rules: {
            "no-unused-vars": ["warn", {
                "varsIgnorePattern": "^_",
                "argsIgnorePattern": "^_",
                "caughtErrors": "none",
            }],
        },
    },
];
