import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class InNode extends ValueExpressionNode {
    public left: Node;
    public right: Node | Node[];
    constructor(config: { left: Node; right: Node | Node[] }) {
        super('IN');
        this.left = config.left;
        this.right = config.right;
    }

    public as = AliasMixin.as;
}

classMap.set('IN', InNode);
