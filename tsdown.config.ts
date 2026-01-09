import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts", "src/handlers/*.ts", "!**/*.{spec,spec-d,bench}.ts"],
  tsconfig: "./tsconfig.src.json",
  target: "esnext",
  platform: "neutral",
  sourcemap: true,
  dts: true,
});
