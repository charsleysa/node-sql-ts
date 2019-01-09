'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class AtNode extends Node {
    public value: Node;
    public index: Node;
    constructor(value: Node, index: Node) {
        super('AT');
        this.value = value;
        this.index = index;
        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            _.extend(AtNode.prototype, valueExpressionMixin());
        }
    }
}

_.extend(AtNode.prototype, AliasNode.AliasMixin);

export interface AtNode extends IValueExpressionMixin, IAliasMixin {}
