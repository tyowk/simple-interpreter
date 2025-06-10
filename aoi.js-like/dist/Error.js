"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeError = void 0;
const Lexer_1 = require("./Lexer");
const chalk = require("chalk");
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
class CodeError extends SyntaxError {
    constructor(message, line, column, code, config) {
        super(config?.customError
            ? config.customError(message, line, column, generateCodeFrame(code, line, column, config), code)
            : `${message} at ${line}:${column}${generateCodeFrame(code, line, column, config)}`);
        this.line = line;
        this.column = column;
        this.name = 'CodeError';
        SyntaxError.captureStackTrace(this, new Lexer_1.Lexer().tokenize);
        /**
         * Generate a code frame for the error
         *
         * @param {string} [code] - The code that caused the error
         * @param {number} [line] - The line number where the error occurred
         * @param {number} [column] - The column number where the error occurred
         * @param {InterpreterConfig} [config] - The interpreter config
         * @return {string} - The code frame
         */
        function generateCodeFrame(code, line, column, config) {
            if (!config?.showCodeFrame)
                return '';
            if (!code || !line || !column)
                return '';
            const lines = code.split('\n');
            const start = Math.max(line - 3, 0);
            const end = Math.min(line + 2, lines.length);
            const frame = lines
                .slice(start, end)
                .map((lineStr, index) => {
                const lineNumber = start + index + 1;
                const prefix = lineNumber === line ? chalk.red('>') : ' ';
                return `${prefix} ${lineNumber} | ${lineStr}`;
            })
                .join('\n');
            return `\n\n${frame}\n${' '.repeat(column + 5)}${chalk.red('^')}`;
        }
    }
}
exports.CodeError = CodeError;
