"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Lexer = exports.Token = exports.TokenType = void 0;
const shouw_js_1 = require("shouw.js");
const Error_1 = require("./Error");
const Interpreter_1 = require("./Interpreter");
var TokenType;
(function (TokenType) {
    TokenType["IF"] = "IF";
    TokenType["ELSEIF"] = "ELSEIF";
    TokenType["ELSE"] = "ELSE";
    TokenType["ENDIF"] = "ENDIF";
    TokenType["FUNCTION"] = "FUNCTION";
    TokenType["TEXT"] = "TEXT";
    TokenType["EOF"] = "EOF";
})(TokenType || (exports.TokenType = TokenType = {}));
/**
 * The token class
 *
 * @class Token
 * @param {TokenType} type - The token type
 * @param {string} [name] - The token name
 * @param {TokenMetadata} [metadata] - The token metadata
 * @return {Token} - The token object
 */
class Token {
    constructor(type, name, metadata) {
        this.type = type;
        this.name = name;
        this.metadata = metadata ? Object.freeze(metadata) : undefined;
    }
}
exports.Token = Token;
/**
 * The lexer class is responsible for tokenizing the code
 *
 * @class Lexer
 * @param {string} code - The code to be tokenized
 * @param {ShouwClient} client - The client instance
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {Token[]} - The tokenized code
 */
class Lexer {
    constructor() {
        this.index = 0;
        this.tokens = [];
        this.line = 1;
        this.column = 1;
        this.code = '';
    }
    /**
     * Run the lexer
     *
     * @param {string} code - The code to be tokenized
     * @param {ShouwClient} client - The client instance
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {Token[]} - The tokenized code
     */
    static run(code, client, config) {
        return new Lexer().tokenize(code, client, config);
    }
    /**
     * Tokenize the code
     *
     * @param {string} code - The code to be tokenized
     * @param {ShouwClient} client - The client instance
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {Token[]} - The tokenized code
     * @throws {CodeError} - If the code is invalid
     */
    tokenize(code, client, config) {
        this.code = code;
        this.config = config;
        this.client = client;
        while (this.index < this.code.length) {
            const char = this.advance();
            if (char === '$') {
                let current = '';
                let num = 1;
                while (/[a-zA-Z0-9\-_]/.test(this.peek())) {
                    current += this.advance();
                    num++;
                }
                const keyword = current;
                const column = this.column - num;
                const line = this.line;
                const index = this.index - num;
                const brackets = this.peek() === '[';
                let Arguments = [];
                let hasCloseBracket = false;
                if (brackets) {
                    this.advance();
                    const { args, hasClose } = this.extractArgs();
                    Arguments = [...args];
                    hasCloseBracket = hasClose;
                }
                let tokenType = TokenType.FUNCTION;
                switch (keyword.toLowerCase()) {
                    case 'if':
                        tokenType = TokenType.IF;
                        break;
                    case 'elseif':
                        tokenType = TokenType.ELSEIF;
                        break;
                    case 'else':
                        tokenType = TokenType.ELSE;
                        break;
                    case 'endif':
                        tokenType = TokenType.ENDIF;
                        break;
                }
                const functionData = this.client?.functions.find((f) => f.name.toLowerCase() === `$${keyword.toLowerCase()}`);
                if (!functionData) {
                    this.tokens.push(new Token(TokenType.TEXT, `$${keyword}${Arguments.length > 0 ? `[${(0, Interpreter_1.Interpreter)(this.client, Arguments.join(';'), this.config)}${hasCloseBracket ? ']' : ''}` : ''}`));
                    continue;
                }
                if ((!brackets || !hasCloseBracket) && functionData.brackets)
                    throw new Error_1.CodeError(`Missing brackets for ${functionData.name}`, line, column, this.code, this.config);
                if (Arguments.length > 0) {
                    for (let i = 0; i < Arguments.length; i++) {
                        let arg = Arguments[i];
                        if (arg === '' && functionData.params[i]?.required)
                            throw new Error_1.CodeError(`Missing argument for ${functionData.name}`, line, column, this.code, this.config);
                        arg = (0, Interpreter_1.Interpreter)(this.client, arg, this.config);
                        if (functionData.params[i]?.param === shouw_js_1.ParamType.Number && Number.isNaN(Number(arg)))
                            throw new Error_1.CodeError(`Argument ${i + 1} for ${functionData.name} must be a number`, line, column, this.code);
                        if (functionData.params[i]?.param === shouw_js_1.ParamType.Boolean &&
                            !['true', 'false', '1', '0'].includes(arg.toLowerCase()))
                            throw new Error_1.CodeError(`Argument ${i + 1} for ${functionData.name} must be a boolean`, line, column, this.code);
                        Arguments[i] = arg;
                    }
                }
                this.tokens.push(new Token(tokenType, keyword, { args: Arguments, line, column, index, brackets }));
            }
            else if (char === '/') {
                if (this.peek() === '/') {
                    this.advance();
                    while (this.peek() !== '\n' && this.index < this.code.length)
                        this.advance();
                }
                else if (this.peek() === '*') {
                    this.advance();
                    while (!(this.peek() === '*' && this.peek(1) === '/') && this.index < this.code.length)
                        this.advance();
                    if (this.index >= this.code.length && !this.code.endsWith('*/'))
                        throw new Error_1.CodeError('Unexpected end of input', this.line, this.column, this.code, this.config);
                    this.advance();
                    this.advance();
                }
                else {
                    this.tokens.push(new Token(TokenType.TEXT, char));
                }
            }
            else {
                this.tokens.push(new Token(TokenType.TEXT, char));
            }
        }
        this.tokens.push(new Token(TokenType.EOF, 'EOF'));
        return this.mergeTokens(this.tokens);
    }
    /**
     * Extract the arguments from the code
     *
     * @return {{ args: string[]; hasClose: boolean }} - The extracted arguments and whether the closing bracket was found
     * @throws {CodeError} - If the closing bracket is missing
     */
    extractArgs() {
        const args = [];
        let current = '';
        let depth = 1;
        let hasClose = false;
        while (this.index < this.code.length) {
            const char = this.advance();
            if (char === '[')
                depth++;
            else if (char === ']') {
                depth--;
                if (depth === 0) {
                    args.push(current.trim());
                    current = '';
                    hasClose = true;
                    break;
                }
            }
            else if (char === ';' && depth === 1) {
                args.push(current.trim());
                current = '';
                continue;
            }
            current += char;
        }
        if (current.length > 0)
            args.push(current.trim());
        return { args, hasClose };
    }
    /**
     * Merge the tokens
     *
     * @param {Token[]} tokens - The tokens to be merged
     * @return {Token[]} - The merged tokens
     */
    mergeTokens(tokens) {
        const mergedTokens = [];
        let buffer = '';
        let meta = null;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token.type === TokenType.TEXT) {
                if (buffer === '')
                    meta = token.metadata ?? null;
                buffer += token.name ?? '';
            }
            else {
                if (buffer.length > 0) {
                    mergedTokens.push(new Token(TokenType.TEXT, buffer, meta ?? undefined));
                    buffer = '';
                    meta = null;
                }
                mergedTokens.push(token);
            }
        }
        if (buffer.length > 0) {
            mergedTokens.push(new Token(TokenType.TEXT, buffer, meta ?? undefined));
        }
        return mergedTokens;
    }
    /**
     * Peek the next character
     *
     * @param {number} [offset=0] - The offset to peek
     * @return {string} - The next character
     */
    peek(offset = 0) {
        return this.code[this.index + offset] || '';
    }
    /**
     * Advance the index and return the current character
     *
     * @return {string} - The current character
     */
    advance() {
        const char = this.code[this.index++] || '';
        if (char === '\n') {
            this.line++;
            this.column = 1;
        }
        else {
            this.column++;
        }
        return char;
    }
}
exports.Lexer = Lexer;
