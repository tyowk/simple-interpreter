package lexer

import (
	"main/types"
)

type Lexer struct {
	input        string
	position     int
	readPosition int
	ch           byte
}

func New(input string) *Lexer {
	l := &Lexer{input: input}
	l.readChar()
	return l
}

func (l *Lexer) readChar() {
	if l.readPosition >= len(l.input) {
		l.ch = 0
	} else {
		l.ch = l.input[l.readPosition]
	}
	l.position = l.readPosition
	l.readPosition += 1
}

func (l *Lexer) peekChar() byte {
	if l.readPosition >= len(l.input) {
		return 0
	} else {
		return l.input[l.readPosition]
	}
}

func (l *Lexer) NextToken() types.Token {
	var tok types.Token

	l.skipWhitespace()

	switch l.ch {
	case '=':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			literal := string(ch) + string(l.ch)
			tok = types.NewToken(types.EQ, literal, l.position)
		} else {
			tok = types.NewToken(types.ASSIGN, string(l.ch), l.position)
		}
	case '+':
		tok = types.NewToken(types.PLUS, string(l.ch), l.position)
	case '-':
		tok = types.NewToken(types.MINUS, string(l.ch), l.position)
	case '!':
		if l.peekChar() == '=' {
			ch := l.ch
			l.readChar()
			literal := string(ch) + string(l.ch)
			tok = types.NewToken(types.NOT_EQ, literal, l.position)
		} else {
			tok = types.NewToken(types.BANG, string(l.ch), l.position)
		}
	case '/':
		if l.peekChar() == '/' {
			l.readLineComment()
			return l.NextToken()
		} else if l.peekChar() == '*' {
			l.readBlockComment()
			return l.NextToken()
		} else {
			tok = types.NewToken(types.SLASH, string(l.ch), l.position)
		}
	case '*':
		tok = types.NewToken(types.ASTERISK, string(l.ch), l.position)
	case '<':
		tok = types.NewToken(types.LT, string(l.ch), l.position)
	case '>':
		tok = types.NewToken(types.GT, string(l.ch), l.position)
	case ';':
		tok = types.NewToken(types.SEMICOLON, string(l.ch), l.position)
	case ',':
		tok = types.NewToken(types.COMMA, string(l.ch), l.position)
	case ':':
		tok = types.NewToken(types.COLON, string(l.ch), l.position)
	case '.':
		tok = types.NewToken(types.DOT, string(l.ch), l.position)
	case '{':
		tok = types.NewToken(types.LBRACE, string(l.ch), l.position)
	case '}':
		tok = types.NewToken(types.RBRACE, string(l.ch), l.position)
	case '[':
		tok = types.NewToken(types.LBRACKET, string(l.ch), l.position)
	case ']':
		tok = types.NewToken(types.RBRACKET, string(l.ch), l.position)
	case '(':
		tok = types.NewToken(types.LPAREN, string(l.ch), l.position)
	case ')':
		tok = types.NewToken(types.RPAREN, string(l.ch), l.position)
	case '"':
		tok.Type = types.STRING
		tok.Literal = l.readString()
		tok.Position = l.position
	case 0:
		tok.Literal = ""
		tok.Type = types.EOF
		tok.Position = l.position
	default:
		if isLetter(l.ch) {
			tok.Literal = l.readIdentifier()
			tok.Type = lookupIdent(tok.Literal)
			tok.Position = l.position
			return tok
		} else if isDigit(l.ch) {
			tok.Type = types.INT
			tok.Literal = l.readNumber()
			tok.Position = l.position
			return tok
		} else {
			tok = types.NewToken(types.ILLEGAL, string(l.ch), l.position)
		}
	}

	l.readChar()
	return tok
}

func (l *Lexer) skipWhitespace() {
	for l.ch == ' ' || l.ch == '\t' || l.ch == '\n' || l.ch == '\r' {
		l.readChar()
	}
}

func (l *Lexer) readIdentifier() string {
	position := l.position
	for isLetter(l.ch) {
		l.readChar()
	}
	return l.input[position:l.position]
}

func (l *Lexer) readNumber() string {
	position := l.position
	for isDigit(l.ch) {
		l.readChar()
	}
	return l.input[position:l.position]
}

func (l *Lexer) readString() string {
	position := l.position + 1
	for {
		l.readChar()
		if l.ch == '"' || l.ch == 0 {
			break
		}
	}
	return l.input[position:l.position]
}

func (l *Lexer) readLineComment() {
	for l.ch != '\n' && l.ch != 0 {
		l.readChar()
	}
}

func (l *Lexer) readBlockComment() {
	l.readChar()
	l.readChar()
	for {
		if l.ch == '*' && l.peekChar() == '/' {
			l.readChar()
			l.readChar()
			break
		}
		if l.ch == 0 {
			break
		}
		l.readChar()
	}
}

func isLetter(ch byte) bool {
	return 'a' <= ch && ch <= 'z' || 'A' <= ch && ch <= 'Z' || ch == '_'
}

func isDigit(ch byte) bool {
	return '0' <= ch && ch <= '9'
}

func lookupIdent(ident string) types.TokenType {
	keywords := map[string]types.TokenType{
		"func":   types.FUNCTION,
		"let":    types.LET,
		"true":   types.TRUE,
		"false":  types.FALSE,
		"if":     types.IF,
		"else":   types.ELSE,
		"return": types.RETURN,
		"print":  types.PRINT,
		/*"class":   types.CLASS,
		"new":     types.NEW,
		"this":    types.THIS,
		"extends": types.EXTENDS,
		"super":   types.SUPER,*/
		"null": types.NULL,
	}

	if tok, ok := keywords[ident]; ok {
		return tok
	}
	return types.IDENT
}
