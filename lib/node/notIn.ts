'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class NotInNode extends Node {
    public left: Node;
    public right: Node;
    constructor(config: { left: Node; right: Node }) {
        super('NOT IN');
        this.left = config.left;
        this.right = config.right;

        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            _.extend(NotInNode.prototype, valueExpressionMixin());
        }
    }
}

_.extend(NotInNode.prototype, AliasNode.AliasMixin);

export interface NotInNode extends IValueExpressionMixin, IAliasMixin {}
