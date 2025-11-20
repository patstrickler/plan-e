#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

try {
  const rootDir = path.join(__dirname, '..');
  const versionFile = path.join(rootDir, 'version.json');
  const publicVersionFile = path.join(rootDir, 'public', 'version.json');

  // Read current version
  let versionData = {
    version: '2025.01.1',
    lastUpdated: new Date().toISOString()
  };

  if (fs.existsSync(versionFile)) {
    try {
      const content = fs.readFileSync(versionFile, 'utf8');
      const parsed = JSON.parse(content);
      if (parsed && parsed.version) {
        versionData = parsed;
      }
    } catch (error) {
      console.warn('Warning: Error reading version file, using default:', error.message);
    }
  }

  // Parse current version
  const versionParts = versionData.version.split('.');
  if (versionParts.length !== 3) {
    throw new Error(`Invalid version format: ${versionData.version}. Expected format: YYYY.MM.BUILD`);
  }

  const [year, month, build] = versionParts.map(Number);
  
  if (isNaN(year) || isNaN(month) || isNaN(build)) {
    throw new Error(`Invalid version format: ${versionData.version}. All parts must be numbers.`);
  }

  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11

  // Determine new version
  let newVersion;
  if (year === currentYear && month === currentMonth) {
    // Same month - increment build number
    newVersion = `${currentYear}.${String(currentMonth).padStart(2, '0')}.${build + 1}`;
  } else {
    // Different month - reset to 1
    newVersion = `${currentYear}.${String(currentMonth).padStart(2, '0')}.1`;
  }

  // Update version data
  const updatedVersionData = {
    version: newVersion,
    lastUpdated: now.toISOString()
  };

  // Ensure public directory exists
  const publicDir = path.join(rootDir, 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Write updated version to both locations
  fs.writeFileSync(versionFile, JSON.stringify(updatedVersionData, null, 2) + '\n');
  fs.writeFileSync(publicVersionFile, JSON.stringify(updatedVersionData, null, 2) + '\n');

  console.log(`Version updated: ${versionData.version} -> ${newVersion}`);
  process.exit(0);
} catch (error) {
  console.error('Error updating version:', error.message);
  console.error(error.stack);
  process.exit(1);
}

