import { Lexer, type Token, TokenType } from './Lexer';
import type { ShouwClient } from './Client';
import { CheckCondition } from 'shouw.js';
import { CodeError } from './Error';

export enum ASTNodeType {
    CONDITIONAL = 'CONDITIONAL',
    FUNCTION = 'FUNCTION',
    TEXT = 'TEXT'
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
export class AST {
    private tokens: Token[] = [];
    private code = '';
    private index = 0;
    private config?: InterpreterConfig;
    private client?: ShouwClient;

    /**
     * Run the AST
     *
     * @param {Token[]} tokens - The tokens to be parsed
     * @param {ShouwClient} client - The client instance
     * @param {string} code - The code to be executed
     * @param {InterpreterConfig} [config] - The interpreter config
     * @return {string} - The result of the code execution
     */
    public static run(tokens: Token[], client: ShouwClient, code: string, config?: InterpreterConfig): string {
        return new AST().evaluate(tokens, client, code, config);
    }

    /**
     * Parse the tokens and evaluate the code
     *
     * @return {ASTNode[]} - The parsed nodes
     */
    private parse(): ASTNode[] {
        const nodes: ASTNode[] = [];
        while (this.index < this.tokens.length) {
            const token: Token = this.tokens[this.index];
            switch (token.type) {
                case TokenType.IF:
                    nodes.push(this.parseConditional());
                    break;
                case TokenType.ELSEIF:
                case TokenType.ELSE:
                case TokenType.ENDIF:
                    throw new CodeError(
                        `$${token.type.toLowerCase()} cannot be used outside of an $if block`,
                        token.metadata?.line,
                        token.metadata?.column,
                        this.code,
                        this.config
                    );
                case TokenType.FUNCTION:
                    nodes.push({
                        type: ASTNodeType.FUNCTION,
                        value: token.name ?? '',
                        args: token.metadata?.args ?? []
                    });
                    this.index++;
                    break;
                case TokenType.TEXT:
                    nodes.push({ type: ASTNodeType.TEXT, value: token.name ?? '' });
                    this.index++;
                    break;
                case TokenType.EOF:
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
    private parseConditional(): ASTConditionalNode {
        const branches: ASTConditionalBranch[] = [];
        let hasEndif = false;

        const readBlock = (): ASTNode[] => {
            const body: ASTNode[] = [];
            while (this.index < this.tokens.length) {
                const token: Token = this.tokens[this.index];
                if ([TokenType.ELSEIF, TokenType.ELSE, TokenType.ENDIF].includes(token.type)) break;
                switch (token.type) {
                    case TokenType.IF:
                        body.push(this.parseConditional());
                        break;
                    case TokenType.FUNCTION:
                        body.push({
                            type: ASTNodeType.FUNCTION,
                            value: token.name ?? '',
                            args: token.metadata?.args ?? []
                        });
                        this.index++;
                        break;
                    case TokenType.TEXT:
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
            const token: Token = this.tokens[this.index];
            if (token.type === TokenType.IF || token.type === TokenType.ELSEIF) {
                const condition: string = token.metadata?.args?.[0] ?? '';
                this.index++;
                const body = readBlock();
                branches.push({ condition, body });
            } else if (token.type === TokenType.ELSE) {
                this.index++;
                const body = readBlock();
                branches.push({ condition: 'true', body });
            } else if (token.type === TokenType.ENDIF) {
                this.index++;
                hasEndif = true;
                break;
            } else {
                this.index++;
            }
        }

        if (!hasEndif) {
            const first = branches[0];
            throw new CodeError(
                `Missing $endif for $if[${first.condition}]`,
                this.tokens[this.index - 1]?.metadata?.line,
                this.tokens[this.index - 1]?.metadata?.column,
                this.code,
                this.config
            );
        }

        return { type: ASTNodeType.CONDITIONAL, branches };
    }

    /**
     * Check if the number of $endif is equal to the number of $if
     *
     * @param {Token[]} tokens - The tokens to be checked
     * @return {boolean} - True if the number of $endif is equal to the number of $if
     */
    private isEndifCountEquals(tokens: Token[]): boolean {
        let endifCount = 0;
        let ifCount = 0;
        for (const token of tokens) {
            if (token.type === TokenType.IF) ifCount++;
            if (token.type === TokenType.ENDIF) endifCount++;
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
    public evaluate(tokens: Token[], client: ShouwClient, code: string, config?: InterpreterConfig): string {
        this.tokens = tokens;
        this.code = code;
        this.config = config;
        this.client = client;

        if (!this.isEndifCountEquals(tokens)) {
            const lastIf = tokens.findLast((t) => t.type === TokenType.IF);
            const meta = lastIf?.metadata;
            throw new CodeError('Missing $endif for $if', meta?.line, meta?.column, this.code, this.config);
        }

        const output: string[] = [];
        const parsed: ASTNode[] = this.parse();

        const walk = (nodes: ASTNode[]): void => {
            for (const node of nodes) {
                switch (node.type) {
                    case ASTNodeType.TEXT: {
                        output.push(node.value);
                        break;
                    }
                    case ASTNodeType.FUNCTION: {
                        const functionData = this.client?.functions.find(
                            (f) => f.name.toLowerCase() === `$${node.value.toLowerCase()}`
                        );
                        if (functionData?.code) {
                            const result = functionData.code(node.args);
                            if (result) output.push(result);
                        }
                        break;
                    }
                    case ASTNodeType.CONDITIONAL: {
                        for (const branch of node.branches) {
                            if (branch.condition === 'true' || CheckCondition(branch.condition)) {
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

/**
 * The interpreter function
 *
 * @param {ShouwClient} client - The client instance
 * @param {T} code - The code to be executed
 * @param {InterpreterConfig} [config] - The interpreter config
 * @return {string} - The result of the code execution
 */
export function Interpreter<T extends string>(client: ShouwClient, code: T, config?: InterpreterConfig): string {
    const tokens = Lexer.run(code, client, config);
    const result = AST.run(tokens, client, code, config);
    return result;
}
