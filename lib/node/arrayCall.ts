'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, ParameterNode, valueExpressionMixin } from '.';

export class ArrayCallNode extends Node {
    constructor(args: any[]) {
        super('ARRAY CALL');
        args = _.flatten(args);
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }
}

// mix in value expression
_.extend(ArrayCallNode.prototype, valueExpressionMixin());

// allow aliasing
_.extend(ArrayCallNode.prototype, AliasNode.AliasMixin);

export interface ArrayCallNode extends IValueExpressionMixin, IAliasMixin {}
