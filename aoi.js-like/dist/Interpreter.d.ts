import { type Token } from './Lexer';
import type { ShouwClient } from './Client';
export declare enum ASTNodeType {
    CONDITIONAL = "CONDITIONAL",
    FUNCTION = "FUNCTION",
    TEXT = "TEXT"
}
export interface ASTTextNode {
    type: ASTNodeType.TEXT;
    value: string;
}
export interface ASTFunctionNode {
    type: ASTNodeType.FUNCTION;
    value: string;
    args: string[];
}
export interface ASTConditionalBranch {
    condition: string;
    body: ASTNode[];
}
export interface ASTConditionalNode {
    type: ASTNodeType.CONDITIONAL;
    branches: ASTConditionalBranch[];
}
export type ASTNode = ASTTextNode | ASTFunctionNode | ASTConditionalNode;
export interface InterpreterConfig {
    showCodeFrame?: boolean;
    customError?: (msg: string, line?: number, column?: number, frame?: string, code?: string) => string;
}
/**
 * The AST class is responsible for parsing the tokens and evaluating the code
 *
 * @class AST
 * @param {Token[]} tokens - The tokens to be parsed
 * @param {ShouwClient} client - The client instance
 * @param {string} code - The code to be executed
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {string} - The result of the code execution
 */
export declare class AST {
    private tokens;
    private code;
    private index;
    private config?;
    private client?;
    /**
     * Run the AST
     *
     * @param {Token[]} tokens - The tokens to be parsed
     * @param {ShouwClient} client - The client instance
     * @param {string} code - The code to be executed
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {string} - The result of the code execution
     */
    static run(tokens: Token[], client: ShouwClient, code: string, config?: InterpreterConfig): string;
    /**
     * Parse the tokens and evaluate the code
     *
     * @return {ASTNode[]} - The parsed nodes
     */
    private parse;
    /**
     * Parse the conditional block
     *
     * @return {ASTConditionalNode} - The parsed conditional node
     */
    private parseConditional;
    /**
     * Check if the number of $endif is equal to the number of $if
     *
     * @param {Token[]} tokens - The tokens to be checked
     * @return {boolean} - True if the number of $endif is equal to the number of $if
     */
    private isEndifCountEquals;
    /**
     * Evaluate the code
     *
     * @param {Token[]} tokens - The tokens to be evaluated
     * @param {ShouwClient} client - The client instance
     * @param {string} code - The code to be executed
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {string} - The result of the code execution
     */
    evaluate(tokens: Token[], client: ShouwClient, code: string, config?: InterpreterConfig): string;
}
/**
 * The interpreter function
 *
 * @param {ShouwClient} client - The client instance
 * @param {T} code - The code to be executed
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {string} - The result of the code execution
 */
export declare function Interpreter<T extends string>(client: ShouwClient, code: T, config?: InterpreterConfig): string;
