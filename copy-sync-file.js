const fs = require('fs');
const path = require('path');

// Source and destination paths
const sourcePath = path.join(__dirname, 'unitodo.sync.md');
const destPath = path.join(__dirname, 'public', 'unitodo.sync.md');

// Check if the source file exists
if (fs.existsSync(sourcePath)) {
  try {
    // Make sure the public directory exists
    const publicDir = path.join(__dirname, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Copy the file
    fs.copyFileSync(sourcePath, destPath);
    console.log(`Successfully copied unitodo.sync.md to public directory.`);
  } catch (error) {
    console.error(`Error copying file: ${error.message}`);
    process.exit(1);
  }
} else {
  console.warn(`Warning: unitodo.sync.md not found at ${sourcePath}`);
  console.warn(`Run 'cargo run' to generate the file first.`);
} 