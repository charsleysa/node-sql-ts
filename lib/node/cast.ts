'use strict';

import _ = require('lodash');
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class CastNode extends Node {
    public value: Node;
    public dataType: string;
    constructor(value: Node, dataType: string) {
        super('CAST');
        this.value = value;
        this.dataType = dataType;
        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            _.extend(CastNode.prototype, valueExpressionMixin());
        }
    }
}

_.extend(CastNode.prototype, AliasNode.AliasMixin);

export interface CastNode extends IValueExpressionMixin, IAliasMixin {}
