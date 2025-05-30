const assert = require('assert');
const vscode = require('vscode');
const path = require('path');

suite('CWL Linter Extension Test Suite', () => {
    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('cwl-linter'));
    });

    test('Should detect missing cwlVersion', async () => {
        const docContent = `
class: CommandLineTool
baseCommand: echo
inputs:
  message:
    type: string
`;
        const uri = vscode.Uri.file(path.join(__dirname, 'temp.cwl'));
        const doc = await vscode.workspace.openTextDocument(uri);
        
        // Wait for diagnostics
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const diagnostics = vscode.languages.getDiagnostics(uri);
        assert.strictEqual(diagnostics.length > 0, true);
        assert.strictEqual(
            diagnostics.some(d => d.message.includes('Missing cwlVersion')),
            true
        );
    });

    test('Should detect invalid class value', async () => {
        const docContent = `
cwlVersion: v1.0
class: InvalidClass
baseCommand: echo
inputs:
  message:
    type: string
`;
        const uri = vscode.Uri.file(path.join(__dirname, 'temp.cwl'));
        const doc = await vscode.workspace.openTextDocument(uri);
        
        // Wait for diagnostics
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const diagnostics = vscode.languages.getDiagnostics(uri);
        assert.strictEqual(diagnostics.length > 0, true);
        assert.strictEqual(
            diagnostics.some(d => d.message.includes('Invalid class value')),
            true
        );
    });

    test('Should pass valid CWL file', async () => {
        const docContent = `
cwlVersion: v1.0
class: CommandLineTool
baseCommand: echo
inputs:
  message:
    type: string
    inputBinding:
      position: 1
outputs:
  output_file:
    type: stdout
stdout: output.txt
`;
        const uri = vscode.Uri.file(path.join(__dirname, 'temp.cwl'));
        const doc = await vscode.workspace.openTextDocument(uri);
        
        // Wait for diagnostics
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const diagnostics = vscode.languages.getDiagnostics(uri);
        assert.strictEqual(diagnostics.length, 0);
    });
});
