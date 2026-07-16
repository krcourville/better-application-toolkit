import { defineConfig } from "vite-plus";

export default defineConfig({
  lint: {
    categories: {
      correctness: "error",
      pedantic: "warn",
      perf: "warn",
      style: "warn",
      suspicious: "warn",
    },
    overrides: [
      {
        files: ["**/*.test.ts"],
        rules: {
          // A describe() block isn't a "function" in the sense max-lines-per-function targets; it's a test-grouping callback that naturally grows with test count.
          "max-lines-per-function": "off",
        },
      },
    ],
    rules: {
      eqeqeq: "error",
      "func-style": ["warn", "declaration"],
      // Rejected: forces meaningless placeholder initializers on vars that are legitimately assigned later (e.g. Vitest fixtures reset in beforeEach).
      "init-declarations": "off",
      // Rejected: arbitrary per-file class-count threshold, no correctness value.
      "max-classes-per-file": "off",
      "max-lines": ["warn", { max: 500 }],
      // Rejected: arbitrary statement-count threshold, no correctness value.
      "max-statements": "off",
      "no-template-curly-in-string": "error",
      // Rejected: ternaries are fine in this codebase.
      "no-ternary": "off",
      // Rejected: many async functions here satisfy an interface/handler signature that must stay async.
      "require-await": "off",
      // Declaration order (by syntax type) conflicts with the formatter's alphabetical-by-path ordering; only check within-line member sort.
      "sort-imports": ["warn", { ignoreDeclarationSort: true }],
      "typescript/no-misused-promises": "error",
      // Rejected: fights this codebase's this.constructor.name pattern (15 AppError subclasses derive .name for free).
      "unicorn/custom-error-definition": "off",
      // Rejected: this codebase's types/APIs use null intentionally (e.g. nullable response fields).
      "unicorn/no-null": "off",
      // Rejected: irreconcilable with the formatter, which normalizes hex digits to lowercase every run; this rule wants uppercase, so --fix oscillates forever.
      "unicorn/number-literal-case": "off",
    },
  },
  run: {
    cache: {
      scripts: true,
      tasks: true,
    },
  },
});
