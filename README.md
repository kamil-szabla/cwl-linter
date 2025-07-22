# CWL Linter for Visual Studio Code

A Visual Studio Code extension that provides linting capabilities for Common Workflow Language (CWL) files. This extension helps catch common errors and enforce best practices in CWL workflows.

## Features

- Real-time linting of CWL files
- Validates CWL syntax and structure
- Checks for required fields (`cwlVersion`, `class`)
- Validates class values (`Workflow`, `CommandLineTool`, `ExpressionTool`)
- Verifies input definitions
- Checks field order and spacing
- Ensures `Workflow` inputs have `label` and `doc`
- YAML syntax validation

## Current Rules

The linter checks for:

1. **cwlVersion Field**: Verifies the presence of the `cwlVersion` field
2. **Class Field**: Checks for the presence and validity of the `class` field (must be one of: `Workflow`, `CommandLineTool`, `ExpressionTool`)
3. **Inputs Structure**: Validates that the `inputs` section is properly structured as an object or array
4. **YAML Syntax**: Ensures the file contains valid YAML syntax
5. **Field Order**: Validates the correct order of top-level fields according to CWL class:
   - **CommandLineTool**: `cwlVersion`, `class`, `label`, `doc`, `$namespaces`, `requirements`, `hints`, `inputs`, `outputs`, `baseCommand`, `arguments`, `stdout`, `stderr`
   - **ExpressionTool**: `cwlVersion`, `class`, `doc`, `$namespaces`, `requirements`, `hints`, `inputs`, `outputs`, `expression`
   - **Workflow**: `cwlVersion`, `class`, `label`, `doc`, `$namespaces`, `requirements`, `hints`, `inputs`, `outputs`, `steps`
6. **Blank Lines**: Ensures required blank lines before specific fields: `$namespaces`, `requirements`, `hints`, `inputs`, `outputs`, `baseCommand`, `arguments`, `expression`, `steps`
7. **Workflow Input Metadata**: Verifies that all `Workflow` inputs include both `label` and `doc` fields

## Installation

### Manual Installation
1. Download the latest `.vsix` file from the [releases page](https://github.com/kamil-szabla/cwl-linter/releases)
2. In VS Code, go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu and select "Install from VSIX..."
4. Select the downloaded file

### Development Installation
1. Clone this repository
2. Run `npm install` in the project directory
3. Launch the extension using VS Code's "Run Extension" from the debug menu (F5)

## Usage

### VS Code Extension
The extension automatically activates for files with the `.cwl` extension. Linting occurs:
- When you open a CWL file
- When you make changes to a CWL file
- When you save a CWL file

Errors and warnings will be displayed:
- As squiggly underlines in the editor
- In the Problems panel (View → Problems)

### Command Line Interface
This extension also provides a CLI tool for linting CWL files outside of VS Code:

```bash
# Install globally
npm install -g cwl-linter

# Check a single file
cwl-linter --check-file path/to/file.cwl

# Check all CWL files in the current directory and subdirectories
cwl-linter --check-all

# Ignore specific files
cwl-linter --check-all --ignore file1.cwl,file2.cwl
