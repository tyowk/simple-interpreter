"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AST = exports.ASTNodeType = void 0;
exports.Interpreter = Interpreter;
const Lexer_1 = require("./Lexer");
const shouw_js_1 = require("shouw.js");
const Error_1 = require("./Error");
var ASTNodeType;
(function (ASTNodeType) {
    ASTNodeType["CONDITIONAL"] = "CONDITIONAL";
    ASTNodeType["FUNCTION"] = "FUNCTION";
    ASTNodeType["TEXT"] = "TEXT";
})(ASTNodeType || (exports.ASTNodeType = ASTNodeType = {}));
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
class AST {
    constructor() {
        this.tokens = [];
        this.code = '';
        this.index = 0;
    }
    /**
     * Run the AST
     *
     * @param {Token[]} tokens - The tokens to be parsed
     * @param {ShouwClient} client - The client instance
     * @param {string} code - The code to be executed
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {string} - The result of the code execution
     */
    static run(tokens, client, code, config) {
        return new AST().evaluate(tokens, client, code, config);
    }
    /**
     * Parse the tokens and evaluate the code
     *
     * @return {ASTNode[]} - The parsed nodes
     */
    parse() {
        const nodes = [];
        while (this.index < this.tokens.length) {
            const token = this.tokens[this.index];
            switch (token.type) {
                case Lexer_1.TokenType.IF:
                    nodes.push(this.parseConditional());
                    break;
                case Lexer_1.TokenType.ELSEIF:
                case Lexer_1.TokenType.ELSE:
                case Lexer_1.TokenType.ENDIF:
                    throw new Error_1.CodeError(`$${token.type.toLowerCase()} cannot be used outside of an $if block`, token.metadata?.line, token.metadata?.column, this.code, this.config);
                case Lexer_1.TokenType.FUNCTION:
                    nodes.push({
                        type: ASTNodeType.FUNCTION,
                        value: token.name ?? '',
                        args: token.metadata?.args ?? []
                    });
                    this.index++;
                    break;
                case Lexer_1.TokenType.TEXT:
                    nodes.push({ type: ASTNodeType.TEXT, value: token.name ?? '' });
                    this.index++;
                    break;
                case Lexer_1.TokenType.EOF:
                    return nodes;
                default:
                    this.index++;
                    break;
            }
        }
        return nodes;
    }
    /**
     * Parse the conditional block
     *
     * @return {ASTConditionalNode} - The parsed conditional node
     */
    parseConditional() {
        const branches = [];
        let hasEndif = false;
        const readBlock = () => {
            const body = [];
            while (this.index < this.tokens.length) {
                const token = this.tokens[this.index];
                if ([Lexer_1.TokenType.ELSEIF, Lexer_1.TokenType.ELSE, Lexer_1.TokenType.ENDIF].includes(token.type))
                    break;
                switch (token.type) {
                    case Lexer_1.TokenType.IF:
                        body.push(this.parseConditional());
                        break;
                    case Lexer_1.TokenType.FUNCTION:
                        body.push({
                            type: ASTNodeType.FUNCTION,
                            value: token.name ?? '',
                            args: token.metadata?.args ?? []
                        });
                        this.index++;
                        break;
                    case Lexer_1.TokenType.TEXT:
                        body.push({ type: ASTNodeType.TEXT, value: token.name ?? '' });
                        this.index++;
                        break;
                    default:
                        this.index++;
                        break;
                }
            }
            return body;
        };
        while (this.index < this.tokens.length) {
            const token = this.tokens[this.index];
            if (token.type === Lexer_1.TokenType.IF || token.type === Lexer_1.TokenType.ELSEIF) {
                const condition = token.metadata?.args?.[0] ?? '';
                this.index++;
                const body = readBlock();
                branches.push({ condition, body });
            }
            else if (token.type === Lexer_1.TokenType.ELSE) {
                this.index++;
                const body = readBlock();
                branches.push({ condition: 'true', body });
            }
            else if (token.type === Lexer_1.TokenType.ENDIF) {
                this.index++;
                hasEndif = true;
                break;
            }
            else {
                this.index++;
            }
        }
        if (!hasEndif) {
            const first = branches[0];
            throw new Error_1.CodeError(`Missing $endif for $if[${first.condition}]`, this.tokens[this.index - 1]?.metadata?.line, this.tokens[this.index - 1]?.metadata?.column, this.code, this.config);
        }
        return { type: ASTNodeType.CONDITIONAL, branches };
    }
    /**
     * Check if the number of $endif is equal to the number of $if
     *
     * @param {Token[]} tokens - The tokens to be checked
     * @return {boolean} - True if the number of $endif is equal to the number of $if
     */
    isEndifCountEquals(tokens) {
        let endifCount = 0;
        let ifCount = 0;
        for (const token of tokens) {
            if (token.type === Lexer_1.TokenType.IF)
                ifCount++;
            if (token.type === Lexer_1.TokenType.ENDIF)
                endifCount++;
        }
        return endifCount === ifCount;
    }
    /**
     * Evaluate the code
     *
     * @param {Token[]} tokens - The tokens to be evaluated
     * @param {ShouwClient} client - The client instance
     * @param {string} code - The code to be executed
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {string} - The result of the code execution
     */
    evaluate(tokens, client, code, config) {
        this.tokens = tokens;
        this.code = code;
        this.config = config;
        this.client = client;
        if (!this.isEndifCountEquals(tokens)) {
            const lastIf = tokens.findLast((t) => t.type === Lexer_1.TokenType.IF);
            const meta = lastIf?.metadata;
            throw new Error_1.CodeError('Missing $endif for $if', meta?.line, meta?.column, this.code, this.config);
        }
        const output = [];
        const parsed = this.parse();
        const walk = (nodes) => {
            for (const node of nodes) {
                switch (node.type) {
                    case ASTNodeType.TEXT: {
                        output.push(node.value);
                        break;
                    }
                    case ASTNodeType.FUNCTION: {
                        const functionData = this.client?.functions.find((f) => f.name.toLowerCase() === `$${node.value.toLowerCase()}`);
                        if (functionData?.code) {
                            const result = functionData.code(node.args);
                            if (result)
                                output.push(result);
                        }
                        break;
                    }
                    case ASTNodeType.CONDITIONAL: {
                        for (const branch of node.branches) {
                            if (branch.condition === 'true' || (0, shouw_js_1.CheckCondition)(branch.condition)) {
                                walk(branch.body);
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        };
        walk(parsed);
        return output.join('').trim();
    }
}
exports.AST = AST;
/**
 * The interpreter function
 *
 * @param {ShouwClient} client - The client instance
 * @param {T} code - The code to be executed
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {string} - The result of the code execution
 */
function Interpreter(client, code, config) {
    const tokens = Lexer_1.Lexer.run(code, client, config);
    const result = AST.run(tokens, client, code, config);
    return result;
}
