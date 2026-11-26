// Copies the design system (the visual source of truth in /design) into the static
// prototype under public/prototype, so the prototype pages keep working without a
// second, drifting copy being committed. Runs automatically before `dev` and `build`.
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const target = `${root}public/prototype/design`;

await rm(target, { recursive: true, force: true });
await mkdir(target, { recursive: true });
for (const item of ["tokens.css", "components.css", "fonts"]) {
  await cp(`${root}design/${item}`, `${target}/${item}`, { recursive: true });
}
console.log("Design system synced to public/prototype/design");
