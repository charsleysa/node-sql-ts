'use strict';

import extend from 'lodash/extend';
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, ParameterNode, valueExpressionMixin } from '.';

export class FunctionCallNode extends Node {
    public name: string;
    constructor(name: string, args: any[]) {
        super('FUNCTION CALL');
        this.name = name;
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }
}

// mix in value expression
extend(FunctionCallNode.prototype, valueExpressionMixin());

extend(FunctionCallNode.prototype, AliasNode.AliasMixin);

export interface FunctionCallNode extends IValueExpressionMixin, IAliasMixin {}
