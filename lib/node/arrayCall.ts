'use strict';

import extend from 'lodash/extend';
import flatten from 'lodash/flatten';
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, ParameterNode, valueExpressionMixin } from '.';

export class ArrayCallNode extends Node {
    constructor(args: any[]) {
        super('ARRAY CALL');
        args = flatten(args);
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }
}

// mix in value expression
extend(ArrayCallNode.prototype, valueExpressionMixin());

// allow aliasing
extend(ArrayCallNode.prototype, AliasNode.AliasMixin);

export interface ArrayCallNode extends IValueExpressionMixin, IAliasMixin {}
