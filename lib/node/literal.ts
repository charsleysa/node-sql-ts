import { Node } from './node.js';

export class LiteralNode extends Node {
    public literal: string;
    public alias?: string;
    constructor(literal: string) {
        super('LITERAL');
        this.literal = literal;
        this.alias = undefined;
    }
    public as(alias: string) {
        this.alias = alias;
        return this;
    }
}
