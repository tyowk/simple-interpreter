const { CodeError } = require('./error');
const { Lexer } = require('./lexer');

/**
 * Parses tokens into an AST
 *
 * @param {Array} tokens - Array of tokens
 * @returns {Array} AST - Abstract Syntax Tree
 * @example
 * parse([{ type: 'NUMBER', value: 1 }, { type: 'PLUS', value: '+' }, { type: 'NUMBER', value: 2 }]);
 */
function AbstractSyntaxTree (tokens, code) {
    let current = 0;

    /**
     * Peeks at the next token
     *
     * @param {number} offset - Offset from the current token
     * @returns {Object} token - The next token
     */
    function peek(offset = 0) {
        return tokens[current + offset];
    }

    /**
     * Consumes the next token
     *
     * @param {string} type - The type of token to consume
     * @returns {Object} token - The consumed token
     */
    function consume(type) {
        const token = tokens[current];
        if (!token || token.type !== type)
            throw new CodeError(`Expected ${type} at ${token?.start?.line}:${token?.start?.col}`, code, token?.index);
        current++;
        return token;
    }

    /**
     * Parses an expression
     *
     * @returns {Object} node - The parsed expression
     */
    function parseExpression() {
        return parseAssignment();
    }

    /**
     * Parses an assignment
     *
     * @returns {Object} node - The parsed assignment
     */
    function parseAssignment() {
        const expr = parseLogic();
        if (peek()?.type === 'ASSIGN') {
            consume('ASSIGN');

            if (expr.type !== 'Variable') throw new CodeError('Invalid left-hand assignment', code, expr?.index);

            return {
                type: 'Assignment',
                name: expr.name,
                value: parseExpression()
            };
        }

        return expr;
    }
    
    /**
     * Parses a logic expression
     *
     * @returns {Object} node - The parsed logic expression
     */
    function parseLogic() {
        let node = parseEquality();
        while (peek()?.type === 'AND' || peek()?.type === 'OR') {
            const op = consume(peek().type).type;
            node = { type: op, left: node, right: parseEquality() };
        }

        return node;
    }

    /**
     * Parses an equality expression
     *
     * @returns {Object} node - The parsed equality expression
     */
    function parseEquality() {
        let node = parseTerm();
        while (peek()?.type === 'EQ' || peek()?.type === 'NEQ') {
            const op = consume(peek().type).type;
            node = { type: op, left: node, right: parseTerm() };
        }

        return node;
    }

    /**
     * Parses a term
     *
     * @returns {Object} node - The parsed term
     */
    function parseTerm() {
        let node = parseFactor();
        while (peek()?.type === 'PLUS' || peek()?.type === 'MINUS') {
            const op = consume(peek().type).type;
            node = { type: op, left: node, right: parseFactor() };
        }

        return node;
    }

    /**
     * Parses a factor
     *
     * @returns {Object} node - The parsed factor
     */
    function parseFactor() {
        let node = parseUnary();
        while (peek()?.type === 'MUL' || peek()?.type === 'DIV') {
            const op = consume(peek().type).type;
            node = { type: op, left: node, right: parseUnary() };
        }

        return node;
    }

    /**
     * Parses a unary expression
     *
     * @returns {Object} node - The parsed unary expression
     */
    function parseUnary() {
        if (peek()?.type === 'MINUS') {
            consume('MINUS');
            return { type: 'NEGATE', value: parsePrimary() };
        }

        return parsePrimary();
    }

    /**
     * Parses a primary expression
     */
    function parsePrimary() {
        const token = peek();

        // Literals
        if (token.type === 'NUMBER') {
            consume('NUMBER');
            return { type: 'Literal', value: token.value };
        }

        // Booleans
        if (token.type === 'TRUE' || token.type === 'FALSE') {
            consume(token.type);
            return { type: 'Literal', value: token.type === 'TRUE' };
        }

        // Variables and function calls
        if (token.type === 'IDENT') {
            consume('IDENT');
            if (peek()?.type === 'LPAREN') {
                consume('LPAREN');
                const args = [];
                while (peek()?.type !== 'RPAREN') {
                    args.push(parseExpression());
                    if (peek()?.type === 'COMMA') consume('COMMA');
                }

                consume('RPAREN');
                return { type: 'Call', name: token.value, args };
            }

            return { type: 'Variable', name: token.value };
        }

        // Parentheses
        if (token.type === 'LPAREN') {
            consume('LPAREN');
            const expr = parseExpression();
            consume('RPAREN');
            return expr;
        }

        throw new CodeError(
            `Unexpected token ${token.type} at ${token.start.line}:${token.start.col}`,
            code,
            token.index
        );
    }

    /**
     * Parses a let statement
     *
     * @returns {Object} node - The parsed let statement
     */
    function parseLet() {
        consume('LET');
        const name = consume('IDENT').value;
        consume('ASSIGN');
        const value = parseExpression();
        return { type: 'Let', name, value };
    }

    /**
     * Parses a function definition
     *
     * @returns {Object} node - The parsed function definition
     */
    function parseFunctionDef() {
        consume('FUNCTION');
        const name = consume('IDENT').value;
        consume('LPAREN');
        const params = [];
        while (peek()?.type !== 'RPAREN') {
            params.push(consume('IDENT').value);
            if (peek()?.type === 'COMMA') consume('COMMA');
        }

        consume('RPAREN');
        consume('ASSIGN');
        const body = parseExpression();
        return { type: 'Function', name, params, body };
    }

    /**
     * Parses a top-level statement
     *
     * @returns {Object} node - The parsed top-level statement
     */
    function parseTopLevel() {
        if (peek()?.type === 'LET') return parseLet();
        if (peek()?.type === 'FUNCTION') return parseFunctionDef();
        return parseExpression();
    }

    const program = [];
    while (current < tokens.length) program.push(parseTopLevel());
    return program;
}

/**
 * Evaluates an AST
 *
 * @param {Array} program - Abstract Syntax Tree
 * @returns {any} result - The result of the evaluation
 * @example
 * evaluate([{ type: 'Literal', value: 1 }, { type: 'PLUS', left: { type: 'Literal', value: 2 }, right: { type: 'Literal', value: 3 } }]);
 */
function Interpreter (program) {
    const global = {};

    /**
     * Evaluates a node
     *
     * @param {Object} node - The node to evaluate
     * @param {Object} env - The environment to evaluate the node in
     * @returns {any} result - The result of the evaluation
     */
    function evalNode(node, env = global) {
        switch (node.type) {
            case 'Literal':
                return node.value;
            case 'Variable':
                if (!(node.name in env)) throw new Error(`Undefined variable: ${node.name}`);
                return env[node.name];
            case 'Assignment':
                env[node.name] = evalNode(node.value, env);
                return env[node.name];
            case 'Let':
                env[node.name] = evalNode(node.value, env);
                return null;
            case 'PLUS':
                return evalNode(node.left, env) + evalNode(node.right, env);
            case 'MINUS':
                return evalNode(node.left, env) - evalNode(node.right, env);
            case 'MUL':
                return evalNode(node.left, env) * evalNode(node.right, env);
            case 'DIV':
                return evalNode(node.left, env) / evalNode(node.right, env);
            case 'NEGATE':
                return -evalNode(node.value, env);
            case 'EQ':
                return evalNode(node.left, env) === evalNode(node.right, env);
            case 'NEQ':
                return evalNode(node.left, env) !== evalNode(node.right, env);
            case 'AND':
                return evalNode(node.left, env) && evalNode(node.right, env);
            case 'OR':
                return evalNode(node.left, env) || evalNode(node.right, env);
            case 'Function': {
                env[node.name] = (...args) => {
                    const localEnv = { ...env };
                    node.params.forEach((param, i) => (localEnv[param] = args[i]));
                    return evalNode(node.body, localEnv);
                };
                return null;
            }
            case 'Call': {
                const fn = env[node.name];
                if (typeof fn !== 'function') throw new Error(`Not a function: ${node.name}`);
                const argVals = node.args.map((arg) => evalNode(arg, env));
                return fn(...argVals);
            }
            default:
                return null;
        }
    }

    let last;
    for (const stmt of program) last = evalNode(stmt);
    return last;
}

/**
 * Runs code
 *
 * @param {string} code - Code to run
 * @returns {any} result - The result of the evaluation
 * @example
 * run('let x = 10 + 5');
 */
exports.Interpreter = (code) => {
    const tokens = Lexer(code);
    const ast = AbstractSyntaxTree(tokens, code);
    return Interpreter(ast);
}