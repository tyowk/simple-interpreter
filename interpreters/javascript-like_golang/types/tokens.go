package types

type TokenType int

const (
	ILLEGAL TokenType = iota
	EOF
	IDENT
	INT
	STRING
	ASSIGN
	PLUS
	MINUS
	BANG
	ASTERISK
	SLASH
	LT
	GT
	COMMA
	SEMICOLON
	LPAREN
	RPAREN
	LBRACE
	RBRACE
	LBRACKET
	RBRACKET
	FUNCTION
	LET
	TRUE
	FALSE
	IF
	ELSE
	RETURN
	EQ
	NOT_EQ
	PRINT
	CLASS
	NEW
	THIS
	EXTENDS
	SUPER
	DOT
	COLON
	NULL
	COMMENT
)

func (t TokenType) String() string {
	switch t {
	case ILLEGAL:
		return "ILLEGAL"
	case EOF:
		return "EOF"
	case IDENT:
		return "IDENT"
	case INT:
		return "INT"
	case STRING:
		return "STRING"
	case ASSIGN:
		return "="
	case PLUS:
		return "+"
	case MINUS:
		return "-"
	case BANG:
		return "!"
	case ASTERISK:
		return "*"
	case SLASH:
		return "/"
	case LT:
		return "<"
	case GT:
		return ">"
	case COMMA:
		return ","
	case SEMICOLON:
		return ";"
	case LPAREN:
		return "("
	case RPAREN:
		return ")"
	case LBRACE:
		return "{"
	case RBRACE:
		return "}"
	case FUNCTION:
		return "FUNCTION"
	case LET:
		return "LET"
	case TRUE:
		return "TRUE"
	case FALSE:
		return "FALSE"
	case IF:
		return "IF"
	case ELSE:
		return "ELSE"
	case RETURN:
		return "RETURN"
	case EQ:
		return "=="
	case NOT_EQ:
		return "!="
	case PRINT:
		return "PRINT"
	case LBRACKET:
		return "["
	case RBRACKET:
		return "]"
	case CLASS:
		return "CLASS"
	case NEW:
		return "NEW"
	case THIS:
		return "THIS"
	case EXTENDS:
		return "EXTENDS"
	case SUPER:
		return "SUPER"
	case DOT:
		return "."
	case COLON:
		return ":"
	case NULL:
		return "NULL"
	case COMMENT:
		return "COMMENT"
	default:
		return "UNKNOWN"
	}
}

type Token struct {
	Type     TokenType
	Literal  string
	Position int
}

func NewToken(tokenType TokenType, literal string, position int) Token {
	return Token{
		Type:     tokenType,
		Literal:  literal,
		Position: position,
	}
}
