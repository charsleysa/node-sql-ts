import { Node } from './node.js';

export class RenameColumnNode extends Node {
    constructor() {
        super('RENAME COLUMN');
    }
}
