package main

import (
	"fmt"
	"main/lexer"
	"main/parser"
	"main/run"
)

func main() {
	input := `
		let add = func (x, y) {
		  return x + y
		}

		let result = add(3, 4)
		print(result);

		let arr = [1, 2, 3]
		print(arr[1])

		let obj = { "name": "Buddy", "age": 5 }
		print(obj["name"])

		if (result > 5) {
		  print("big result")
		} else {
		  print("small result")
		}

		let nothing = null
		print(nothing)
	`

	l := lexer.New(input)
	p := parser.New(l)
	program := p.ParseProgram()

	if errors := p.Errors(); len(errors) != 0 {
		for _, err := range errors {
			fmt.Println("Parser error:", err)
		}
		return
	}

	env := run.NewEnvironment()
	result := run.Eval(program, env)
	if result != nil {
		fmt.Println(result.Inspect())
	}
}
