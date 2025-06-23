package parser

import (
	"fmt"
	"main/ast"
	"main/lexer"
	"main/types"
	"strconv"
)

const (
	_ int = iota
	LOWEST
	EQUALS
	LESSGREATER
	SUM
	PRODUCT
	PREFIX
	CALL
	INDEX
)

var precedences = map[types.TokenType]int{
	types.ASSIGN:   LOWEST,
	types.EQ:       EQUALS,
	types.NOT_EQ:   EQUALS,
	types.LT:       LESSGREATER,
	types.GT:       LESSGREATER,
	types.PLUS:     SUM,
	types.MINUS:    SUM,
	types.SLASH:    PRODUCT,
	types.ASTERISK: PRODUCT,
	types.LPAREN:   CALL,
	types.LBRACKET: INDEX,
	types.DOT:      INDEX,
}

type (
	prefixParseFn func() ast.Expression
	infixParseFn  func(ast.Expression) ast.Expression
)

type Parser struct {
	l *lexer.Lexer

	errors []string

	curToken  types.Token
	peekToken types.Token

	prefixParseFns map[types.TokenType]prefixParseFn
	infixParseFns  map[types.TokenType]infixParseFn
}

func New(l *lexer.Lexer) *Parser {
	p := &Parser{
		l:      l,
		errors: []string{},
	}

	p.prefixParseFns = make(map[types.TokenType]prefixParseFn)
	p.registerPrefix(types.IDENT, p.parseIdentifier)
	p.registerPrefix(types.INT, p.parseIntegerLiteral)
	p.registerPrefix(types.STRING, p.parseStringLiteral)
	p.registerPrefix(types.BANG, p.parsePrefixExpression)
	p.registerPrefix(types.MINUS, p.parsePrefixExpression)
	p.registerPrefix(types.TRUE, p.parseBoolean)
	p.registerPrefix(types.FALSE, p.parseBoolean)
	p.registerPrefix(types.LPAREN, p.parseGroupedExpression)
	p.registerPrefix(types.IF, p.parseIfExpression)
	p.registerPrefix(types.FUNCTION, p.parseFunctionLiteral)
	p.registerPrefix(types.PRINT, p.parsePrintStatement)
	p.registerPrefix(types.LBRACKET, p.parseArrayLiteral)
	p.registerPrefix(types.LBRACE, p.parseObjectLiteral)
	p.registerPrefix(types.NEW, p.parseNewExpression)
	p.registerPrefix(types.THIS, p.parseThisExpression)
	p.registerPrefix(types.SUPER, p.parseSuperExpression)
	p.registerPrefix(types.NULL, p.parseNullExpression)
	p.infixParseFns = make(map[types.TokenType]infixParseFn)
	p.registerInfix(types.PLUS, p.parseInfixExpression)
	p.registerInfix(types.MINUS, p.parseInfixExpression)
	p.registerInfix(types.SLASH, p.parseInfixExpression)
	p.registerInfix(types.ASTERISK, p.parseInfixExpression)
	p.registerInfix(types.EQ, p.parseInfixExpression)
	p.registerInfix(types.NOT_EQ, p.parseInfixExpression)
	p.registerInfix(types.LT, p.parseInfixExpression)
	p.registerInfix(types.GT, p.parseInfixExpression)
	p.registerInfix(types.LPAREN, p.parseCallExpression)
	p.registerInfix(types.LBRACKET, p.parseIndexExpression)
	p.registerInfix(types.DOT, p.parsePropertyExpression)
	p.registerInfix(types.ASSIGN, p.parseAssignmentExpression)

	p.nextToken()
	p.nextToken()

	return p
}

func (p *Parser) nextToken() {
	p.curToken = p.peekToken
	p.peekToken = p.l.NextToken()
}

func (p *Parser) ParseProgram() *ast.Program {
	program := &ast.Program{}
	program.Statements = []ast.Statement{}

	for p.curToken.Type != types.EOF {
		stmt := p.parseStatement()
		if stmt != nil {
			program.Statements = append(program.Statements, stmt)
		}
		p.nextToken()
	}

	return program
}

func (p *Parser) parseStatement() ast.Statement {
	switch p.curToken.Type {
	case types.LET:
		return p.parseLetStatement()
	case types.RETURN:
		return p.parseReturnStatement()
	case types.CLASS:
		return p.parseClassStatement()
	default:
		return p.parseExpressionStatement()
	}
}

func (p *Parser) parseLetStatement() *ast.LetStatement {
	stmt := &ast.LetStatement{Token: p.curToken}

	if !p.expectPeek(types.IDENT) {
		return nil
	}

	stmt.Name = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}

	if !p.expectPeek(types.ASSIGN) {
		return nil
	}

	p.nextToken()

	stmt.Value = p.parseExpression(LOWEST)

	if p.peekTokenIs(types.SEMICOLON) {
		p.nextToken()
	}

	return stmt
}

func (p *Parser) parseReturnStatement() *ast.ReturnStatement {
	stmt := &ast.ReturnStatement{Token: p.curToken}

	p.nextToken()

	stmt.ReturnValue = p.parseExpression(LOWEST)

	if p.peekTokenIs(types.SEMICOLON) {
		p.nextToken()
	}

	return stmt
}

func (p *Parser) parseClassStatement() *ast.ClassStatement {
	stmt := &ast.ClassStatement{Token: p.curToken}

	if !p.expectPeek(types.IDENT) {
		return nil
	}

	stmt.Name = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}

	if p.peekTokenIs(types.EXTENDS) {
		p.nextToken()
		if !p.expectPeek(types.IDENT) {
			return nil
		}
		stmt.SuperClass = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}
		fmt.Println(stmt.SuperClass)
	}

	if !p.expectPeek(types.LBRACE) {
		return nil
	}

	stmt.Methods = []*ast.FunctionLiteral{}

	for !p.curTokenIs(types.RBRACE) && !p.curTokenIs(types.EOF) {
		if p.curToken.Type == types.LET {
			if !p.expectPeek(types.IDENT) {
				p.nextToken()
				continue
			}

			methodName := p.curToken.Literal

			if !p.expectPeek(types.ASSIGN) {
				p.nextToken()
				continue
			}

			if !p.expectPeek(types.FUNCTION) {
				p.nextToken()
				continue
			}

			method := p.parseFunctionLiteral()
			if method != nil {
				functionLiteral := method.(*ast.FunctionLiteral)
				methodIdent := &ast.Identifier{Token: types.NewToken(types.IDENT, methodName, 0), Value: methodName}
				functionLiteral.Parameters = append([]*ast.Identifier{methodIdent}, functionLiteral.Parameters...)
				stmt.Methods = append(stmt.Methods, functionLiteral)
			}
		}
		p.nextToken()
	}

	return stmt
}

func (p *Parser) parseExpressionStatement() *ast.ExpressionStatement {
	stmt := &ast.ExpressionStatement{Token: p.curToken}

	stmt.Expression = p.parseExpression(LOWEST)

	if p.peekTokenIs(types.SEMICOLON) {
		p.nextToken()
	}

	return stmt
}

func (p *Parser) parseExpression(precedence int) ast.Expression {
	prefix := p.prefixParseFns[p.curToken.Type]
	if prefix == nil {
		p.noPrefixParseFnError(p.curToken.Type)
		return nil
	}
	leftExp := prefix()

	for !p.peekTokenIs(types.SEMICOLON) && precedence < p.peekPrecedence() {
		infix := p.infixParseFns[p.peekToken.Type]
		if infix == nil {
			return leftExp
		}

		p.nextToken()

		leftExp = infix(leftExp)
	}

	return leftExp
}

func (p *Parser) parseIdentifier() ast.Expression {
	return &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}
}

func (p *Parser) parseIntegerLiteral() ast.Expression {
	lit := &ast.IntegerLiteral{Token: p.curToken}

	value, err := strconv.ParseInt(p.curToken.Literal, 0, 64)
	if err != nil {
		msg := fmt.Sprintf("could not parse %q as integer", p.curToken.Literal)
		p.errors = append(p.errors, msg)
		return nil
	}

	lit.Value = value
	return lit
}

func (p *Parser) parseStringLiteral() ast.Expression {
	return &ast.StringLiteral{Token: p.curToken, Value: p.curToken.Literal}
}

func (p *Parser) parseArrayLiteral() ast.Expression {
	array := &ast.ArrayLiteral{Token: p.curToken}
	array.Elements = p.parseExpressionList(types.RBRACKET)
	return array
}

func (p *Parser) parseObjectLiteral() ast.Expression {
	obj := &ast.ObjectLiteral{Token: p.curToken}
	obj.Pairs = make(map[ast.Expression]ast.Expression)

	for !p.peekTokenIs(types.RBRACE) && !p.peekTokenIs(types.EOF) {
		p.nextToken()

		key := p.parseExpression(LOWEST)

		if !p.expectPeek(types.COLON) {
			return nil
		}

		p.nextToken()
		value := p.parseExpression(LOWEST)

		obj.Pairs[key] = value

		if !p.peekTokenIs(types.RBRACE) && !p.expectPeek(types.COMMA) {
			return nil
		}
	}

	if !p.expectPeek(types.RBRACE) {
		return nil
	}

	return obj
}

func (p *Parser) parseNewExpression() ast.Expression {
	exp := &ast.NewExpression{Token: p.curToken}

	if !p.expectPeek(types.IDENT) {
		return nil
	}

	exp.Class = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}

	if !p.expectPeek(types.LPAREN) {
		return nil
	}

	exp.Arguments = p.parseExpressionList(types.RPAREN)

	return exp
}

func (p *Parser) parseThisExpression() ast.Expression {
	return &ast.ThisExpression{Token: p.curToken}
}

func (p *Parser) parseSuperExpression() ast.Expression {
	return &ast.SuperExpression{Token: p.curToken}
}

func (p *Parser) parseNullExpression() ast.Expression {
	return &ast.NullExpression{Token: p.curToken}
}

func (p *Parser) parsePrefixExpression() ast.Expression {
	expression := &ast.PrefixExpression{
		Token:    p.curToken,
		Operator: p.curToken.Literal,
	}

	p.nextToken()

	expression.Right = p.parseExpression(PREFIX)

	return expression
}

func (p *Parser) parseInfixExpression(left ast.Expression) ast.Expression {
	expression := &ast.InfixExpression{
		Token:    p.curToken,
		Left:     left,
		Operator: p.curToken.Literal,
	}

	precedence := p.curPrecedence()
	p.nextToken()
	expression.Right = p.parseExpression(precedence)

	return expression
}

func (p *Parser) parseIndexExpression(left ast.Expression) ast.Expression {
	exp := &ast.IndexExpression{Token: p.curToken, Left: left}

	p.nextToken()
	exp.Index = p.parseExpression(LOWEST)

	if !p.expectPeek(types.RBRACKET) {
		return nil
	}

	return exp
}

func (p *Parser) parsePropertyExpression(left ast.Expression) ast.Expression {
	exp := &ast.PropertyExpression{Token: p.curToken, Object: left}

	if !p.expectPeek(types.IDENT) {
		return nil
	}

	exp.Property = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}

	return exp
}

func (p *Parser) parseAssignmentExpression(left ast.Expression) ast.Expression {
	exp := &ast.AssignmentExpression{Token: p.curToken, Left: left}

	p.nextToken()
	exp.Value = p.parseExpression(LOWEST)

	return exp
}

func (p *Parser) parseBoolean() ast.Expression {
	return &ast.Boolean{Token: p.curToken, Value: p.curTokenIs(types.TRUE)}
}

func (p *Parser) parseGroupedExpression() ast.Expression {
	p.nextToken()

	exp := p.parseExpression(LOWEST)

	if !p.expectPeek(types.RPAREN) {
		return nil
	}

	return exp
}

func (p *Parser) parseIfExpression() ast.Expression {
	expression := &ast.IfExpression{Token: p.curToken}

	if !p.expectPeek(types.LPAREN) {
		return nil
	}

	p.nextToken()
	expression.Condition = p.parseExpression(LOWEST)

	if !p.expectPeek(types.RPAREN) {
		return nil
	}

	if !p.expectPeek(types.LBRACE) {
		return nil
	}

	expression.Consequence = p.parseBlockStatement()

	if p.peekTokenIs(types.ELSE) {
		p.nextToken()

		if !p.expectPeek(types.LBRACE) {
			return nil
		}

		expression.Alternative = p.parseBlockStatement()
	}

	return expression
}

func (p *Parser) parseBlockStatement() *ast.BlockStatement {
	block := &ast.BlockStatement{Token: p.curToken}
	block.Statements = []ast.Statement{}

	p.nextToken()

	for !p.curTokenIs(types.RBRACE) && !p.curTokenIs(types.EOF) {
		stmt := p.parseStatement()
		if stmt != nil {
			block.Statements = append(block.Statements, stmt)
		}
		p.nextToken()
	}

	return block
}

func (p *Parser) parseFunctionLiteral() ast.Expression {
	lit := &ast.FunctionLiteral{Token: p.curToken}

	if !p.expectPeek(types.LPAREN) {
		return nil
	}

	lit.Parameters = p.parseFunctionParameters()

	if !p.expectPeek(types.LBRACE) {
		return nil
	}

	lit.Body = p.parseBlockStatement()

	return lit
}

func (p *Parser) parseFunctionParameters() []*ast.Identifier {
	identifiers := []*ast.Identifier{}

	if p.peekTokenIs(types.RPAREN) {
		p.nextToken()
		return identifiers
	}

	p.nextToken()

	ident := &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}
	identifiers = append(identifiers, ident)

	for p.peekTokenIs(types.COMMA) {
		p.nextToken()
		p.nextToken()
		ident := &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}
		identifiers = append(identifiers, ident)
	}

	if !p.expectPeek(types.RPAREN) {
		return nil
	}

	return identifiers
}

func (p *Parser) parsePrintStatement() ast.Expression {
	exp := &ast.CallExpression{Token: p.curToken}
	exp.Function = &ast.Identifier{Token: p.curToken, Value: p.curToken.Literal}

	if !p.expectPeek(types.LPAREN) {
		return nil
	}

	exp.Arguments = p.parseExpressionList(types.RPAREN)
	return exp
}

func (p *Parser) parseCallExpression(fn ast.Expression) ast.Expression {
	exp := &ast.CallExpression{Token: p.curToken, Function: fn}
	exp.Arguments = p.parseExpressionList(types.RPAREN)
	return exp
}

func (p *Parser) parseExpressionList(end types.TokenType) []ast.Expression {
	args := []ast.Expression{}

	if p.peekTokenIs(end) {
		p.nextToken()
		return args
	}

	p.nextToken()
	args = append(args, p.parseExpression(LOWEST))

	for p.peekTokenIs(types.COMMA) {
		p.nextToken()
		p.nextToken()
		args = append(args, p.parseExpression(LOWEST))
	}

	if !p.expectPeek(end) {
		return nil
	}

	return args
}

func (p *Parser) curTokenIs(t types.TokenType) bool {
	return p.curToken.Type == t
}

func (p *Parser) peekTokenIs(t types.TokenType) bool {
	return p.peekToken.Type == t
}

func (p *Parser) expectPeek(t types.TokenType) bool {
	if p.peekTokenIs(t) {
		p.nextToken()
		return true
	} else {
		p.peekError(t)
		return false
	}
}

func (p *Parser) Errors() []string {
	return p.errors
}

func (p *Parser) peekError(t types.TokenType) {
	msg := fmt.Sprintf("expected next token to be %s, got %s instead",
		t, p.peekToken.Type)
	p.errors = append(p.errors, msg)
}

func (p *Parser) registerPrefix(tokenType types.TokenType, fn prefixParseFn) {
	p.prefixParseFns[tokenType] = fn
}

func (p *Parser) registerInfix(tokenType types.TokenType, fn infixParseFn) {
	p.infixParseFns[tokenType] = fn
}

func (p *Parser) noPrefixParseFnError(t types.TokenType) {
	msg := fmt.Sprintf("no prefix parse function for %s found", t)
	p.errors = append(p.errors, msg)
}

func (p *Parser) peekPrecedence() int {
	if p, ok := precedences[p.peekToken.Type]; ok {
		return p
	}

	return LOWEST
}

func (p *Parser) curPrecedence() int {
	if p, ok := precedences[p.curToken.Type]; ok {
		return p
	}

	return LOWEST
}
