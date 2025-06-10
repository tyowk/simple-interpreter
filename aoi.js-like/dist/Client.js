"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShouwClient = void 0;
const shouw_js_1 = require("shouw.js");
/**
 * The client instance
 *
 * this is a simple version to register the functions only and testing purposes
 * the real client is in the shouw.js package
 *
 * @class ShouwClient
 */
class ShouwClient {
    constructor() {
        this.functions = new shouw_js_1.Collective();
        this.functions.set('$if', {
            name: '$if',
            brackets: true,
            params: [
                {
                    name: 'condition',
                    param: shouw_js_1.ParamType.String,
                    required: true
                }
            ]
        });
        this.functions.set('$elseif', {
            name: '$elseif',
            brackets: true,
            params: [
                {
                    name: 'condition',
                    param: shouw_js_1.ParamType.String,
                    required: true
                }
            ]
        });
        this.functions.set('$else', {
            name: '$else',
            brackets: false,
            params: []
        });
        this.functions.set('$endif', {
            name: '$endif',
            brackets: false,
            params: []
        });
        this.functions.set('$log', {
            name: '$log',
            brackets: true,
            params: [
                {
                    name: 'message',
                    param: shouw_js_1.ParamType.String,
                    required: true
                }
            ],
            code: ([message]) => {
                console.log(message);
                return '';
            }
        });
        this.functions.set('$uwufy', {
            name: '$uwufy',
            brackets: true,
            params: [
                {
                    name: 'message',
                    param: shouw_js_1.ParamType.String,
                    required: true
                }
            ],
            code: ([message]) => {
                return message.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W');
            }
        });
    }
}
exports.ShouwClient = ShouwClient;
