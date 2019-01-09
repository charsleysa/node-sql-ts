'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class SliceNode extends Node {
    public value: Node;
    public start: Node;
    public end: Node;
    constructor(value: Node, start: Node, end: Node) {
        super('SLICE');
        this.value = value;
        this.start = start;
        this.end = end;
        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            _.extend(SliceNode.prototype, valueExpressionMixin());
        }
    }
}

_.extend(SliceNode.prototype, AliasNode.AliasMixin);

export interface SliceNode extends IValueExpressionMixin, IAliasMixin {}
