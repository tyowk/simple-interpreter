import { ShouwClient } from './Client';
import { Interpreter } from './Interpreter';

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

console.log(
    Interpreter(new ShouwClient(), code, {
        showCodeFrame: true,
        customError: (msg, line, col, frame) => `Oops! ${msg} near line ${line}, col ${col}${frame}`
    })
);

/**
 * Expected output:
 *     Finished executing code
 *     Block A
 *
 *     Hewwo, Wowwd!
 */
