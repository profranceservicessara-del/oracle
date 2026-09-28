import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes unitários das regras de negócio puras (datas fiscais, recorrência,
// cálculo de documento). Rodam nos dois fusos que importam: Paris (quem usa) e
// UTC (servidor da Vercel). Ver scripts test e test:utc.
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: { include: ["src/**/*.test.ts"], environment: "node" }
});
