const yaml = require('js-yaml');

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

function findFieldPosition(content, fieldName, parentContext = '') {
    const lines = content.split('\n');
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
            return { line: i, character: startChar };
        }
    }
    return { line: 0, character: 0 };
}

function checkFieldOrder(doc, content) {
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
            const position = findFieldPosition(content, field);
            errors.push({
                message: `Field '${field}' is out of order. It should appear before '${misplacedAfter}'.`,
                line: position.line,
                character: position.character
            });
        } else {
            lastIndex = currentIndex;
        }
    }

    return errors;
}

function checkBlankLines(doc, content) {
    const errors = [];
    const lines = content.split('\n');

    for (let i = 1; i < lines.length; i++) {
        const currentLine = lines[i];
        const previousLine = lines[i - 1];
        const fieldMatch = currentLine.match(/^\s*([a-zA-Z0-9_$\-]+):/);

        if (fieldMatch) {
            const fieldName = fieldMatch[1];

            if (previousLine.trim() === '' && i >= 2 && lines[i - 2].trim() === '') {
                errors.push({
                    message: `More than one blank line before field '${fieldName}'.`,
                    line: i,
                    character: 0
                });
            }

            if (blankLineConfig.has(fieldName)) {
                if (previousLine.trim() !== '') {
                    errors.push({
                        message: `Missing blank line before field '${fieldName}'.`,
                        line: i,
                        character: 0
                    });
                }
            }
        }
    }

    return errors;
}

function checkWorkflowInputMetadata(doc, content) {
    const errors = [];
    if (doc.class !== 'Workflow' || typeof doc.inputs !== 'object') return errors;

    const lines = content.split('\n');

    for (const [inputKey, inputValue] of Object.entries(doc.inputs)) {
        if (typeof inputValue !== 'object') continue;

        const baseLine = lines.findIndex(line => line.match(new RegExp(`^\\s*${inputKey}:`)));
        if (baseLine === -1) continue;

        if (!('label' in inputValue)) {
            errors.push({
                message: `Input '${inputKey}' is missing required 'label' field.`,
                line: baseLine,
                character: 0
            });
        }
        if (!('doc' in inputValue)) {
            errors.push({
                message: `Input '${inputKey}' is missing required 'doc' field.`,
                line: baseLine,
                character: 0
            });
        }
    }

    return errors;
}

const rules = {
    checkVersion: (doc, content) => {
        const errors = [];
        if (!doc.cwlVersion) {
            const position = findFieldPosition(content, 'cwlVersion');
            errors.push({
                message: 'Missing cwlVersion field',
                line: position.line,
                character: position.character
            });
        }
        return errors;
    },

    checkClass: (doc, content) => {
        const errors = [];
        if (!doc.class) {
            const position = findFieldPosition(content, 'class');
            errors.push({
                message: 'Missing class field',
                line: position.line,
                character: position.character
            });
        } else if (!['Workflow', 'CommandLineTool', 'ExpressionTool'].includes(doc.class)) {
            const position = findFieldPosition(content, 'class');
            errors.push({
                message: 'Invalid class value. Must be one of: Workflow, CommandLineTool, ExpressionTool',
                line: position.line,
                character: position.character
            });
        }
        return errors;
    },

    checkInputs: (doc, content) => {
        const errors = [];
        if (doc.inputs && typeof doc.inputs !== 'object') {
            const position = findFieldPosition(content, 'inputs');
            errors.push({
                message: 'Inputs must be an object or array',
                line: position.line,
                character: position.character
            });
        }
        return errors;
    },

    checkFieldOrder,
    checkBlankLines,
    checkWorkflowInputMetadata
};

function lintCWLContent(content) {
    const errors = [];

    try {
        const cwlDoc = yaml.load(content);
        for (const rule of Object.values(rules)) {
            errors.push(...rule(cwlDoc, content));
        }
    } catch (error) {
        if (error.mark) {
            errors.push({
                message: `YAML parsing error: ${error.reason || error.message}`,
                line: error.mark.line,
                character: error.mark.column
            });
        } else {
            errors.push({
                message: `YAML parsing error: ${error.message}`,
                line: 0,
                character: 0
            });
        }
    }

    return errors;
}

module.exports = {
    lintCWLContent,
    rules
};
