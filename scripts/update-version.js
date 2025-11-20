#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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
    versionData = JSON.parse(content);
  } catch (error) {
    console.error('Error reading version file:', error);
  }
}

// Parse current version
const [year, month, build] = versionData.version.split('.').map(Number);

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

