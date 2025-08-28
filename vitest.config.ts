import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    typecheck: {
      enabled: true,
      tsconfig: "./tsconfig.vitest.json",
    },
    coverage: {
      include: ["src/**"],
      exclude: ["*.spec-d.ts"],
    },
  },
});
