const vscode = require('vscode');
const yaml = require('js-yaml');
const path = require('path');

// Collection to store diagnostics
let diagnosticCollection;

// Helper function to find position of a field in document
function findFieldPosition(document, fieldName, parentContext = '') {
    const text = document.getText();
    const lines = text.split('\n');
    const pattern = new RegExp(`^\\s*${fieldName}:\\s*`);
    
    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
            // If we have a parent context, verify we're in the right context
            if (parentContext) {
                let contextFound = false;
                // Look backwards for parent context
                for (let j = i - 1; j >= 0; j--) {
                    if (lines[j].includes(parentContext)) {
                        contextFound = true;
                        break;
                    }
                    // If we hit a line with less indentation, we've gone too far
                    if (lines[j].match(/^\S/)) {
                        break;
                    }
                }
                if (!contextFound) continue;
            }
            
            const startChar = lines[i].indexOf(fieldName);
            return new vscode.Range(i, startChar, i, lines[i].length);
        }
    }
    return new vscode.Range(0, 0, 0, 0);
}

// CWL linting rules
const rules = {
    checkVersion: (doc, document) => {
        const errors = [];
        if (!doc.cwlVersion) {
            errors.push({
                message: 'Missing cwlVersion field',
                range: findFieldPosition(document, 'cwlVersion')
            });
        }
        return errors;
    },
    
    checkClass: (doc, document) => {
        const errors = [];
        if (!doc.class) {
            errors.push({
                message: 'Missing class field',
                range: findFieldPosition(document, 'class')
            });
        } else if (!['Workflow', 'CommandLineTool', 'ExpressionTool'].includes(doc.class)) {
            errors.push({
                message: 'Invalid class value. Must be one of: Workflow, CommandLineTool, ExpressionTool',
                range: findFieldPosition(document, 'class')
            });
        }
        return errors;
    },

    checkInputs: (doc, document) => {
        const errors = [];
        if (doc.inputs && typeof doc.inputs !== 'object') {
            errors.push({
                message: 'Inputs must be an object or array',
                range: findFieldPosition(document, 'inputs')
            });
        }
        return errors;
    }
};

// Function to lint CWL document
async function lintCWLDocument(document) {
    const diagnostics = [];
    
    try {
        // Only process .cwl files
        if (!document.fileName.endsWith('.cwl')) {
            return;
        }

        // Parse the YAML content
        const content = document.getText();
        const cwlDoc = yaml.load(content);

        // Apply each rule with document context
        for (const [ruleName, rule] of Object.entries(rules)) {
            const ruleErrors = rule(cwlDoc, document);
            diagnostics.push(...ruleErrors);
        }
    } catch (error) {
        // Handle YAML parsing errors with line information
        if (error.mark) {
            const line = error.mark.line;
            const column = error.mark.column;
            const lineContent = document.getText().split('\n')[line];
            const endColumn = lineContent ? lineContent.length : column + 1;
            
            diagnostics.push({
                message: `YAML parsing error: ${error.reason || error.message}`,
                range: new vscode.Range(line, column, line, endColumn)
            });
        } else {
            // Fallback if no mark information is available
            diagnostics.push({
                message: `YAML parsing error: ${error.message}`,
                range: new vscode.Range(0, 0, 0, 0)
            });
        }
    }

    // Convert to VSCode diagnostics
    const vscodeDiagnostics = diagnostics.map(error => {
        return new vscode.Diagnostic(
            error.range,
            error.message,
            vscode.DiagnosticSeverity.Error
        );
    });

    // Update diagnostics
    diagnosticCollection.set(document.uri, vscodeDiagnostics);
}

function activate(context) {
    // Create diagnostic collection
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cwl-linter');
    context.subscriptions.push(diagnosticCollection);

    // Register event handlers
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(lintCWLDocument),
        vscode.workspace.onDidChangeTextDocument(event => lintCWLDocument(event.document)),
        vscode.workspace.onDidSaveTextDocument(lintCWLDocument)
    );

    // Lint all open documents
    vscode.workspace.textDocuments.forEach(lintCWLDocument);
}

function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }
}

module.exports = {
    activate,
    deactivate
};
