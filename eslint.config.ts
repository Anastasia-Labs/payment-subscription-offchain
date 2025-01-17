export default [
    {
        files: ["**/*.js"],
        ignores: [
            "node_modules/**",
            "dist/**",
            "examples/dist/**",
        ],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            "no-unused-vars": ["warn", { "varsIgnorePattern": "_" }],
            "no-console": "off",
        },
    },
];
