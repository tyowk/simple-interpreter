"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Client_1 = require("./Client");
const Interpreter_1 = require("./Interpreter");
/**
 * The code to be executed
 * this is a simple example to test the interpreter
 */
const code = `
$if[(meow==meow)&&true]
    Block A
$elseif[uwu==owo]
    Block B
$else
    Fallback block
$endif

$uwufy[Hello, world!]
$log[Finished executing code]
`;
console.log((0, Interpreter_1.Interpreter)(new Client_1.ShouwClient(), code, {
    showCodeFrame: true,
    customError: (msg, line, col, frame) => `Oops! ${msg} near line ${line}, col ${col}${frame}`
}));
