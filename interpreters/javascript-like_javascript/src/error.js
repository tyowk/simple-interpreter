/**
 * Custom error class for code errors
 *
 * @param {string} message - Error message
 * @param {string} code - Code that caused the error
 * @param {number} index - Index of the error in the code
 * @example
 * throw new CodeError('Unexpected token', 'let x = 10 + 5', 10);
 */
exports.CodeError = class CodeError extends Error {
    constructor(message, code, index) {
        super(`${message}\n${generateArrowError(code, index)}`);
        Error.captureStackTrace(this, CodeError);
        this.name = 'CodeError';
    }
}

/**
 * Generates an arrow error message
 *
 * @param {string} code - Code that caused the error
 * @param {number} index - Index of the error in the code
 * @returns {string} arrowError - Arrow error message
 */
function generateArrowError(code, index) {
    if (!index) return '';
    return `\n${code.slice(index - 20, index + 20)}\n${' '.repeat(code.slice(index - 20, index).length)}^`;
}