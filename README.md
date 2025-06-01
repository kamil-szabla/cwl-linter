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

1. Presence of required `cwlVersion` field
2. Presence and validity of `class` field (must be one of: `Workflow`, `CommandLineTool`, `ExpressionTool`)
3. Proper structure of `inputs` section
4. Valid YAML syntax
5. Correct order of top-level fields according to CWL class
6. Required blank lines before selected fields
7. `Workflow` inputs must include `label` and `doc`

## Installation

1. Clone this repository
2. Run `npm install` in the project directory
3. Launch the extension using VS Code's "Run Extension" from the debug menu

### Manual Installation
To install the extension manually:

1. Copy the files to your VSCode extensions directory:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`
2. Restart Visual Studio Code

## Usage

The extension automatically activates for files with the `.cwl` extension. Linting occurs:
- When you open a CWL file
- When you make changes to a CWL file
- When you save a CWL file

Errors and warnings will be displayed:
- As squiggly underlines in the editor
- In the Problems panel (View → Problems)

## Example

Here's a valid CWL file that passes all lint checks:

```yaml
#!/usr/bin/env cwl-runner

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
```

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Add new lint rules
- Improve documentation

## License

MIT

## Development

To modify or enhance the linter:

1. The main logic lives in `extension.js`
2. You can add rules directly within `extension.js` by modifying the validation logic
3. Use `F5` in VS Code to launch a development version of the extension
4. Test your changes using CWL examples
