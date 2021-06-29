import { Node } from './node.js';
import { ParameterNode } from './parameter.js';
import { Query } from './query.js';

export class ModifierNode extends Node {
    public query: Query<unknown>;
    public count: Node;
    constructor(query: Query<unknown>, type: 'LIMIT' | 'OFFSET', count: unknown) {
        super(type);
        this.query = query;
        this.count = ParameterNode.getNodeOrParameterNode(count);
    }
}
