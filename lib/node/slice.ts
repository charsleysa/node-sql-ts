import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class SliceNode extends ValueExpressionNode {
    public value: Node;
    public start: Node;
    public end: Node;
    constructor(value: Node, start: Node, end: Node) {
        super('SLICE');
        this.value = value;
        this.start = start;
        this.end = end;
    }

    public as = AliasMixin.as;
}

classMap.set('SLICE', SliceNode);
