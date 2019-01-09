import { Node, ParameterNode, Query } from '.';

export class ModifierNode extends Node {
    public query: Query<any>;
    public count: Node;
    constructor(query: Query<any>, type: 'LIMIT' | 'OFFSET', count: any) {
        super(type);
        this.query = query;
        this.count = ParameterNode.getNodeOrParameterNode(count);
    }
}
