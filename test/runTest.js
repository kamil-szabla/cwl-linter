const path = require('path');
const fs = require('fs');
const assert = require('assert');
const { lintCWLContent } = require('../lib/linter');


function runTests() {
  console.log('Running CWL Linter tests...');
  
  testBasicValidation();
  testFieldOrderValidation();
  testBlankLineValidation();
  testWorkflowInputValidation();
  testYamlSyntaxValidation();
  testValidFiles();
  
  console.log('All tests passed!');
}

function testBasicValidation() {
  console.log('Testing basic validation...');
  
  const missingVersion = `
class: CommandLineTool

inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const missingVersionErrors = lintCWLContent(missingVersion);
  assert(missingVersionErrors.some(e => e.message.includes('Missing cwlVersion')), 
    'Should detect missing cwlVersion');
  
  const missingClass = `
cwlVersion: v1.0

inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const missingClassErrors = lintCWLContent(missingClass);
  assert(missingClassErrors.some(e => e.message.includes('Missing class')), 
    'Should detect missing class');
  
  const invalidClass = `
cwlVersion: v1.0
class: InvalidClass

inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const invalidClassErrors = lintCWLContent(invalidClass);
  assert(invalidClassErrors.some(e => e.message.includes('Invalid class value')), 
    'Should detect invalid class value');
  
  const invalidInputs = `
cwlVersion: v1.0
class: CommandLineTool

inputs: "not an object"

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const invalidInputsErrors = lintCWLContent(invalidInputs);
  assert(invalidInputsErrors.some(e => e.message.includes('Inputs must be an object')), 
    'Should detect invalid inputs structure');
}

function testFieldOrderValidation() {
  console.log('Testing field order validation...');
  
  const incorrectOrderCLT = `
baseCommand: echo
cwlVersion: v1.0
class: CommandLineTool

inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout
`;
  const incorrectOrderCLTErrors = lintCWLContent(incorrectOrderCLT);
  assert(incorrectOrderCLTErrors.some(e => e.message.includes('out of order')), 
    'Should detect incorrect field order in CommandLineTool');
  
  const incorrectOrderWorkflow = `
steps:
  step1:
    run: tool.cwl
cwlVersion: v1.0
class: Workflow

inputs:
  input1:
    type: string
    label: Input 1
    doc: Documentation

outputs:
  output1:
    type: File
    outputSource: step1/output
`;
  const incorrectOrderWorkflowErrors = lintCWLContent(incorrectOrderWorkflow);
  assert(incorrectOrderWorkflowErrors.some(e => e.message.includes('out of order')), 
    'Should detect incorrect field order in Workflow');
}

function testBlankLineValidation() {
  console.log('Testing blank line validation...');
  
  const missingBlankLine = `
cwlVersion: v1.0
class: CommandLineTool
inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const missingBlankLineErrors = lintCWLContent(missingBlankLine);
  assert(missingBlankLineErrors.some(e => e.message.includes('Missing blank line')), 
    'Should detect missing blank line before inputs');
  
  const tooManyBlankLines = `
cwlVersion: v1.0
class: CommandLineTool


inputs:
  message:
    type: string

outputs:
  output_file:
    type: stdout

baseCommand: echo
`;
  const tooManyBlankLinesErrors = lintCWLContent(tooManyBlankLines);
  assert(tooManyBlankLinesErrors.some(e => e.message.includes('More than one blank line')), 
    'Should detect too many blank lines');
}

function testWorkflowInputValidation() {
  console.log('Testing workflow input validation...');
  
  const missingLabel = `
cwlVersion: v1.0
class: Workflow

inputs:
  input1:
    type: string
    doc: Documentation but no label

outputs:
  output1:
    type: File
    outputSource: step1/output

steps:
  step1:
    run: tool.cwl
    in:
      input: input1
    out: [output]
`;
  const missingLabelErrors = lintCWLContent(missingLabel);
  assert(missingLabelErrors.some(e => e.message.includes("missing required 'label'")), 
    'Should detect missing label in workflow input');
  
  const missingDoc = `
cwlVersion: v1.0
class: Workflow

inputs:
  input1:
    type: string
    label: Input 1 but no doc

outputs:
  output1:
    type: File
    outputSource: step1/output

steps:
  step1:
    run: tool.cwl
    in:
      input: input1
    out: [output]
`;
  const missingDocErrors = lintCWLContent(missingDoc);
  assert(missingDocErrors.some(e => e.message.includes("missing required 'doc'")), 
    'Should detect missing doc in workflow input');
}

function testYamlSyntaxValidation() {
  console.log('Testing YAML syntax validation...');
  
  const invalidYaml = `
cwlVersion: v1.0
class: CommandLineTool

inputs:
  message:
    type: string
    - this is invalid YAML

outputs:
  output_file:
    type: stdout
`;
  const invalidYamlErrors = lintCWLContent(invalidYaml);
  assert(invalidYamlErrors.some(e => e.message.includes('YAML parsing error')), 
    'Should detect YAML syntax errors');
}

function testValidFiles() {
  console.log('Testing valid files...');
  
  const validCommandLineTool = `
cwlVersion: v1.0
class: CommandLineTool

inputs:
  message:
    type: string
    inputBinding:
      position: 1

outputs:
  output_file:
    type: stdout

baseCommand: echo

stdout: output.txt
`;
  const commandLineToolErrors = lintCWLContent(validCommandLineTool);
  assert(commandLineToolErrors.length === 0, 
    'Valid CommandLineTool should have no errors');

  const validWorkflow = `
cwlVersion: v1.0
class: Workflow

inputs:
  input1:
    type: string
    label: Input 1
    doc: Documentation

outputs:
  output1:
    type: File
    outputSource: step1/output

steps:
  step1:
    run: tool.cwl
    in:
      input: input1
    out: [output]
`;
  const workflowErrors = lintCWLContent(validWorkflow);
  assert(workflowErrors.length === 0, 
    'Valid Workflow should have no errors');
}

runTests();
