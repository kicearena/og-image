import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const packed = JSON.parse(
  execFileSync("npm", ["pack", "--json"], { encoding: "utf8" }),
)[0];
let existing;
try {
  existing = JSON.parse(
    execFileSync(
      "npm",
      ["view", `${pkg.name}@${pkg.version}`, "dist.integrity", "--json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
} catch (error) {
  if (!String(error.stderr).includes("E404"))
    throw new Error(
      "Registry release lookup failed; check authentication and registry availability.",
    );
}
if (existing) {
  if (existing !== packed.integrity)
    throw new Error(
      "Published version has different bytes. Release a new version; never replace an existing version.",
    );
  console.log(
    "Verified the identical published release:",
    pkg.name,
    pkg.version,
  );
} else {
  execFileSync("npm", ["publish", packed.filename], { stdio: "inherit" });
}
