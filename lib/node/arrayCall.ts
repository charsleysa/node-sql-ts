import flatten from 'lodash/flatten.js';
import { AliasMixin } from './alias.js';
import { ParameterNode } from './parameter.js';
import { ValueExpressionNode } from './_internal.js';

export class ArrayCallNode extends ValueExpressionNode {
    constructor(args: any[]) {
        super('ARRAY CALL');
        args = flatten(args);
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }

    public as = AliasMixin.as;
}
