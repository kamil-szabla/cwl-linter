#!/usr/bin/env node

const { program } = require('commander');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { promisify } = require('util');
const readFile = promisify(fs.readFile);
const glob = promisify(require('glob'));

const { lintCWLContent } = require('../lib/linter');

// Configure CLI
program
    .option('--check-all', 'Check all CWL files in repository')
    .option('--ignore <files>', 'Files to ignore (comma-separated)')
    .option('--check-file <file>', 'Check specific CWL file')
    .parse(process.argv);

const options = program.opts();

// Colors for console output
const colors = {
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

async function lintCWLFile(filePath) {
    try {
        const content = await readFile(filePath, 'utf8');
        return lintCWLContent(content);
    } catch (error) {
        throw new Error(`Failed to read or lint file ${filePath}: ${error.message}`);
    }
}

function formatError(filePath, error) {
    const location = `${filePath}:${error.line + 1}:${error.character + 1}`;
    return `${colors.yellow}${location}${colors.reset} - ${colors.red}Error:${colors.reset} ${error.message}`;
}

async function checkAllFiles() {
    try {
        const cwlFiles = await glob('**/*.cwl', { ignore: ['node_modules/**'] });
        
        // Handle ignored files
        const ignoredFiles = options.ignore ? options.ignore.split(',') : [];
        const filesToCheck = cwlFiles.filter(file => !ignoredFiles.includes(file));

        let totalErrors = 0;
        
        for (const file of filesToCheck) {
            const errors = await lintCWLFile(file);
            if (errors.length > 0) {
                console.log(`\nLinting ${file}:`);
                errors.forEach(error => {
                    console.log(formatError(file, error));
                    totalErrors++;
                });
            }
        }

        if (totalErrors === 0) {
            console.log('\nNo linting errors found.');
        } else {
            console.log(`\nFound ${totalErrors} error${totalErrors === 1 ? '' : 's'}.`);
            process.exit(1);
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

async function checkSingleFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`Error: File '${filePath}' does not exist.`);
            process.exit(1);
        }

        if (!filePath.endsWith('.cwl')) {
            console.error('Error: File must have .cwl extension.');
            process.exit(1);
        }

        const errors = await lintCWLFile(filePath);
        if (errors.length > 0) {
            console.log(`\nLinting ${filePath}:`);
            errors.forEach(error => console.log(formatError(filePath, error)));
            process.exit(1);
        } else {
            console.log('No linting errors found.');
        }
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

// Main execution
(async () => {
    if (options.checkAll) {
        await checkAllFiles();
    } else if (options.checkFile) {
        await checkSingleFile(options.checkFile);
    } else {
        console.error('Error: Must specify either -check-all or -check-file <file>');
        process.exit(1);
    }
})();
