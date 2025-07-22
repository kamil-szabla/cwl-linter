#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Only attempt to install CLI when installed globally
function setupCLI() {
  try {
    // Check if this is a global installation
    const npmRoot = execSync('npm root -g').toString().trim();
    const currentPath = path.resolve(__dirname, '..');
    
    // Only proceed with npm link if installed globally
    if (currentPath.startsWith(npmRoot)) {
      console.log('Setting up CWL Linter CLI...');
      
      // Make the CLI script executable
      const cliPath = path.join(currentPath, 'bin', 'cwl-linter.js');
      fs.chmodSync(cliPath, '755');
      
      // Create symlinks without using npm link (which requires admin privileges)
      const binDir = path.join(npmRoot, '..', '.bin');
      const targetPath = path.join(binDir, 'cwl-linter');
      
      // Create symlink if it doesn't exist
      if (!fs.existsSync(targetPath)) {
        fs.symlinkSync(cliPath, targetPath, 'file');
        console.log('CWL Linter CLI installed successfully');
      }
    } else {
      // Local installation - no need to set up CLI
      console.log('Local installation detected, skipping CLI setup');
    }
  } catch (error) {
    // Don't fail installation if CLI setup fails
    console.log('Note: CWL Linter CLI setup skipped');
    console.log('To use the CLI, run: node ./bin/cwl-linter.js');
  }
}

setupCLI();
