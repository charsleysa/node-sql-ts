import { AliasMixin } from './alias.js';
import { ParameterNode } from './parameter.js';
import { ValueExpressionNode } from './_internal.js';

export class FunctionCallNode extends ValueExpressionNode {
    public name: string;
    constructor(name: string, args: any[]) {
        super('FUNCTION CALL');
        this.name = name;
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }

    public as = AliasMixin.as;
}
