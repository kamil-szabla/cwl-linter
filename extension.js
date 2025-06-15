const vscode = require('vscode');
const { lintCWLContent } = require('./lib/linter');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');

const execAsync = promisify(exec);
let diagnosticCollection;

async function installCLI(context) {
    try {
        const extensionPath = context.extensionPath;
        await execAsync('npm link', { cwd: extensionPath });
        console.log('CWL Linter CLI installed successfully');
    } catch (error) {
        console.error('Failed to install CWL Linter CLI:', error);
        vscode.window.showErrorMessage('Failed to install CWL Linter CLI. You may need to run VS Code with elevated privileges.');
    }
}

async function lintCWLDocument(document) {
    if (!document.fileName.endsWith('.cwl')) return;

    const content = document.getText();
    const errors = lintCWLContent(content);

    const vscodeDiagnostics = errors.map(error => {
        return new vscode.Diagnostic(
            new vscode.Range(error.line, error.character, error.line, error.character + 1),
            error.message,
            vscode.DiagnosticSeverity.Error
        );
    });

    diagnosticCollection.set(document.uri, vscodeDiagnostics);
}

async function activate(context) {
    diagnosticCollection = vscode.languages.createDiagnosticCollection('cwl-linter');
    context.subscriptions.push(diagnosticCollection);

    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument(lintCWLDocument),
        vscode.workspace.onDidChangeTextDocument(event => lintCWLDocument(event.document)),
        vscode.workspace.onDidSaveTextDocument(lintCWLDocument)
    );

    vscode.workspace.textDocuments.forEach(lintCWLDocument);

    // Install CLI commands
    await installCLI(context);
}

async function deactivate() {
    if (diagnosticCollection) {
        diagnosticCollection.clear();
        diagnosticCollection.dispose();
    }

    try {
        // Unlink the CLI when extension is deactivated
        await execAsync('npm unlink', { cwd: __dirname });
        console.log('CWL Linter CLI uninstalled successfully');
    } catch (error) {
        console.error('Failed to uninstall CWL Linter CLI:', error);
    }
}

module.exports = {
    activate,
    deactivate
};
