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
