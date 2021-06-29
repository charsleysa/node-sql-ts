import { AliasMixin } from './alias.js';
import { Node } from './node.js';
import { classMap, ValueExpressionNode } from './_internal.js';

export class CaseNode extends ValueExpressionNode {
    public whenList: Node[];
    public thenList: Node[];
    public else?: Node;
    constructor(config: { whenList: Node[]; thenList: Node[]; else?: Node }) {
        super('CASE');
        this.whenList = config.whenList;
        this.thenList = config.thenList;
        this.else = config.else;
    }

    public as = AliasMixin.as;
}

classMap.set('CASE', CaseNode);
