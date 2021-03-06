/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

'use strict';

const {resolve} = require('path');
const {chmod, cp, mkdir, mv, rm, test} = require('shelljs');
const zonePackageJson = require('../../packages/zone.js/package.json');
const {baseDir, bazelBin, bazelCmd, exec, scriptPath} = require('./package-builder');


module.exports = {
  buildZoneJsPackage,
};

/**
 * Build the `zone.js` npm package into `dist/bin/packages/zone.js/npm_package/` and copy it to
 * `destPath` for other scripts/tests to use.
 *
 * NOTE: The `zone.js` package is not built as part of `package-builder`'s `buildTargetPackages()`
 *       nor is it copied into the same directory as the Angular packages (e.g.
 *       `dist/packages-dist/`) despite its source's being inside `packages/`, because it is not
 *       published to npm under the `@angular` scope (as happens for the rest of the packages).
 *
 * @param {string} destPath Path to the output directory into which we copy the npm package.
 *     This path should either be absolute or relative to the project root.
 */
function buildZoneJsPackage(destPath) {
  console.info('##############################');
  console.info(`${scriptPath}:`);
  console.info('  Building zone.js npm package');
  console.info('##############################');
  exec(`${bazelCmd} build //packages/zone.js:npm_package`);

  // Create the output directory.
  const absDestPath = resolve(baseDir, destPath);
  if (!test('-d', absDestPath)) mkdir('-p', absDestPath);

  // Copy artifacts to `destPath`, so they can be easier persisted on CI and used by non-bazel
  // scripts/tests.
  const buildOutputDir = `${bazelBin}/packages/zone.js/npm_package`;
  const distTargetDir = `${absDestPath}/zone.js`;

  // Also create an archive so we can test the package itself.
  // Currently, the `npm_package.pack` rule does not work on Windows, so run `npm pack` directly.
  //
  // TODO: Switch to `npm_package.pack`, once we upgrade to `bazelbuild/rules_nodejs` >=2.3.0.
  exec(`npm pack ${buildOutputDir}`, false, {cwd: baseDir});

  console.info(`# Copy npm_package artifacts to ${distTargetDir}`);
  rm('-rf', distTargetDir);
  cp('-R', buildOutputDir, distTargetDir);
  chmod('-R', 'u+w', distTargetDir);

  // Copy `zone.js.tgz` to `destPath`, so we can test
  // the archive generated by the `npm_package.pack` rule.
  const distArchiveTargetDir = `${absDestPath}/archive`;
  console.info(`# Copy npm_package archive file to ${distArchiveTargetDir}`);
  rm('-rf', distArchiveTargetDir);
  mkdir('-p', distArchiveTargetDir);
  mv(`${baseDir}/zone.js-${zonePackageJson.version}.tgz`, `${distArchiveTargetDir}/zone.js.tgz`);

  console.info('');
}
