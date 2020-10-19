'use strict';

import { Node } from '.';
import { INodeable, instanceofINodeable } from '../nodeable';

export class ParameterNode extends Node {
    // wrap a value as a parameter node if value is not already a node
    public static getNodeOrParameterNode(value?: INodeable | unknown) {
        if (value && instanceofINodeable(value)) {
            // use toNode
            return value.toNode();
        } else {
            // wrap as parameter node
            return new ParameterNode(value);
        }
    }
    public isExplicit: boolean;
    private val: any;
    constructor(val: any) {
        super('PARAMETER');
        this.val = val;
        this.isExplicit = false;
    }
    public value() {
        return this.val;
    }
}
