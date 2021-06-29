import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class PostfixUnaryNode extends ValueExpressionNode {
    public left: Node;
    public operator: string;
    constructor(config: { left: Node; operator: string }) {
        super('POSTFIX UNARY');
        this.left = config.left;
        this.operator = config.operator;
    }

    public as = AliasMixin.as;
}

classMap.set('POSTFIX UNARY', PostfixUnaryNode);
