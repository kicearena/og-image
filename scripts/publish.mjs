import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const registries = [
  { name: "npm", url: "https://registry.npmjs.org" },
  { name: "GitHub Packages", url: "https://npm.pkg.github.com" },
];
const githubToken = process.env.GH_PACKAGES_TOKEN;
if (!githubToken)
  throw new Error(
    "GH_PACKAGES_TOKEN is required to publish the GitHub Packages mirror.",
  );

const publishDir = mkdtempSync(join(tmpdir(), "kice-package-publish-"));
const githubUserConfig = join(publishDir, "github.npmrc");

try {
  const packed = JSON.parse(
    execFileSync("npm", ["pack", "--pack-destination", publishDir, "--json"], {
      encoding: "utf8",
    }),
  )[0];
  const tarball = join(publishDir, packed.filename);
  writeFileSync(
    githubUserConfig,
    "registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}\n",
  );

  for (const registry of registries) {
    const env = { ...process.env };
    if (registry.name === "GitHub Packages") {
      env.NPM_CONFIG_USERCONFIG = githubUserConfig;
      env.NODE_AUTH_TOKEN = githubToken;
    } else {
      delete env.NODE_AUTH_TOKEN;
    }

    let existing;
    try {
      existing = JSON.parse(
        execFileSync(
          "npm",
          [
            "view",
            `${pkg.name}@${pkg.version}`,
            "dist.integrity",
            "--json",
            "--registry",
            registry.url,
          ],
          {
            cwd: publishDir,
            env,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"],
          },
        ),
      );
    } catch (error) {
      if (!String(error.stderr).includes("E404"))
        throw new Error(
          `${registry.name} release lookup failed; check authentication and registry availability.`,
        );
    }

    if (existing) {
      if (existing !== packed.integrity)
        throw new Error(
          `${registry.name} already has different bytes for this version; release a new version.`,
        );
      console.log(`Verified ${registry.name} release:`, pkg.name, pkg.version);
      continue;
    }

    execFileSync(
      "npm",
      ["publish", tarball, "--access", "public", "--registry", registry.url],
      { cwd: publishDir, env, stdio: "inherit" },
    );
  }
} finally {
  rmSync(publishDir, { recursive: true, force: true });
}
