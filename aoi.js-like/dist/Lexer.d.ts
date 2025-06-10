import type { ShouwClient } from './Client';
import { type InterpreterConfig } from './Interpreter';
export declare enum TokenType {
    IF = "IF",
    ELSEIF = "ELSEIF",
    ELSE = "ELSE",
    ENDIF = "ENDIF",
    FUNCTION = "FUNCTION",
    TEXT = "TEXT",
    EOF = "EOF"
}
export interface TokenMetadata {
    args?: string[];
    line?: number;
    column?: number;
    index?: number;
    brackets?: boolean;
}
/**
 * The token class
 *
 * @class Token
 * @param {TokenType} type - The token type
 * @param {string} [name] - The token name
 * @param {TokenMetadata} [metadata] - The token metadata
 * @return {Token} - The token object
 */
export declare class Token {
    readonly type: TokenType;
    readonly name?: string;
    readonly metadata?: Readonly<TokenMetadata>;
    constructor(type: TokenType, name?: string, metadata?: TokenMetadata);
}
/**
 * The lexer class is responsible for tokenizing the code
 *
 * @class Lexer
 * @param {string} code - The code to be tokenized
 * @param {ShouwClient} client - The client instance
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {Token[]} - The tokenized code
 */
export declare class Lexer {
    private index;
    private client?;
    private readonly tokens;
    private line;
    private column;
    private code;
    private config?;
    /**
     * Run the lexer
     *
     * @param {string} code - The code to be tokenized
     * @param {ShouwClient} client - The client instance
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {Token[]} - The tokenized code
     */
    static run(code: string, client: ShouwClient, config?: InterpreterConfig): Token[];
    /**
     * Tokenize the code
     *
     * @param {string} code - The code to be tokenized
     * @param {ShouwClient} client - The client instance
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {Token[]} - The tokenized code
     * @throws {CodeError} - If the code is invalid
     */
    tokenize(code: string, client: ShouwClient, config?: InterpreterConfig): Token[];
    /**
     * Extract the arguments from the code
     *
     * @return {{ args: string[]; hasClose: boolean }} - The extracted arguments and whether the closing bracket was found
     * @throws {CodeError} - If the closing bracket is missing
     */
    private extractArgs;
    /**
     * Merge the tokens
     *
     * @param {Token[]} tokens - The tokens to be merged
     * @return {Token[]} - The merged tokens
     */
    private mergeTokens;
    /**
     * Peek the next character
     *
     * @param {number} [offset=0] - The offset to peek
     * @return {string} - The next character
     */
    private peek;
    /**
     * Advance the index and return the current character
     *
     * @return {string} - The current character
     */
    private advance;
}
