'use strict';

import assert from 'assert';
import isNumber from 'lodash/isNumber';

import {
    BinaryNode,
    ColumnNode,
    CreateNode,
    ForShareNode,
    FunctionCallNode,
    IndexesNode,
    InsertNode,
    IntervalNode,
    OnConflictNode,
    OnDuplicateNode,
    RenameColumnNode,
    ReplaceNode,
    ReturningNode
} from '../node';
import { Postgres } from './postgres';

export class Mysql extends Postgres {
    protected myClass = Mysql;
    protected quoteCharacter = '`';
    protected arrayAggFunctionName = 'GROUP_CONCAT';

    constructor(config: any) {
        super(config);
    }
    public _getParameterPlaceholder(index: string | number, value: any): string {
        return '?';
    }
    public _getParameterValue(
        value: null | boolean | number | string | any[] | Date | Buffer | object,
        quoteChar?: string
    ): string | number {
        return Buffer.isBuffer(value)
            ? 'x' + this._getParameterValue(value.toString('hex'))
            : Postgres.prototype._getParameterValue.call(this, value);
    }
    public visitReplace(replaceNode: ReplaceNode): string[] {
        // don't use table.column for replaces
        this.visitedReplace = true;
        const result = [
            'REPLACE',
            ...replaceNode.nodes.map((n) => this.visit(n).join()),
            `INTO ${this.visit(this.queryNode!.table.toNode())}`,
            `(${replaceNode.columns.map((n) => this.visit(n).join()).join(', ')})`
        ];
        const paramNodes = replaceNode.getParameters();
        if (paramNodes.length > 0) {
            const paramText = paramNodes
                .map((paramSet) => {
                    return paramSet.map((param) => this.visit(param).join()).join(', ');
                })
                .map((param) => `(${param})`)
                .join(', ');
            result.push('VALUES', paramText);
            if (result.slice(2, 5).join(' ') === '() VALUES ()') {
                result.splice(2, 3, 'DEFAULT VALUES');
            }
        }
        this.visitedReplace = false;
        if (result[2] === 'DEFAULT VALUES') {
            result[2] = '() VALUES ()';
        }
        return result;
    }
    public visitOnDuplicate(onDuplicateNode: OnDuplicateNode): string[] {
        const params: string[] = [];
        /* jshint boss: true */
        for (const node of onDuplicateNode.nodes as ColumnNode[]) {
            const targetCol = this.visit(node);
            params.push(`${targetCol} = ${this.visit(node.value)}`);
        }
        const result = ['ON DUPLICATE KEY UPDATE', params.join(', ')];
        return result;
    }
    public visitOnConflict(onConflictNode: OnConflictNode): string[] {
        throw new Error('Mysql does not allow onConflict clause.');
    }
    public visitReturning(returningNode: ReturningNode): string[] {
        throw new Error('MySQL does not allow returning clause.');
    }
    public visitForShare(forShareNode: ForShareNode): string[] {
        throw new Error('MySQL does not allow FOR SHARE clause.');
    }
    public visitCreate(createNode: CreateNode): string[] {
        const result = super.visitCreate(createNode);
        const engine = this.queryNode!.table.initialConfig.engine;
        const charset = this.queryNode!.table.initialConfig.charset;
        if (!!engine) {
            result.push('ENGINE=' + engine);
        }
        if (!!charset) {
            result.push('DEFAULT CHARSET=' + charset);
        }
        return result;
    }
    public visitRenameColumn(renameColumnNode: RenameColumnNode): string[] {
        const dataType = (renameColumnNode.nodes[1] as ColumnNode).dataType || (renameColumnNode.nodes[0] as ColumnNode).dataType;
        assert(
            dataType,
            'dataType missing for column ' +
                ((renameColumnNode.nodes[1] as ColumnNode).name || (renameColumnNode.nodes[0] as ColumnNode).name || '') +
                ' (CHANGE COLUMN statements require a dataType)'
        );
        return [`CHANGE COLUMN ${this.visit(renameColumnNode.nodes[0])} ${this.visit(renameColumnNode.nodes[1])} ${dataType}`];
    }
    public visitInsert(insertNode: InsertNode): string[] {
        const result = super.visitInsert(insertNode);
        if (result[2] === 'DEFAULT VALUES') {
            result[2] = '() VALUES ()';
        }
        return result;
    }
    public visitIndexes(indexesNode: IndexesNode): string[] {
        const tableName = this.visit(this.queryNode!.table.toNode())[0];
        return [`SHOW INDEX FROM ${tableName}`];
    }
    public visitBinary(binaryNode: BinaryNode): string[] {
        if (binaryNode.operator === '@@') {
            return [`(MATCH ${this.visit(binaryNode.left)} AGAINST ${this.visit(binaryNode.right)})`];
        }
        return super.visitBinary(binaryNode);
    }
    public visitFunctionCall(functionCallNode: FunctionCallNode): string[] {
        this.visitingFunctionCall = true;
        const extract = () => {
            const nodes = functionCallNode.nodes.map((n) => this.visit(n).join());
            if (nodes.length !== 1) {
                throw new Error(`Not enough parameters passed to ${functionCallNode.name} function`);
            }
            return `${functionCallNode.name}(${nodes[0]})`;
        };
        let txt = '';
        const name = functionCallNode.name;
        // Override date functions since mysql is different than postgres
        if (['YEAR', 'MONTH', 'DAY', 'HOUR'].indexOf(functionCallNode.name) >= 0) {
            txt = extract();
        }
        // Override CURRENT_TIMESTAMP function to remove parens
        else if ('CURRENT_TIMESTAMP' === functionCallNode.name) {
            txt = functionCallNode.name;
        } else {
            txt = `${name}(${functionCallNode.nodes.map((n) => this.visit(n).join()).join(', ')})`;
        }
        this.visitingFunctionCall = false;
        return [txt];
    }
    public visitColumn(columnNode: ColumnNode): string[] {
        let inSelectClause: boolean = false;
        inSelectClause = !this.selectOrDeleteEndIndex;
        const isCountStarExpression = (node: ColumnNode) => {
            if (!node.aggregator) {
                return false;
            }
            if (node.aggregator.toLowerCase() !== 'count') {
                return false;
            }
            if (!node.star) {
                return false;
            }
            return true;
        };
        const countStar = () => {
            // Implement our own since count(table.*) is invalid in Mysql
            let result = 'COUNT(*)';
            if (inSelectClause && columnNode.alias) {
                result += ` AS ${this.quote(columnNode.alias)}`;
            }
            return result;
        };
        if (isCountStarExpression(columnNode)) {
            return [countStar()];
        }
        return super.visitColumn(columnNode);
    }
    public visitInterval(intervalNode: IntervalNode): string[] {
        let parameter;
        if (isNumber(intervalNode.years)) {
            parameter = isNumber(intervalNode.months)
                ? `'${intervalNode.years}-${intervalNode.months}' YEAR_MONTH`
                : `${intervalNode.years} YEAR`;
        } else if (isNumber(intervalNode.months)) {
            parameter = `${intervalNode.months} MONTH`;
        } else if (isNumber(intervalNode.days)) {
            parameter = `'${intervalNode.days} ${isNumber(intervalNode.hours) ? intervalNode.hours : 0}:${
                isNumber(intervalNode.minutes) ? intervalNode.minutes : 0
            }:${isNumber(intervalNode.seconds) ? intervalNode.seconds : 0}' DAY_SECOND`;
        } else {
            parameter = `'${isNumber(intervalNode.hours) ? intervalNode.hours : 0}:${
                isNumber(intervalNode.minutes) ? intervalNode.minutes : 0
            }:${isNumber(intervalNode.seconds) ? intervalNode.seconds : 0}' HOUR_SECOND`;
        }
        return [`INTERVAL ${parameter}`];
    }
}
