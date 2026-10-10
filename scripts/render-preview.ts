import { mkdir, writeFile } from "node:fs/promises";
import { renderShareImage } from "../dist/index.js";
import { previewCards } from "../src/preview.fixture.ts";
await mkdir("docs/images", { recursive: true });
for (const [name, content] of Object.entries(previewCards))
  await writeFile(`docs/images/${name}.png`, await renderShareImage(content));
