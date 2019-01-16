'use strict';
// tslint:disable:object-literal-sort-keys

import {
    AtNode,
    BinaryNode,
    CaseNode,
    CastNode,
    InNode,
    NotInNode,
    OrderByValueNode,
    ParameterNode,
    PostfixUnaryNode,
    SliceNode,
    TernaryNode,
    TextNode
} from '.';
import { INodeable } from '../nodeable';

// Process values, wrapping them in ParameterNode if necessary.
const processParams = (val: any) => {
    return Array.isArray(val) ? val.map(ParameterNode.getNodeOrParameterNode) : ParameterNode.getNodeOrParameterNode(val);
};

// Value expressions can be composed to form new value expressions.
// ValueExpressionMixin is evaluated at runtime, hence the
// "thunk" around it.
export const valueExpressionMixin = () => {
    // tslint:disable:no-shadowed-variable
    const BinaryNode = require('./binary').BinaryNode;
    const InNode = require('./in').InNode;
    const NotInNode = require('./notIn').NotInNode;
    const CastNode = require('./cast').CastNode;
    const PostfixUnaryNode = require('./postfixUnary').PostfixUnaryNode;
    const TernaryNode = require('./ternary').TernaryNode;
    const CaseNode = require('./case').CaseNode;
    const AtNode = require('./at').AtNode;
    const SliceNode = require('./slice').SliceNode;
    // tslint:enable:no-shadowed-variable

    const postfixUnaryMethod = (operator: string) => {
        /*jshint unused: false */
        return function(this: INodeable) {
            return new PostfixUnaryNode({
                left: this.toNode(),
                operator
            });
        };
    };

    const binaryMethod = (operator: string) => {
        return function(this: INodeable, val: any) {
            return new BinaryNode({
                left: this.toNode(),
                operator,
                right: processParams(val)
            });
        };
    };

    const inMethod = function(this: INodeable, val: any) {
        return new InNode({
            left: this.toNode(),
            right: processParams(val)
        });
    };

    const notInMethod = function(this: INodeable, val: any) {
        return new NotInNode({
            left: this.toNode(),
            right: processParams(val)
        });
    };

    const ternaryMethod = (operator: string, separator: string) => {
        return function(this: INodeable, middle: any, right: any) {
            return new TernaryNode({
                left: this.toNode(),
                operator,
                middle: processParams(middle),
                separator,
                right: processParams(right)
            });
        };
    };

    const atMethod = function(this: INodeable, index: any) {
        return new AtNode(this.toNode(), processParams(index));
    };

    const sliceMethod = function(this: INodeable, start: number, end: number) {
        return new SliceNode(this.toNode(), processParams(start), processParams(end));
    };

    const castMethod = function(this: INodeable, dataType: string) {
        return new CastNode(this.toNode(), dataType);
    };

    const orderMethod = (direction: string) => {
        return function(this: INodeable) {
            return new OrderByValueNode({
                value: this.toNode(),
                direction: direction ? new TextNode(direction) : undefined
            });
        };
    };

    const caseMethod = function(this: INodeable, whenList: any[], thenList: any[], elseBranch?: any) {
        if (undefined !== elseBranch) {
            elseBranch = processParams(elseBranch);
        }
        return new CaseNode({
            whenList: processParams(whenList),
            thenList: processParams(thenList),
            else: elseBranch
        });
    };

    return {
        isNull: postfixUnaryMethod('IS NULL'),
        isNotNull: postfixUnaryMethod('IS NOT NULL'),
        or: binaryMethod('OR'),
        and: binaryMethod('AND'),
        equals: binaryMethod('='),
        notEquals: binaryMethod('<>'),
        gt: binaryMethod('>'),
        gte: binaryMethod('>='),
        lt: binaryMethod('<'),
        lte: binaryMethod('<='),
        plus: binaryMethod('+'),
        minus: binaryMethod('-'),
        multiply: binaryMethod('*'),
        divide: binaryMethod('/'),
        modulo: binaryMethod('%'),
        leftShift: binaryMethod('<<'),
        rightShift: binaryMethod('>>'),
        bitwiseAnd: binaryMethod('&'),
        bitwiseNot: binaryMethod('~'),
        bitwiseOr: binaryMethod('|'),
        bitwiseXor: binaryMethod('#'),
        regex: binaryMethod('~'),
        iregex: binaryMethod('~*'),
        regexp: binaryMethod('REGEXP'),
        notRegex: binaryMethod('!~'),
        notIregex: binaryMethod('!~*'),
        concat: binaryMethod('||'),
        key: binaryMethod('->'),
        keyText: binaryMethod('->>'),
        path: binaryMethod('#>'),
        pathText: binaryMethod('#>>'),
        like: binaryMethod('LIKE'),
        rlike: binaryMethod('RLIKE'),
        notLike: binaryMethod('NOT LIKE'),
        ilike: binaryMethod('ILIKE'),
        notIlike: binaryMethod('NOT ILIKE'),
        match: binaryMethod('@@'),
        in: inMethod,
        notIn: notInMethod,
        between: ternaryMethod('BETWEEN', 'AND'),
        notBetween: ternaryMethod('NOT BETWEEN', 'AND'),
        at: atMethod,
        contains: binaryMethod('@>'),
        containedBy: binaryMethod('<@'),
        containsKey: binaryMethod('?'),
        overlap: binaryMethod('&&'),
        slice: sliceMethod,
        cast: castMethod,
        descending: orderMethod('DESC'),
        case: caseMethod
    };
};

export interface IValueExpressionMixinBase {
    isNull(): PostfixUnaryNode;
    isNotNull(): PostfixUnaryNode;
    equals(val: any): BinaryNode;
    notEquals(val: any): BinaryNode;
    gt(val: any): BinaryNode;
    gte(val: any): BinaryNode;
    lt(val: any): BinaryNode;
    lte(val: any): BinaryNode;
    plus(val: any): BinaryNode;
    minus(val: any): BinaryNode;
    multiply(val: any): BinaryNode;
    divide(val: any): BinaryNode;
    modulo(val: any): BinaryNode;
    leftShift(val: any): BinaryNode;
    rightShift(val: any): BinaryNode;
    bitwiseAnd(val: any): BinaryNode;
    bitwiseNot(val: any): BinaryNode;
    bitwiseOr(val: any): BinaryNode;
    bitwiseXor(val: any): BinaryNode;
    regex(val: any): BinaryNode;
    iregex(val: any): BinaryNode;
    regexp(val: any): BinaryNode;
    notRegex(val: any): BinaryNode;
    notIregex(val: any): BinaryNode;
    concat(val: any): BinaryNode;
    key(val: any): BinaryNode;
    keyText(val: any): BinaryNode;
    path(val: any): BinaryNode;
    pathText(val: any): BinaryNode;
    like(val: any): BinaryNode;
    rlike(val: any): BinaryNode;
    notLike(val: any): BinaryNode;
    ilike(val: any): BinaryNode;
    notIlike(val: any): BinaryNode;
    match(val: any): BinaryNode;
    in(val: any): InNode;
    notIn(val: any): NotInNode;
    between(middle: any, right: any): TernaryNode;
    notBetween(middle: any, right: any): TernaryNode;
    at(index: any): AtNode;
    contains(val: any): BinaryNode;
    containedBy(val: any): BinaryNode;
    containsKey(val: any): BinaryNode;
    overlap(val: any): BinaryNode;
    slice(start: number, end: number): SliceNode;
    cast(dataType: string): CastNode;
    descending(): OrderByValueNode;
    case(whenList: any[], thenList: any[], elseBranch?: any): CaseNode;
}

export interface IValueExpressionMixin extends IValueExpressionMixinBase {
    or(val: any): BinaryNode;
    and(val: any): BinaryNode;
}
