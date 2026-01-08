import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/*.ts", "!**/*.{spec,spec-d}.ts"],
  tsconfig: "./tsconfig.src.json",
  target: "esnext",
  platform: "neutral",
  sourcemap: true,
  dts: true,
});
