package run

import (
	"fmt"
	"main/ast"
)

type Environment struct {
	store map[string]Object
	outer *Environment
}

func NewEnvironment() *Environment {
	s := make(map[string]Object)
	return &Environment{store: s, outer: nil}
}

func NewEnclosedEnvironment(outer *Environment) *Environment {
	env := NewEnvironment()
	env.outer = outer
	return env
}

func (e *Environment) Get(name string) (Object, bool) {
	value, ok := e.store[name]
	if !ok && e.outer != nil {
		value, ok = e.outer.Get(name)
	}
	return value, ok
}

func (e *Environment) Set(name string, val Object) Object {
	e.store[name] = val
	return val
}

var builtins = map[string]*Builtin{
	"print": {
		Fn: func(args ...Object) Object {
			for _, arg := range args {
				fmt.Println(arg.Inspect())
			}
			return NULL
		},
	},
	"len": {
		Fn: func(args ...Object) Object {
			if len(args) != 1 {
				return newError("wrong number of arguments. got=%d, want=1", len(args))
			}

			switch arg := args[0].(type) {
			case *Array:
				return &Integer{Value: int64(len(arg.Elements))}
			case *String:
				return &Integer{Value: int64(len(arg.Value))}
			default:
				return newError("argument to `len` not supported, got %T", arg)
			}
		},
	},
	"push": {
		Fn: func(args ...Object) Object {
			if len(args) != 2 {
				return newError("wrong number of arguments. got=%d, want=2", len(args))
			}

			if args[0].Type() != ARRAY_OBJ {
				return newError("argument to `push` must be ARRAY, got %T", args[0])
			}

			arr := args[0].(*Array)
			length := len(arr.Elements)

			newElements := make([]Object, length+1, length+1)
			copy(newElements, arr.Elements)
			newElements[length] = args[1]

			return &Array{Elements: newElements}
		},
	},
}

func Eval(node ast.Node, env *Environment) Object {
	switch node := node.(type) {

	case *ast.Program:
		return evalProgram(node, env)

	case *ast.BlockStatement:
		return evalBlockStatement(node, env)

	case *ast.ExpressionStatement:
		return Eval(node.Expression, env)

	case *ast.ReturnStatement:
		val := Eval(node.ReturnValue, env)
		if isError(val) {
			return val
		}
		return &ReturnValue{Value: val}

	case *ast.LetStatement:
		val := Eval(node.Value, env)
		if isError(val) {
			return val
		}
		env.Set(node.Name.Value, val)
		return NULL

	case *ast.ClassStatement:
		return evalClassStatement(node, env)

	case *ast.IntegerLiteral:
		return &Integer{Value: node.Value}

	case *ast.StringLiteral:
		return &String{Value: node.Value}

	case *ast.ArrayLiteral:
		elements := evalExpressions(node.Elements, env)
		if len(elements) == 1 && isError(elements[0]) {
			return elements[0]
		}
		return &Array{Elements: elements}

	case *ast.ObjectLiteral:
		return evalObjectLiteral(node, env)

	case *ast.IndexExpression:
		left := Eval(node.Left, env)
		if isError(left) {
			return left
		}
		index := Eval(node.Index, env)
		if isError(index) {
			return index
		}
		return evalIndexExpression(left, index)

	case *ast.PropertyExpression:
		object := Eval(node.Object, env)
		if isError(object) {
			return object
		}
		return evalPropertyExpression(object, node.Property.Value)

	case *ast.AssignmentExpression:
		return evalAssignmentExpression(node, env)

	case *ast.NewExpression:
		class := Eval(node.Class, env)
		if isError(class) {
			return class
		}
		args := evalExpressions(node.Arguments, env)
		if len(args) == 1 && isError(args[0]) {
			return args[0]
		}
		return evalNewExpression(class, args)

	case *ast.ThisExpression:
		return evalThisExpression(env)

	case *ast.SuperExpression:
		return evalSuperExpression(env)

	case *ast.NullExpression:
		return NULL

	case *ast.Boolean:
		return nativeBoolToPyMonkeyBoolean(node.Value)

	case *ast.PrefixExpression:
		right := Eval(node.Right, env)
		if isError(right) {
			return right
		}
		return evalPrefixExpression(node.Operator, right)

	case *ast.InfixExpression:
		left := Eval(node.Left, env)
		if isError(left) {
			return left
		}

		right := Eval(node.Right, env)
		if isError(right) {
			return right
		}

		return evalInfixExpression(node.Operator, left, right)

	case *ast.IfExpression:
		return evalIfExpression(node, env)

	case *ast.Identifier:
		return evalIdentifier(node, env)

	case *ast.FunctionLiteral:
		params := node.Parameters
		body := node.Body
		return &Function{Parameters: params, Env: env, Body: body}

	case *ast.CallExpression:
		function := Eval(node.Function, env)
		if isError(function) {
			return function
		}

		args := evalExpressions(node.Arguments, env)
		if len(args) == 1 && isError(args[0]) {
			return args[0]
		}

		return applyFunction(function, args)

	}

	return newError("unknown node type: %T", node)
}

func evalProgram(program *ast.Program, env *Environment) Object {
	var result Object

	for _, statement := range program.Statements {
		result = Eval(statement, env)

		switch result := result.(type) {
		case *ReturnValue:
			return result.Value
		case *Error:
			return result
		}
	}

	return result
}

func evalBlockStatement(block *ast.BlockStatement, env *Environment) Object {
	var result Object

	for _, statement := range block.Statements {
		result = Eval(statement, env)

		if result != nil {
			rt := result.Type()
			if rt == RETURN_VALUE_OBJ || rt == ERROR_OBJ {
				return result
			}
		}
	}

	return result
}

func evalClassStatement(node *ast.ClassStatement, env *Environment) Object {
	class := &Class{
		Name:    node.Name.Value,
		Methods: make(map[string]*Function),
		Env:     env,
	}

	if node.SuperClass != nil {
		superClass := Eval(node.SuperClass, env)
		if isError(superClass) {
			return superClass
		}
		if superClass.Type() != CLASS_OBJ {
			return newError("superclass must be a class, got %T", superClass)
		}
		class.SuperClass = superClass.(*Class)
	}

	for _, method := range node.Methods {
		methodName := "constructor"
		var parameters []*ast.Identifier

		if len(method.Parameters) > 0 {
			methodName = method.Parameters[0].Value
			parameters = method.Parameters[1:]
		} else {
			parameters = method.Parameters
		}

		class.Methods[methodName] = &Function{
			Parameters: parameters,
			Body:       method.Body,
			Env:        env,
		}
	}

	env.Set(node.Name.Value, class)
	return NULL
}

func evalObjectLiteral(node *ast.ObjectLiteral, env *Environment) Object {
	pairs := make(map[string]HashPair)

	for keyNode, valueNode := range node.Pairs {
		key := Eval(keyNode, env)
		if isError(key) {
			return key
		}

		value := Eval(valueNode, env)
		if isError(value) {
			return value
		}

		pairs[key.Inspect()] = HashPair{Key: key, Value: value}
	}

	return &Hash{Pairs: pairs}
}

func evalIndexExpression(left, index Object) Object {
	switch {
	case left.Type() == ARRAY_OBJ && index.Type() == INTEGER_OBJ:
		return evalArrayIndexExpression(left, index)
	case left.Type() == HASH_OBJ:
		return evalHashIndexExpression(left, index)
	default:
		return newError("index operator not supported: %s", left.Type())
	}
}

func evalArrayIndexExpression(array, index Object) Object {
	arrayObject := array.(*Array)
	idx := index.(*Integer).Value
	max := int64(len(arrayObject.Elements) - 1)

	if idx < 0 || idx > max {
		return NULL
	}

	return arrayObject.Elements[idx]
}

func evalHashIndexExpression(hash, index Object) Object {
	hashObject := hash.(*Hash)
	pair, ok := hashObject.Pairs[index.Inspect()]
	if !ok {
		return NULL
	}
	return pair.Value
}

func evalPropertyExpression(object Object, property string) Object {
	switch obj := object.(type) {
	case *Instance:
		if prop, ok := obj.Properties[property]; ok {
			return prop
		}
		if method, ok := obj.Class.Methods[property]; ok {
			return &BoundMethod{
				Method:   method,
				Instance: obj,
			}
		}
		return newError("property %s not found", property)
	case *Hash:
		if pair, ok := obj.Pairs[property]; ok {
			return pair.Value
		}
		return NULL
	default:
		return newError("property access not supported on %T", object)
	}
}

func evalAssignmentExpression(node *ast.AssignmentExpression, env *Environment) Object {
	value := Eval(node.Value, env)
	if isError(value) {
		return value
	}

	switch left := node.Left.(type) {
	case *ast.Identifier:
		env.Set(left.Value, value)
		return value
	case *ast.PropertyExpression:
		object := Eval(left.Object, env)
		if isError(object) {
			return object
		}

		instance, ok := object.(*Instance)
		if !ok {
			return newError("cannot assign to property of non-instance: %T", object)
		}

		propertyName := left.Property.Value
		instance.Properties[propertyName] = value
		return value
	default:
		return newError("invalid left-hand side of assignment: %T", node.Left)
	}
}

func evalNewExpression(class Object, args []Object) Object {
	if class.Type() != CLASS_OBJ {
		return newError("not a class: %T", class)
	}

	classObj := class.(*Class)
	instance := &Instance{
		Class:      classObj,
		Properties: make(map[string]Object),
	}

	for methodName, method := range classObj.Methods {
		boundMethod := &Function{
			Parameters: method.Parameters,
			Body:       method.Body,
			Env:        method.Env,
		}
		instance.Properties[methodName] = boundMethod
	}

	if constructor, ok := classObj.Methods["constructor"]; ok {
		extendedEnv := extendFunctionEnv(constructor, args)
		extendedEnv.Set("this", instance)

		if classObj.SuperClass != nil {
			extendedEnv.Set("super", classObj.SuperClass)
		}

		result := Eval(constructor.Body, extendedEnv)
		if isError(result) {
			return result
		}
	}

	return instance
}

func evalThisExpression(env *Environment) Object {
	if this, ok := env.Get("this"); ok {
		return this
	}
	return newError("'this' not found in current context")
}

func evalSuperExpression(env *Environment) Object {
	if super, ok := env.Get("super"); ok {
		return super
	}
	return newError("'super' not found in current context")
}

func nativeBoolToPyMonkeyBoolean(input bool) *Boolean {
	if input {
		return TRUE
	}
	return FALSE
}

func evalPrefixExpression(operator string, right Object) Object {
	switch operator {
	case "!":
		return evalBangOperatorExpression(right)
	case "-":
		return evalMinusPrefixOperatorExpression(right)
	default:
		return newError("unknown operator: %s%s", operator, right.Type())
	}
}

func evalInfixExpression(
	operator string,
	left, right Object,
) Object {
	switch {
	case left.Type() == INTEGER_OBJ && right.Type() == INTEGER_OBJ:
		return evalIntegerInfixExpression(operator, left, right)
	case left.Type() == STRING_OBJ && right.Type() == STRING_OBJ:
		return evalStringInfixExpression(operator, left, right)
	case operator == "==":
		return nativeBoolToPyMonkeyBoolean(left == right)
	case operator == "!=":
		return nativeBoolToPyMonkeyBoolean(left != right)
	case left.Type() != right.Type():
		return newError("type mismatch: %s %s %s",
			left.Type(), operator, right.Type())
	default:
		return newError("unknown operator: %s %s %s",
			left.Type(), operator, right.Type())
	}
}

func evalIntegerInfixExpression(
	operator string,
	left, right Object,
) Object {
	leftVal := left.(*Integer).Value
	rightVal := right.(*Integer).Value

	switch operator {
	case "+":
		return &Integer{Value: leftVal + rightVal}
	case "-":
		return &Integer{Value: leftVal - rightVal}
	case "*":
		return &Integer{Value: leftVal * rightVal}
	case "/":
		return &Integer{Value: leftVal / rightVal}
	case "<":
		return nativeBoolToPyMonkeyBoolean(leftVal < rightVal)
	case ">":
		return nativeBoolToPyMonkeyBoolean(leftVal > rightVal)
	case "==":
		return nativeBoolToPyMonkeyBoolean(leftVal == rightVal)
	case "!=":
		return nativeBoolToPyMonkeyBoolean(leftVal != rightVal)
	default:
		return newError("unknown operator: %s", operator)
	}
}

func evalStringInfixExpression(
	operator string,
	left, right Object,
) Object {
	leftVal := left.(*String).Value
	rightVal := right.(*String).Value

	switch operator {
	case "+":
		return &String{Value: leftVal + rightVal}
	case "==":
		return nativeBoolToPyMonkeyBoolean(leftVal == rightVal)
	case "!=":
		return nativeBoolToPyMonkeyBoolean(leftVal != rightVal)
	default:
		return newError("unknown operator: %s", operator)
	}
}

func evalBangOperatorExpression(right Object) Object {
	switch right {
	case TRUE:
		return FALSE
	case FALSE:
		return TRUE
	case NULL:
		return TRUE
	default:
		return FALSE
	}
}

func evalMinusPrefixOperatorExpression(right Object) Object {
	if right.Type() != INTEGER_OBJ {
		return newError("unknown operator: -%s", right.Type())
	}

	value := right.(*Integer).Value
	return &Integer{Value: -value}
}

func evalIfExpression(ie *ast.IfExpression, env *Environment) Object {
	condition := Eval(ie.Condition, env)
	if isError(condition) {
		return condition
	}

	if isTruthy(condition) {
		return Eval(ie.Consequence, env)
	} else if ie.Alternative != nil {
		return Eval(ie.Alternative, env)
	} else {
		return NULL
	}
}

func evalIdentifier(
	node *ast.Identifier,
	env *Environment,
) Object {
	if builtin, ok := builtins[node.Value]; ok {
		return builtin
	}

	val, ok := env.Get(node.Value)
	if !ok {
		return newError("identifier not found: " + node.Value)
	}

	return val
}

func evalExpressions(
	exps []ast.Expression,
	env *Environment,
) []Object {
	var result []Object

	for _, e := range exps {
		evaluated := Eval(e, env)
		if isError(evaluated) {
			return []Object{evaluated}
		}
		result = append(result, evaluated)
	}

	return result
}

func applyFunction(fn Object, args []Object) Object {
	return applyFunctionWithThis(fn, args, nil)
}

func applyFunctionWithThis(fn Object, args []Object, thisObj Object) Object {
	switch fn := fn.(type) {

	case *Function:
		extendedEnv := extendFunctionEnv(fn, args)
		if thisObj != nil {
			extendedEnv.Set("this", thisObj)
		}
		evaluated := Eval(fn.Body, extendedEnv)
		return unwrapReturnValue(evaluated)

	case *BoundMethod:
		extendedEnv := extendFunctionEnv(fn.Method, args)
		extendedEnv.Set("this", fn.Instance)
		evaluated := Eval(fn.Method.Body, extendedEnv)
		return unwrapReturnValue(evaluated)

	case *Builtin:
		return fn.Fn(args...)

	default:
		return newError("not a function: %T", fn)
	}
}

func extendFunctionEnv(
	fn *Function,
	args []Object,
) *Environment {
	env := NewEnclosedEnvironment(fn.Env)

	for paramIdx, param := range fn.Parameters {
		if paramIdx < len(args) {
			env.Set(param.Value, args[paramIdx])
		}
	}

	return env
}

func unwrapReturnValue(obj Object) Object {
	if returnValue, ok := obj.(*ReturnValue); ok {
		return returnValue.Value
	}
	return obj
}

func isTruthy(obj Object) bool {
	switch obj {
	case NULL:
		return false
	case TRUE:
		return true
	case FALSE:
		return false
	default:
		return true
	}
}

func newError(format string, a ...interface{}) *Error {
	return &Error{Message: fmt.Sprintf(format, a...)}
}

func isError(obj Object) bool {
	if obj != nil {
		return obj.Type() == ERROR_OBJ
	}
	return false
}
