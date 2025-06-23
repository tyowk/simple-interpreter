import type { InterpreterConfig } from './Interpreter';
import { Lexer } from './Lexer';
import * as chalk from 'chalk';

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
export class CodeError extends SyntaxError {
    constructor(
        message: string,
        public line?: number,
        public column?: number,
        code?: string,
        config?: InterpreterConfig
    ) {
        super(
            config?.customError
                ? config.customError(message, line, column, generateCodeFrame(code, line, column, config), code)
                : `${message} at ${line}:${column}${generateCodeFrame(code, line, column, config)}`
        );
        this.name = 'CodeError';
        SyntaxError.captureStackTrace(this, new Lexer().tokenize);

        /**
         * Generate a code frame for the error
         *
         * @param {string} [code] - The code that caused the error
         * @param {number} [line] - The line number where the error occurred
         * @param {number} [column] - The column number where the error occurred
         * @param {InterpreterConfig} [config] - The interpreter config
         * @return {string} - The code frame
         */
        function generateCodeFrame(code?: string, line?: number, column?: number, config?: InterpreterConfig): string {
            if (!config?.showCodeFrame) return '';
            if (!code || !line || !column) return '';
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
