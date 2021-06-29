import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class TernaryNode extends ValueExpressionNode {
    public left: Node;
    public middle: Node;
    public operator: string;
    public right: Node;
    public separator: string;
    constructor(config: { left: Node; middle: Node; operator: string; right: Node; separator: string }) {
        super('TERNARY');
        this.left = config.left;
        this.middle = config.middle;
        this.operator = config.operator;
        this.right = config.right;
        this.separator = config.separator;
    }

    public as = AliasMixin.as;
}

classMap.set('TERNARY', TernaryNode);
