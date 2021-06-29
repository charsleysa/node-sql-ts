import { INodeable } from '../nodeable.js';
import { hasTable } from '../tableTracker.js';
import { Node } from './node.js';

export class JoinNode extends Node {
    public subType: string;
    public from: Node;
    public to: Node;
    public onNode!: Node;
    constructor(subType: string, from: INodeable, to: INodeable) {
        super('JOIN');
        this.sql = (hasTable(from) && from.table.sql) || (hasTable(to) && to.table.sql) || undefined;
        this.subType = subType;
        this.from = from.toNode();
        this.to = to.toNode();
    }
    public on(node: Node) {
        this.onNode = node;
        return this;
    }
    public join(other: INodeable) {
        return new JoinNode('INNER', this, other);
    }
    public leftJoin(other: INodeable) {
        return new JoinNode('LEFT', this, other);
    }
}
