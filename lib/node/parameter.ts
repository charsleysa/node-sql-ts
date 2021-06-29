import { INodeable, instanceofINodeable } from '../nodeable.js';
import { Node } from './node.js';

export class ParameterNode extends Node {
    // wrap a value as a parameter node if value is not already a node
    public static getNodeOrParameterNode(value?: INodeable | unknown) {
        return value && instanceofINodeable(value) ? value.toNode() : new ParameterNode(value);
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
