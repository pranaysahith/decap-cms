#!/usr/bin/env node
/**
 * Pre-publish script: Updates package.json files to use @pranaysahith scope
 * Run this AFTER build, BEFORE npm publish
 *
 * Usage: node scripts/prepare-publish.js
 * To revert: git checkout -- packages/
 */

const fs = require('fs');
const path = require('path');

const SCOPE = '@pranaysahith';
const PACKAGES_DIR = path.join(__dirname, '..', 'packages');

// Get all package directories
const packageDirs = fs.readdirSync(PACKAGES_DIR).filter(dir => {
  const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
  return fs.existsSync(pkgPath);
});

// Build map of old name -> new name for all decap packages
const nameMap = {};
packageDirs.forEach(dir => {
  const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldName = pkg.name;
  // Only scope packages that start with decap
  if (oldName.startsWith('decap')) {
    nameMap[oldName] = `${SCOPE}/${oldName}`;
  }
});

console.log(`Preparing ${Object.keys(nameMap).length} packages for publishing under ${SCOPE} scope\n`);

// Update dependencies
function updateDeps(deps) {
  if (!deps) return deps;
  const updated = {};
  for (const [name, version] of Object.entries(deps)) {
    updated[nameMap[name] || name] = version;
  }
  return updated;
}

// Update each package.json
packageDirs.forEach(dir => {
  const pkgPath = path.join(PACKAGES_DIR, dir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const oldName = pkg.name;

  if (!nameMap[oldName]) return;

  // Update name
  pkg.name = nameMap[oldName];

  // Update dependencies
  pkg.dependencies = updateDeps(pkg.dependencies);
  pkg.devDependencies = updateDeps(pkg.devDependencies);
  pkg.peerDependencies = updateDeps(pkg.peerDependencies);

  // Set public access for scoped packages
  pkg.publishConfig = { access: 'public' };

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`✓ ${oldName} → ${pkg.name}`);
});

console.log(`
✅ All packages prepared!

Next steps:
1. npm login (if not logged in)
2. npx lerna publish from-package --no-private

To revert changes: git checkout -- packages/
`);
