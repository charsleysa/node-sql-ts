import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class CastNode extends ValueExpressionNode {
    public value: Node;
    public dataType: string;
    constructor(value: Node, dataType: string) {
        super('CAST');
        this.value = value;
        this.dataType = dataType;
    }

    public as = AliasMixin.as;
}

classMap.set('CAST', CastNode);
