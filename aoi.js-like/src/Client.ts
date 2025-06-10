import { Collective, ParamType } from 'shouw.js';

/**
 * The client instance
 *
 * this is a simple version to register the functions only and testing purposes
 * the real client is in the shouw.js package
 *
 * @class ShouwClient
 */
export class ShouwClient {
    functions: Collective<string, any>;

    constructor() {
        this.functions = new Collective();
        this.functions.set('$if', {
            name: '$if',
            brackets: true,
            params: [
                {
                    name: 'condition',
                    param: ParamType.String,
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
                    param: ParamType.String,
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
                    param: ParamType.String,
                    required: true
                }
            ],
            code: ([message]: string[]) => {
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
                    param: ParamType.String,
                    required: true
                }
            ],
            code: ([message]: string[]) => {
                return message.replace(/[rl]/g, 'w').replace(/[RL]/g, 'W');
            }
        });
    }
}
