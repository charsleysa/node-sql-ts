import { Node } from './node.js';

export class IfNotExistsNode extends Node {
    constructor() {
        super('IF NOT EXISTS');
    }
}
