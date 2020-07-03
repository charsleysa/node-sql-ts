'use strict';

import extend from 'lodash/extend';
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class TernaryNode extends Node {
    public left: Node;
    public middle: Node;
    public operator: string;
    public right: Node;
    public separator: string;
    constructor(config: { left: Node; middle: Node; operator: string; right: Node; separator: string }) {
        super('TERNARY');
        this.left = config.left;
        this.middle = config.middle;
        this.operator = config.operator;
        this.right = config.right;
        this.separator = config.separator;

        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            extend(TernaryNode.prototype, valueExpressionMixin());
        }
    }
}

extend(TernaryNode.prototype, AliasNode.AliasMixin);

export interface TernaryNode extends IValueExpressionMixin, IAliasMixin {}
