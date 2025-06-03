const vscode = require('vscode');
const yaml = require('js-yaml');
const path = require('path');

let diagnosticCollection;

function findFieldPosition(document, fieldName, parentContext = '') {
    const text = document.getText();
    const lines = text.split('\n');
    const pattern = new RegExp(`^\\s*${fieldName}:\\s*`);

    for (let i = 0; i < lines.length; i++) {
        if (pattern.test(lines[i])) {
            if (parentContext) {
                let contextFound = false;
                for (let j = i - 1; j >= 0; j--) {
                    if (lines[j].includes(parentContext)) {
                        contextFound = true;
                        break;
                    }
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

const fieldOrderConfig = {
    CommandLineTool: [
        'cwlVersion', 'class', 'label', 'doc', '$namespaces',
        'requirements', 'hints', 'inputs', 'outputs',
        'baseCommand', 'arguments', 'stdout', 'stderr'
    ],
    ExpressionTool: [
        'cwlVersion', 'class', 'doc', '$namespaces',
        'requirements', 'hints', 'inputs', 'outputs', 'expression'
    ],
    Workflow: [
        'cwlVersion', 'class', 'label', 'doc', '$namespaces',
        'requirements', 'hints', 'inputs', 'outputs', 'steps'
    ]
};

const blankLineConfig = new Set([
    '$namespaces', 'requirements', 'hints', 'inputs', 'outputs',
    'baseCommand', 'arguments', 'expression', 'steps'
]);

function checkFieldOrder(doc, document) {
    const errors = [];
    const classType = doc.class;
    if (!fieldOrderConfig[classType]) return errors;

    const fieldsInDoc = Object.keys(doc);
    const expectedOrder = fieldOrderConfig[classType];

    let lastIndex = -1;
    for (const field of fieldsInDoc) {
        const currentIndex = expectedOrder.indexOf(field);
        if (currentIndex === -1) continue;

        if (currentIndex < lastIndex) {
            const misplacedAfter = expectedOrder[lastIndex];
            errors.push({
                message: `Field '${field}' is out of order. It should appear before '${misplacedAfter}'.`,
                range: findFieldPosition(document, field)
            });
        } else {
            lastIndex = currentIndex;
        }
    }

    return errors;
}

function checkBlankLines(doc, document) {
    const errors = [];
    const lines = document.getText().split('\n');

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        const previousLine = lines[i - 1];
        const fieldMatch = currentLine.match(/^\s*([a-zA-Z0-9_$\-]+):/);

        if (fieldMatch) {
            const fieldName = fieldMatch[1];

            if (previousLine.trim() === '' && i >= 2 && lines[i - 2].trim() === '') {
                errors.push({
                    message: `More than one blank line before field '${fieldName}'.`,
                    range: new vscode.Range(i - 1, 0, i, currentLine.length)
                });
            }

            if (blankLineConfig.has(fieldName)) {
                if (previousLine.trim() !== '') {
                    errors.push({
                        message: `Missing blank line before field '${fieldName}'.`,
                        range: new vscode.Range(i, 0, i, currentLine.length)
                    });
                }
            }
        }
    }

    return errors;
}

function checkWorkflowInputMetadata(doc, document) {
    const errors = [];
    if (doc.class !== 'Workflow' || typeof doc.inputs !== 'object') return errors;

    const textLines = document.getText().split('\n');

    for (const [inputKey, inputValue] of Object.entries(doc.inputs)) {
        if (typeof inputValue !== 'object') continue;

        const baseLine = textLines.findIndex(line => line.match(new RegExp(`^\\s*${inputKey}:`)));
        if (baseLine === -1) continue;

        if (!('label' in inputValue)) {
            errors.push({
                message: `Input '${inputKey}' is missing required 'label' field.`,
                range: new vscode.Range(baseLine, 0, baseLine, textLines[baseLine]?.length || 1)
            });
        }
        if (!('doc' in inputValue)) {
            errors.push({
                message: `Input '${inputKey}' is missing required 'doc' field.`,
                range: new vscode.Range(baseLine, 0, baseLine, textLines[baseLine]?.length || 1)
            });
        }
    }

    return errors;
}

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
    },

    checkFieldOrder: checkFieldOrder,
    checkBlankLines: checkBlankLines,
    checkWorkflowInputMetadata: checkWorkflowInputMetadata
};

async function lintCWLDocument(document) {
    const diagnostics = [];

    try {
        if (!document.fileName.endsWith('.cwl')) return;

        const content = document.getText();
        const cwlDoc = yaml.load(content);

        for (const rule of Object.values(rules)) {
            diagnostics.push(...rule(cwlDoc, document));
        }
    } catch (error) {
        if (error.mark) {
            const { line, column } = error.mark;
            const lineContent = document.getText().split('\n')[line];
            const endColumn = lineContent ? lineContent.length : column + 1;
            diagnostics.push({
                message: `YAML parsing error: ${error.reason || error.message}`,
                range: new vscode.Range(line, column, line, endColumn)
            });
        } else {
            diagnostics.push({
                message: `YAML parsing error: ${error.message}`,
                range: new vscode.Range(0, 0, 0, 0)
            });
        }
    }

    const vscodeDiagnostics = diagnostics.map(error => {
        return new vscode.Diagnostic(
            error.range,
            error.message,
            vscode.DiagnosticSeverity.Error
        );
    });

    diagnosticCollection.set(document.uri, vscodeDiagnostics);
}

function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cwl-linter');
    context.subscriptions.push(diagnosticCollection);

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(lintCWLDocument),
        vscode.workspace.onDidChangeTextDocument(event => lintCWLDocument(event.document)),
        vscode.workspace.onDidSaveTextDocument(lintCWLDocument)
    );

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
