/* eslint-disable max-classes-per-file */
import { INodeable } from '../nodeable.js';
import type {
    AtNode,
    BinaryNode,
    CaseNode,
    CastNode,
    InNode,
    NotInNode,
    OrderByValueNode,
    PostfixUnaryNode,
    PrefixUnaryNode,
    SliceNode,
    TernaryNode
} from './_internal.js';
import { Node } from './node.js';
import { ParameterNode } from './parameter.js';
import { TextNode } from './text.js';

export const classMap = new Map<string, new (...args: any[]) => any>();

// Process values, wrapping them in ParameterNode if necessary.
const processParam = (val: unknown): Node => {
    if (Array.isArray(val)) {
        throw new Error('expected single value');
    }
    return ParameterNode.getNodeOrParameterNode(val);
};
const processParams = (val: any): Node[] => {
    if (!Array.isArray(val)) {
        throw new Error('expected array value');
    }
    return val.map(ParameterNode.getNodeOrParameterNode);
};
const processParamOrParams = (val: any): Node | Node[] => {
    return Array.isArray(val) ? val.map(ParameterNode.getNodeOrParameterNode) : ParameterNode.getNodeOrParameterNode(val);
};

// Builder functions

export const prefixUnaryOperator = (operator: string) => {
    return (left: any): PrefixUnaryNode => {
        const ctor = classMap.get('PREFIX UNARY')!;
        return new ctor({
            left: processParam(left),
            operator
        });
    };
};

export const postfixUnaryOperator = (operator: string) => {
    return (left: any): PostfixUnaryNode => {
        const ctor = classMap.get('POSTFIX UNARY')!;
        return new ctor({
            left: processParam(left),
            operator
        });
    };
};

export const binaryOperator = (operator: string) => {
    return (left: any, val: any): BinaryNode => {
        const ctor = classMap.get('BINARY')!;
        return new ctor({
            left: processParam(left),
            operator,
            right: processParamOrParams(val)
        });
    };
};

export const ternaryOperator = (operator: string, separator: string) => {
    return (left: any, middle: any, right: any): TernaryNode => {
        const ctor = classMap.get('TERNARY')!;
        return new ctor({
            left: processParam(left),
            operator,
            middle: processParam(middle),
            separator,
            right: processParam(right)
        });
    };
};

const prefixUnaryMethod = (operator: string) => {
    return function(this: INodeable) {
        return prefixUnaryOperator(operator)(this)
    };
}

const postfixUnaryMethod = (operator: string) => {
    return function(this: INodeable) {
        return postfixUnaryOperator(operator)(this)
    };
}

const binaryMethod = (operator: string) => {
    return function(this: INodeable, right: any) {
        return binaryOperator(operator)(this, right);
    };
}

const ternaryMethod = (operator: string, separator: string) => {
    return function (this: INodeable, middle: any, right: any) {
        return ternaryOperator(operator, separator)(this, middle, right);
    };
}

const orderMethod = (direction: string) => {
    return function(this: INodeable): OrderByValueNode {
        const ctor = classMap.get('ORDER BY VALUE')!;
        return new ctor({
            value: this.toNode(),
            direction: direction ? new TextNode(direction) : undefined
        });
    };
};

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function ValueExpressionBaseMixin<TBase extends abstract new (...args: any[]) => INodeable>(Base: TBase) {
    abstract class ValueExpressionBaseClass extends Base {

        public in(val: any) : InNode {
            const ctor = classMap.get('IN')!;
            return new ctor({
                left: this.toNode(),
                right: processParamOrParams(val)
            });
        }
    
        public notIn(val: any): NotInNode {
            const ctor = classMap.get('NOT IN')!;
            return new ctor({
                left: this.toNode(),
                right: processParamOrParams(val)
            });
        }
    
        public at(index: any): AtNode {
            const ctor = classMap.get('AT')!;
            return new ctor(this.toNode(), processParam(index));
        }
    
        public slice(start: number, end: number): SliceNode {
            const ctor = classMap.get('SLICE')!;
            return new ctor(this.toNode(), processParam(start), processParam(end));
        }
    
        public cast(dataType: string): CastNode {
            const ctor = classMap.get('CAST')!;
            return new ctor(this.toNode(), dataType);
        }
        
        public case(whenList: any[], thenList: any[], elseBranch?: any): CaseNode {
            const ctor = classMap.get('CASE')!;
            if (undefined !== elseBranch) {
                elseBranch = processParam(elseBranch);
            }
            return new ctor({
                whenList: processParams(whenList),
                thenList: processParams(thenList),
                else: elseBranch
            });
        }

        public prefixUnaryOperator(operator: string) {
            return prefixUnaryMethod(operator).call(this);
        };

        public postfixUnaryOperator(operator: string) {
            return postfixUnaryMethod(operator).call(this);
        };

        public binaryOperator(operator: string, right: any) {
            return binaryMethod(operator).call(this, right);
        };

        public ternaryOperator(operator: string, middle: any, separator: string, right: any) {
            return ternaryMethod(operator, separator).call(this, middle, right);
        };

        public isNull = postfixUnaryMethod('IS NULL');
        public isNotNull = postfixUnaryMethod('IS NOT NULL');
        public equals = binaryMethod('=');
        public notEquals = binaryMethod('<>');
        public gt = binaryMethod('>');
        public gte = binaryMethod('>=');
        public lt = binaryMethod('<');
        public lte = binaryMethod('<=');
        public plus = binaryMethod('+');
        public minus = binaryMethod('-');
        public multiply = binaryMethod('*');
        public divide = binaryMethod('/');
        public modulo = binaryMethod('%');
        public leftShift = binaryMethod('<<');
        public rightShift = binaryMethod('>>');
        public bitwiseAnd = binaryMethod('&');
        public bitwiseNot = binaryMethod('~');
        public bitwiseOr = binaryMethod('|');
        public bitwiseXor = binaryMethod('#');
        public regex = binaryMethod('~');
        public iregex = binaryMethod('~*');
        public regexp = binaryMethod('REGEXP');
        public notRegex = binaryMethod('!~');
        public notIregex = binaryMethod('!~*');
        public concat = binaryMethod('||');
        public key = binaryMethod('->');
        public keyText = binaryMethod('->>');
        public path = binaryMethod('#>');
        public pathText = binaryMethod('#>>');
        public like = binaryMethod('LIKE');
        public rlike = binaryMethod('RLIKE');
        public notLike = binaryMethod('NOT LIKE');
        public ilike = binaryMethod('ILIKE');
        public notIlike = binaryMethod('NOT ILIKE');
        public match = binaryMethod('@@');
        public between = ternaryMethod('BETWEEN', 'AND');
        public notBetween = ternaryMethod('NOT BETWEEN', 'AND');
        public contains = binaryMethod('@>');
        public containedBy = binaryMethod('<@');
        public containsKey = binaryMethod('?');
        public overlap = binaryMethod('&&');
        public descending = orderMethod('DESC');
    }
    return ValueExpressionBaseClass;
}

// eslint-disable-next-line prefer-arrow/prefer-arrow-functions
export function ValueExpressionMixin<TBase extends abstract new (...args: any[]) => INodeable>(Base: TBase) {
    abstract class ValueExpressionClass extends ValueExpressionBaseMixin(Base) {
        public or = binaryMethod('OR');
        public and = binaryMethod('AND');
    }
    return ValueExpressionClass;
}

export const ValueExpressionBaseNode = ValueExpressionBaseMixin(Node);
export const ValueExpressionNode = ValueExpressionMixin(Node);
