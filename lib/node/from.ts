import { Node } from './node.js';

export class FromNode extends Node {
    public skipFromStatement: boolean = false;
    constructor() {
        super('FROM');
    }
}
