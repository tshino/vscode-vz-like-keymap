import js from "@eslint/js";
import globals from "globals";

export default [
js.configs.recommended,
{
    languageOptions: {
        globals: {
            ...globals.node,
            ...globals.mocha,
        },

        ecmaVersion: 13,
        sourceType: "module",

        parserOptions: {
            ecmaFeatures: {
                jsx: true,
            },
        },
    },
    rules: {
        "no-unused-vars": [ "warn", {
            "argsIgnorePattern": "^_",
            "caughtErrorsIgnorePattern": "^_"
        } ],
        "consistent-return": "warn",
        "curly": "warn",
        "eqeqeq": "warn",
        "guard-for-in": "warn",
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-wrappers": "error",
        "no-return-assign": "warn",
        "no-sequences": "warn",
        "no-unused-expressions": "warn",
        "no-var": "warn",
        "no-useless-concat": "warn",
        "radix": "warn",
    },
}, {
    ignores: [
        ".vscode-test/",
        "dist/",
    ],
}];