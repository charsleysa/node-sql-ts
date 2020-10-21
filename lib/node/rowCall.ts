'use strict';

import extend from 'lodash/extend';
import flatten from 'lodash/flatten';
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, ParameterNode, valueExpressionMixin } from '.';

export class RowCallNode extends Node {
    constructor(args: any[]) {
        super('ROW CALL');
        args = flatten(args);
        this.addAll(args.map(ParameterNode.getNodeOrParameterNode));
    }
}

// mix in value expression
extend(RowCallNode.prototype, valueExpressionMixin());

// allow aliasing
extend(RowCallNode.prototype, AliasNode.AliasMixin);

export interface RowCallNode extends IValueExpressionMixin, IAliasMixin {}
