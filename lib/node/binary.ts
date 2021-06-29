import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class BinaryNode extends ValueExpressionNode {
    public left: Node;
    public operator: string;
    public right: Node | Node[];
    constructor(config: { left: Node; operator: string; right: Node | Node[] }) {
        super('BINARY');
        this.left = config.left;
        this.operator = config.operator;
        this.right = config.right;
    }

    public as = AliasMixin.as;
}

classMap.set('BINARY', BinaryNode);
