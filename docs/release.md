# Immutable package releases

Run checks, tests and builds from the committed lockfile. Tag the verified commit with `v<package-version>`. The GitHub Actions workflow verifies the tag, repeats the build, packs once, then publishes the **same tarball and integrity** to GitHub Packages and npm. npm publishing uses GitHub OIDC; GitHub Packages publishing uses the workflow's package write permission.

The first npm release bootstraps the package from a maintainer CLI session after `npm login --auth-type=web`, with `GH_PACKAGES_TOKEN` set for the GitHub mirror. After that release creates the npm package, configure this repository's `package.yml` workflow as its trusted GitHub Actions publisher in npm. Subsequent releases use OIDC and need no long-lived npm token.

A rerun accepts an already published version only if its tarball integrity is identical; different bytes require a new version. README is included in the package, so consumer documentation changes receive a patch release. Consumers may install from npm without configuring a registry; KICE continues to use GitHub Packages for the shared private/public scope.
