// TODO: visitCreate needs to support schemas
// TODO: visitDrop needs to support schemas

'use strict';

import assert from 'assert';

import {
    AlterNode,
    BinaryNode,
    CaseNode,
    ColumnNode,
    CreateNode,
    DropNode,
    FunctionCallNode,
    ModifierNode,
    Node,
    OnConflictNode,
    OnDuplicateNode,
    OrderByNode,
    ParameterNode,
    ReplaceNode,
    ReturningNode,
    SelectNode
} from '../node';
import { Postgres } from './postgres';

/**
 * Config can contain:
 *
 * questionMarkParameterPlaceholder:true which will use a "?" for the parameter placeholder instead of the @index.
 *
 * @param config
 * @constructor
 */
export class Mssql extends Postgres {
    protected myClass = Mssql;
    protected quoteCharacter = '[';
    protected arrayAggFunctionName = '';
    constructor(config: { questionMarkParameterPlaceholder?: boolean }) {
        super(config);
    }
    public _getParameterPlaceholder(index: string | number, value: any): string {
        if (this.config.questionMarkParameterPlaceholder) {
            return '?';
        }
        return `@${index}`;
    }
    public visitReplace(replaceNode: ReplaceNode): string[] {
        throw new Error('Mssql does not support REPLACE.');
    }
    public visitBinary(binaryNode: BinaryNode): string[] {
        if (binaryNode.operator === '@@') {
            return [`(CONTAINS (${this.visit(binaryNode.left)}, ${this.visit(binaryNode.right)}))`];
        }
        if (!isRightSideArray(binaryNode)) {
            return super.visitBinary(binaryNode);
        }
        if (binaryNode.operator === 'IN' || binaryNode.operator === 'NOT IN') {
            return super.visitBinary(binaryNode);
        }
        throw new Error('SQL Sever does not support arrays in this type of expression.');
    }
    public visitAlter(alterNode: AlterNode): string[] {
        const errMsg = 'ALTER TABLE cannot be used to perform multiple different operations in the same statement.';
        // Implement our own add column:
        //   PostgreSQL: ALTER TABLE "name" ADD COLUMN "col1", ADD COLUMN "col2"
        //   Mssql:  ALTER TABLE [name] ADD [col1], [col2]
        const addColumn = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            this.visitingAddColumn = true;
            let result = `ALTER TABLE ${this.visit(table.toNode())} ADD ${this.visit(alterNode.nodes[0].nodes[0])}`;
            for (let i = 1, len = alterNode.nodes.length; i < len; i++) {
                const node = alterNode.nodes[i];
                assert(node.type === 'ADD COLUMN', errMsg);
                result += `, ${this.visit(node.nodes[0])}`;
            }
            this.visitingAddColumn = false;
            this.visitingAlter = false;
            return [result];
        };
        // Implement our own drop column:
        //   PostgreSQL: ALTER TABLE "name" DROP COLUMN "col1", DROP COLUMN "col2"
        //   Mssql:  ALTER TABLE [name] DROP COLUMN [col1], [col2]
        const dropColumn = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            const result = ['ALTER TABLE', ...this.visit(table.toNode())];
            let columns = `DROP COLUMN ${this.visit(alterNode.nodes[0].nodes[0])}`;
            for (let i = 1, len = alterNode.nodes.length; i < len; i++) {
                const node = alterNode.nodes[i];
                assert(node.type === 'DROP COLUMN', errMsg);
                columns += `, ${this.visit(node.nodes[0])}`;
            }
            result.push(columns);
            this.visitingAlter = false;
            return result;
        };
        // Implement our own rename table:
        //   PostgreSQL: ALTER TABLE "post" RENAME TO "posts"
        //   Mssql:  EXEC sp_rename [post], [posts]
        const rename = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            const result = ['EXEC sp_rename ' + this.visit(table.toNode()) + ', ' + this.visit(alterNode.nodes[0].nodes[0])];
            this.visitingAlter = false;
            return result;
        };
        // Implement our own rename column:
        //   PostgreSQL: ALTER TABLE "group" RENAME COLUMN "userId" TO "newUserId"
        //   Mssql:  EXEC sp_rename '[group].[userId]', [newUserId]
        const renameColumn = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            const result = [
                `EXEC sp_rename '${this.visit(table.toNode())}.${this.visit(alterNode.nodes[0].nodes[0])}', ${this.visit(
                    alterNode.nodes[0].nodes[1]
                )}, 'COLUMN'`
            ];
            this.visitingAlter = false;
            return result;
        };
        if (isAlterAddColumn(alterNode)) {
            return addColumn();
        }
        if (isAlterDropColumn(alterNode)) {
            return dropColumn();
        }
        if (isAlterRename(alterNode)) {
            return rename();
        }
        if (isAlterRenameColumn(alterNode)) {
            return renameColumn();
        }
        return super.visitAlter(alterNode);
    }
    // Need to implement a special version of CASE since SQL doesn't support
    //   CASE WHEN true THEN xxx END
    //   the "true" has to be a boolean expression like 1=1
    public visitCase(caseNode: CaseNode): string[] {
        const whenValue = (node: Node) => {
            if (node.type !== 'PARAMETER') {
                return this.visit(node);
            }
            // dealing with a true/false value
            const val = (node as ParameterNode).value();
            if (val === true) {
                return '1=1';
            } else {
                return '0=1';
            }
        };
        assert(caseNode.whenList.length === caseNode.thenList.length);
        let text = '(CASE';
        this.visitingCase = true;
        for (let i = 0; i < caseNode.whenList.length; i++) {
            text += ` WHEN ${whenValue(caseNode.whenList[i])} THEN ${this.visit(caseNode.thenList[i])}`;
        }
        if (caseNode.else != null) {
            text += ` ELSE ${this.visit(caseNode.else)}`;
        }
        this.visitingCase = false;
        text += ' END)';
        return [text];
    }
    public visitColumn(columnNode: ColumnNode): string[] {
        let table;
        let inSelectClause: boolean = false;
        table = columnNode.table;
        inSelectClause = !this.selectOrDeleteEndIndex;
        const arrayAgg = () => {
            throw new Error('SQL Server does not support array_agg.');
        };
        const countStar = () => {
            // Implement our own since count(table.*) is invalid in Mssql
            let result = 'COUNT(*)';
            if (inSelectClause && columnNode.alias) {
                result += ` AS ${this.quote(columnNode.alias)}`;
            }
            return result;
        };
        if (isCountStarExpression(columnNode)) {
            return [countStar()];
        }
        if (inSelectClause && table && !table.alias && columnNode.asArray) {
            return arrayAgg();
        }
        return super.visitColumn(columnNode);
    }
    public visitCreate(createNode: CreateNode): string[] {
        const isNotExists = isCreateIfNotExists(createNode);
        const isTemporary = isCreateTemporary(createNode);
        if (!isNotExists && !isTemporary) {
            return super.visitCreate(createNode);
        }
        // Implement our own create if not exists:
        //   PostgreSQL: CREATE TABLE IF NOT EXISTS "group" ("id" constchar(100))
        //   Mssql:  IF NOT EXISTS(SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'group') BEGIN ... END
        const table = this.queryNode!.table;
        const colNodes = table.columns.map((col) => col.toNode());
        const tableResult = this.visit(table.toNode());
        this.visitingCreate = true;
        const createResult = ['CREATE TABLE'];
        createResult.push(...tableResult);
        createResult.push(`(${colNodes.map(this.visit.bind(this)).join(', ')})`);
        this.visitingCreate = false;
        let tableStr = tableResult.join(' ');
        tableStr = tableStr.replace("'", "''");
        tableStr = `'${tableStr.substring(1, tableStr.length - 1)}'`;
        const whereClause = `WHERE TABLE_NAME = ${tableStr}`;
        // TODO: need to add schema check, sudo code:
        // if (schema) { whereClause+=' AND TABLE_SCHEMA = schemaResult.join(' ')}
        // Add some tests for this as well
        if (!isNotExists) {
            return createResult;
        }
        return [`IF NOT EXISTS(SELECT * FROM INFORMATION_SCHEMA.TABLES ${whereClause}) BEGIN ${createResult.join(' ')} END`];
    }
    public visitDrop(dropNode: DropNode): string[] {
        if (!isDropIfExists(dropNode)) {
            return super.visitDrop(dropNode);
        }
        // Implement our own drop if exists:
        //   PostgreSQL: DROP TABLE IF EXISTS "group"
        //   Mssql:  IF EXISTS(SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = [group]) BEGIN ... END
        const table = this.queryNode!.table;
        const tableResult = this.visit(table.toNode());
        const dropResult = ['DROP TABLE'];
        dropResult.push(...tableResult);
        const whereClause = `WHERE TABLE_NAME = ${tableResult.join(' ')}`;
        // TODO: need to add schema check, sudo code:
        // if (schema) { whereClause+=' AND TABLE_SCHEMA = schemaResult.join(' ')}
        // Add some tests for this as well
        return [`IF EXISTS(SELECT * FROM INFORMATION_SCHEMA.TABLES ${whereClause}) BEGIN ${dropResult.join(' ')} END`];
    }
    public visitFunctionCall(functionCallNode: FunctionCallNode): string[] {
        this.visitingFunctionCall = true;
        const extract = () => {
            const nodes = functionCallNode.nodes.map(this.visit.bind(this));
            if (nodes.length !== 1) {
                throw new Error(`Not enough parameters passed to ${functionCallNode.name} function`);
            }
            return `DATEPART(${functionCallNode.name.toLowerCase()}, ${nodes[0] + ''})`;
        };
        let txt;
        // Override date functions since mssql uses datepart
        if (['YEAR', 'MONTH', 'DAY', 'HOUR'].indexOf(functionCallNode.name) >= 0) {
            txt = extract();
        }
        // Override CURRENT_TIMESTAMP function to remove parens
        else if ('CURRENT_TIMESTAMP' === functionCallNode.name) {
            txt = functionCallNode.name;
        } else {
            let name = functionCallNode.name;
            // override the LENGTH function since mssql calls it LEN
            if (name === 'LENGTH') {
                name = 'LEN';
            }
            txt = `${name}(${functionCallNode.nodes.map(this.visit.bind(this)).join(', ')})`;
        }
        this.visitingFunctionCall = false;
        return [txt];
    }
    public visitOrderBy(orderByNode: OrderByNode): string[] {
        const result = super.visitOrderBy(orderByNode);
        const offsetNode = orderByNode.msSQLOffsetNode;
        const limitNode = orderByNode.msSQLLimitNode;
        if (!offsetNode && !limitNode) {
            return result;
        }
        assert(offsetNode, 'Something bad happened, should have had an msSQLOffsetNode here.');
        result.push('OFFSET ' + getModifierValue(this, offsetNode!) + ' ROWS');
        if (!limitNode) {
            return result;
        }
        result.push('FETCH NEXT ' + getModifierValue(this, limitNode) + ' ROWS ONLY');
        return result;
    }
    /**
     * We override this so that we can deal with the LIMIT and OFFSET clauses specially since they have to become
     * part of the SELECT and ORDER BY clauses.
     *
     * Basically if there's an ORDER BY clause we attach OFFSET and LIMIT to it so that it can be processed by the
     * ORDER BY handler later.
     *
     * If there's a LIMIT clause without OFFSET, we attach it to the SELECT clause so we can process it later.
     *
     * @param {Node[]} actions
     * @param {Node[]} targets
     * @param {Node[]} filters
     * @returns {String[]}
     */
    public visitQueryHelper(actions: Node[], targets: Node[], filters: Node[]): string[] {
        const handleLimitAndOffset = () => {
            const limitInfo = super.findNode(filters, 'LIMIT');
            const offsetInfo = super.findNode(filters, 'OFFSET');
            const orderByInfo = super.findNode(filters, 'ORDER BY');
            // no OFFSET or LIMIT then there's nothing special to do
            if (!offsetInfo && !limitInfo) {
                return;
            }
            // ORDER BY with OFFSET we have work to do, may consume LIMIT as well
            if (orderByInfo && offsetInfo) {
                processOrderByOffsetLimit(orderByInfo, offsetInfo, limitInfo);
            } else if (offsetInfo) {
                throw new Error('MS SQL Server does not allow OFFSET without ORDER BY');
            } else if (limitInfo) {
                processLimit(limitInfo);
            }
        };
        /**
         * We need to turn LIMIT into a TOP clause on the SELECT STATEMENT
         *
         * @param limitInfo
         * @private
         */
        const processLimit = (limitInfo: { index: number; node: Node }) => {
            const selectInfo = super.findNode(actions, 'SELECT');
            assert(selectInfo !== undefined, 'MS SQL Server requires a SELECT clause when using LIMIT');
            // save the LIMIT node with the SELECT node
            (selectInfo!.node as SelectNode).msSQLLimitNode = limitInfo.node as ModifierNode;
            // remove the LIMIT node from the filters so it doesn't get processed later.
            filters.splice(limitInfo.index, 1);
        };
        /**
         * We need to turn LIMIT into a TOP clause on the SELECT STATEMENT
         *
         * @param orderByInfo
         * @param offsetInfo
         * @param limitInfo
         * @private
         */
        const processOrderByOffsetLimit = (
            orderByInfo: {
                index: number;
                node: Node;
            },
            offsetInfo: {
                index: number;
                node: Node;
            },
            limitInfo?: {
                index: number;
                node: Node;
            }
        ) => {
            // save the OFFSET AND LIMIT nodes with the ORDER BY node
            (orderByInfo.node as OrderByNode).msSQLOffsetNode = offsetInfo.node as ModifierNode;
            if (limitInfo) {
                (orderByInfo.node as OrderByNode).msSQLLimitNode = limitInfo.node as ModifierNode;
            }
            // remove the OFFSET and LIMIT nodes from the filters so they don't get processed later.
            filters.splice(offsetInfo.index, 1);
            if (limitInfo) {
                filters.splice(limitInfo.index, 1);
            }
        };
        // MAIN
        super.handleDistinct(actions, filters);
        handleLimitAndOffset();
        // lazy-man sorting
        const sortedNodes = actions.concat(targets).concat(filters);
        for (const node of sortedNodes) {
            const res = this.visit(node);
            this.output = this.output.concat(res);
        }
        return this.output;
    }
    // Mysql.prototype.visitRenameColumn = function(renameColumn) {
    //  const dataType = renameColumn.nodes[1].dataType || renameColumn.nodes[0].dataType;
    //  assert(dataType, 'dataType missing for column ' + (renameColumn.nodes[1].name || renameColumn.nodes[0].name || '') +
    //    ' (CHANGE COLUMN statements require a dataType)');
    //  return ['CHANGE COLUMN ' + this.visit(renameColumn.nodes[0]) + ' ' + this.visit(renameColumn.nodes[1]) + ' ' + dataType];
    // };
    //
    // Mysql.prototype.visitInsert = function(insert) {
    //  const result = Postgres.prototype.visitInsert.call(this, insert);
    //  if (result[2] === 'DEFAULT VALUES') {
    //    result[2] = '() VALUES ()';
    //  }
    //  return result;
    // };
    //
    // Mysql.prototype.visitIndexes = function(node) {
    //  const tableName = this.visit(this._queryNode.table.toNode());
    //
    //  return "SHOW INDEX FROM " + tableName;
    // };
    public visitOnDuplicate(onDuplicateNode: OnDuplicateNode): string[] {
        throw new Error('MSSQL does not allow onDuplicate clause.');
    }
    public visitOnConflict(onConflictNode: OnConflictNode): string[] {
        throw new Error('MSSQL does not allow onConflict clause.');
    }
    public visitReturning(returningNode: ReturningNode): string[] {
        // TODO: need to add some code to the INSERT clause to support this since its the equivalent of the OUTPUT clause
        // in MS SQL which appears before the values, not at the end of the statement.
        throw new Error('Returning clause is not yet supported for MS SQL.');
    }
    // We deal with SELECT specially so we can add the TOP clause if needed
    public visitSelect(selectNode: SelectNode): string[] {
        if (!selectNode.msSQLLimitNode) {
            return super.visitSelect(selectNode);
        }
        const result = [
            'SELECT',
            'TOP(' + getModifierValue(this, selectNode.msSQLLimitNode) + ')',
            selectNode.nodes.map(this.visit.bind(this)).join(', ')
        ];
        this.selectOrDeleteEndIndex = this.output.length + result.length;
        return result;
    }
}

// Node is either an OFFSET or LIMIT node
function getModifierValue(dialect: Mssql, node: ModifierNode) {
    return node.count.type ? dialect.visit(node.count) : node.count;
}

function isAlterAddColumn(alterNode: AlterNode) {
    if (alterNode.nodes.length === 0) {
        return false;
    }
    if (alterNode.nodes[0].type !== 'ADD COLUMN') {
        return false;
    }
    return true;
}

function isAlterDropColumn(alterNode: AlterNode) {
    if (alterNode.nodes.length === 0) {
        return false;
    }
    if (alterNode.nodes[0].type !== 'DROP COLUMN') {
        return false;
    }
    return true;
}

function isAlterRename(alterNode: AlterNode) {
    if (alterNode.nodes.length === 0) {
        return false;
    }
    if (alterNode.nodes[0].type !== 'RENAME') {
        return false;
    }
    return true;
}

function isAlterRenameColumn(alterNode: AlterNode) {
    if (alterNode.nodes.length === 0) {
        return false;
    }
    if (alterNode.nodes[0].type !== 'RENAME COLUMN') {
        return false;
    }
    return true;
}

function isCountStarExpression(columnNode: ColumnNode) {
    if (!columnNode.aggregator) {
        return false;
    }
    if (columnNode.aggregator.toLowerCase() !== 'count') {
        return false;
    }
    if (!columnNode.star) {
        return false;
    }
    return true;
}

function isCreateIfNotExists(createNode: CreateNode) {
    if (createNode.nodes.length === 0) {
        return false;
    }
    if (createNode.nodes[0].type !== 'IF NOT EXISTS') {
        return false;
    }
    return true;
}

function isCreateTemporary(createNode: CreateNode) {
    return createNode.options.isTemporary;
}

function isDropIfExists(dropNode: DropNode) {
    if (dropNode.nodes.length === 0) {
        return false;
    }
    if (dropNode.nodes[0].type !== 'IF EXISTS') {
        return false;
    }
    return true;
}

// SQL Server does not support array expressions except in the IN clause.
function isRightSideArray(binaryNode: BinaryNode) {
    return Array.isArray(binaryNode.right);
}
