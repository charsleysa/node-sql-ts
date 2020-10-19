import { Node, ParameterNode, Query } from '.';

export class ModifierNode extends Node {
    public query: Query<unknown>;
    public count: Node;
    constructor(query: Query<unknown>, type: 'LIMIT' | 'OFFSET', count: unknown) {
        super(type);
        this.query = query;
        this.count = ParameterNode.getNodeOrParameterNode(count);
    }
}
