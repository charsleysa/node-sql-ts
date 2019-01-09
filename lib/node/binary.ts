'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class BinaryNode extends Node {
    public left: Node;
    public operator: string;
    public right: Node;
    constructor(config: { left: Node; operator: string; right: Node }) {
        super('BINARY');
        this.left = config.left;
        this.operator = config.operator;
        this.right = config.right;

        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            _.extend(BinaryNode.prototype, valueExpressionMixin());
        }
    }
}

_.extend(BinaryNode.prototype, AliasNode.AliasMixin);

export interface BinaryNode extends IValueExpressionMixin, IAliasMixin {}
