export default [
    {
        ignores: ["node_modules/**", "dist/**"],
    },
    {
        files: ["**/*.js"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
        },
        rules: {
            // Add your desired rules here
            "no-unused-vars": ["warn", { "varsIgnorePattern": "_" }],
            "no-console": "off",
            // ...other rules
        },
    },
];
