import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class PrefixUnaryNode extends ValueExpressionNode {
    public left: Node;
    public operator: string;
    constructor(config: { left: Node; operator: string }) {
        super('PREFIX UNARY');
        this.left = config.left;
        this.operator = config.operator;
    }

    public as = AliasMixin.as;
}

classMap.set('PREFIX UNARY', PrefixUnaryNode);
