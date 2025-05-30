# This CWL file contains intentional errors to demonstrate linting
cwlVersion: 1.0
    
# Missing cwlVersion field

class: Workflow  # Invalid class value

baseCommand: echo

inputs:  # This is valid
  message:
    type: string
    inputBinding:
      position: 1

outputs:
  output_file:
    type: stdout

stdout: output.txt
