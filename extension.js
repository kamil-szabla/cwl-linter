const vscode = require('vscode');
const { lintCWLContent } = require('./lib/linter');
const fs = require('fs');
const path = require('path');

let diagnosticCollection;

async function installCLI(context) {
    try {
        const cliSetupPath = path.join(context.extensionPath, 'scripts', 'cli-setup.js');
        
        if (!fs.existsSync(cliSetupPath)) {
            throw new Error('CLI setup script not found');
        }
        
        require(cliSetupPath);
        
        console.log('CWL Linter CLI setup completed');
    } catch (error) {
        console.error('Failed to set up CWL Linter CLI:', error);
        
        const errorMessage = 'Failed to set up CWL Linter CLI. ' +
            'You can still use the extension, but the command-line tool may not be available. ' +
            'To manually install the CLI, run: npm install -g cwl-linter';
            
        vscode.window.showWarningMessage(errorMessage);
    }
}

async function lintCWLDocument(document) {
    try {
        if (!document || !document.fileName || !document.fileName.endsWith('.cwl')) {
            return;
        }

        const content = document.getText();
        if (!content || content.trim() === '') {
            diagnosticCollection.set(document.uri, []);
            return;
        }

        const errors = lintCWLContent(content);

        const vscodeDiagnostics = errors.map(error => {
            const line = typeof error.line === 'number' ? error.line : 0;
            const character = typeof error.character === 'number' ? error.character : 0;
            
            return new vscode.Diagnostic(
                new vscode.Range(line, character, line, character + 1),
                error.message,
                vscode.DiagnosticSeverity.Error
            );
        });

        diagnosticCollection.set(document.uri, vscodeDiagnostics);
    } catch (error) {
        console.error(`Error linting document ${document.fileName}:`, error);
        vscode.window.showErrorMessage(`Error linting CWL file: ${error.message}`);
        
        diagnosticCollection.set(document.uri, []);
    }
}

async function activate(context) {
    try {
        diagnosticCollection = vscode.languages.createDiagnosticCollection('cwl-linter');
        context.subscriptions.push(diagnosticCollection);

        context.subscriptions.push(
            vscode.workspace.onDidOpenTextDocument(lintCWLDocument),
            vscode.workspace.onDidChangeTextDocument(event => lintCWLDocument(event.document)),
            vscode.workspace.onDidSaveTextDocument(lintCWLDocument)
        );

        vscode.workspace.textDocuments.forEach(lintCWLDocument);

        await installCLI(context);
        
        console.log('CWL Linter extension activated successfully');
    } catch (error) {
        console.error('Failed to activate CWL Linter extension:', error);
        vscode.window.showErrorMessage(`Failed to activate CWL Linter: ${error.message}`);
    }
}

async function deactivate() {
    try {
        if (diagnosticCollection) {
            diagnosticCollection.clear();
            diagnosticCollection.dispose();
        }
        
        console.log('CWL Linter extension deactivated successfully');
    } catch (error) {
        console.error('Error during CWL Linter deactivation:', error);
    }
}

module.exports = {
    activate,
    deactivate
};
