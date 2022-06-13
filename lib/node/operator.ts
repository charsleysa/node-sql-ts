import { BinaryNode, PostfixUnaryNode, PrefixUnaryNode, TernaryNode } from './_internal.js';
import { Node } from './node.js';
import { ParameterNode } from './parameter.js';

// Process values, wrapping them in ParameterNode if necessary.
const processParam = (val: unknown): Node => {
    if (Array.isArray(val)) {
        throw new Error('expected single value');
    }
    return ParameterNode.getNodeOrParameterNode(val);
};
const processParamOrParams = (val: any): Node | Node[] => {
    return Array.isArray(val) ? val.map(ParameterNode.getNodeOrParameterNode) : ParameterNode.getNodeOrParameterNode(val);
};

export const prefixUnaryOperator = (operator: string) => {
    return (left: any): PrefixUnaryNode => {
        return new PrefixUnaryNode({
            left: processParam(left),
            operator,
        });
    };
};

export const postfixUnaryOperator = (operator: string) => {
    return (left: any): PostfixUnaryNode => {
        return new PostfixUnaryNode({
            left: processParam(left),
            operator,
        });
    };
};

export const binaryOperator = (operator: string) => {
    return (left: any, val: any): BinaryNode => {
        return new BinaryNode({
            left: processParam(left),
            operator,
            right: processParamOrParams(val),
        });
    };
};

export const ternaryOperator = (operator: string, separator: string) => {
    return (left: any, middle: any, right: any): TernaryNode => {
        return new TernaryNode({
            left: processParam(left),
            operator,
            middle: processParam(middle),
            separator,
            right: processParam(right),
        });
    };
};
