import type { InterpreterConfig } from './Interpreter';
/**
 * Error class for code errors
 *
 * @class CodeError
 * @extends {SyntaxError}
 * @param {string} message - The error message
 * @param {number} [line] - The line number where the error occurred
 * @param {number} [column] - The column number where the error occurred
 * @param {string} [code] - The code that caused the error
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {CodeError} - The error object
 */
export declare class CodeError extends SyntaxError {
    line?: number | undefined;
    column?: number | undefined;
    constructor(message: string, line?: number | undefined, column?: number | undefined, code?: string, config?: InterpreterConfig);
}
