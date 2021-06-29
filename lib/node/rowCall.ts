import flatten from 'lodash/flatten.js';
import { AliasMixin } from './alias.js';
import { ParameterNode } from './parameter.js';
import { ValueExpressionNode } from './_internal.js';

export class RowCallNode extends ValueExpressionNode {
    constructor(args: any[]) {
        super('ROW CALL');
        args = flatten(args);
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }

    public as = AliasMixin.as;
}
