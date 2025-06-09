const { CodeError } = require('./error');

/**
 * List of keywords
 * @type {Array<string>}
 */
const KEYWORDS = ['let', 'function', 'true', 'false'];

/**
 * Tokenizes input code into tokens
 *
 * @param {string} input - Input code
 * @returns {Array} tokens - Array of tokens
 * @example
 * tokenize('let x = 10 + 5');
 */
exports.Lexer = (input) => {
    const tokens = [];
    let i = 0;
    let line = 1;
    let col = 1;

    /**
     * Advances the current character and updates the line and column numbers
     *
     * @returns {string} char - The current character
     */
    function advance() {
        const char = input[i++];
        if (char === '\n') {
            line++;
            col = 1;
        } else col++;
        return char;
    }

    while (i < input.length) {
        const char = input[i];
        if (/\s/.test(char)) {
            advance();
            continue;
        }

        const start = { line, col };
        if (/\d/.test(char)) {
            let num = '';
            while (/\d/.test(input[i])) num += advance();
            tokens.push({ type: 'NUMBER', value: Number(num), start, index: i });
        } else if (char === ';') {
            advance();
        } else if (/[a-zA-Z_]/.test(char)) {
            let ident = '';
            while (/[a-zA-Z0-9_]/.test(input[i])) ident += advance();
            const type = KEYWORDS.includes(ident) ? ident.toUpperCase() : 'IDENT';
            tokens.push({ type, value: ident, start, index: i });
        } else {
            const twoChar = input.slice(i, i + 2);
            const oneChar = input[i];
            const symbols = {
                '+': 'PLUS',
                '-': 'MINUS',
                '*': 'MUL',
                '/': 'DIV',
                '=': 'ASSIGN',
                '==': 'EQ',
                '!=': 'NEQ',
                '(': 'LPAREN',
                ')': 'RPAREN',
                ',': 'COMMA',
                '{': 'LBRACE',
                '}': 'RBRACE',
                '&&': 'AND',
                '||': 'OR'
            };

            if (symbols[twoChar]) {
                tokens.push({ type: symbols[twoChar], start, index: i + 2 });
                advance();
                advance();
            } else if (symbols[oneChar]) {
                tokens.push({ type: symbols[oneChar], start, index: i });
                advance();
            } else {
                throw new CodeError(`Unexpected character '${char}' at ${line}:${col}`, input, i);
            }
        }
    }

    return tokens;
}