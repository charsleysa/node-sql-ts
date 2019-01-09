'use strict';

import _ = require('lodash');
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
_.extend(FunctionCallNode.prototype, valueExpressionMixin());

_.extend(FunctionCallNode.prototype, AliasNode.AliasMixin);

export interface FunctionCallNode extends IValueExpressionMixin, IAliasMixin {}
