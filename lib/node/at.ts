import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class AtNode extends ValueExpressionNode {
    public value: Node;
    public index: Node;
    constructor(value: Node, index: Node) {
        super('AT');
        this.value = value;
        this.index = index;
    }

    public as = AliasMixin.as;
}

classMap.set('AT', AtNode);
