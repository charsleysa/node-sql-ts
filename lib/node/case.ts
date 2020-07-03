'use strict';

import extend from 'lodash/extend';
import { AliasNode, IAliasMixin, IValueExpressionMixin, Node, valueExpressionMixin } from '.';

let valueExpressionMixed = false;
export class CaseNode extends Node {
    public whenList: Node[];
    public thenList: Node[];
    public else?: Node;
    constructor(config: { whenList: Node[]; thenList: Node[]; else?: Node }) {
        super('CASE');
        this.whenList = config.whenList;
        this.thenList = config.thenList;
        this.else = config.else;

        // Delay mixin to runtime, when all nodes have been defined, and
        // mixin only once. ValueExpressionMixin has circular dependencies.
        if (!valueExpressionMixed) {
            valueExpressionMixed = true;
            extend(CaseNode.prototype, valueExpressionMixin());
        }
    }
}

extend(CaseNode.prototype, AliasNode.AliasMixin);

export interface CaseNode extends IValueExpressionMixin, IAliasMixin {}
