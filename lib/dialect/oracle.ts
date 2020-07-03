'use strict';

import assert from 'assert';

import {
    AliasNode,
    AlterNode,
    BinaryNode,
    CascadeNode,
    CaseNode,
    ColumnNode,
    CreateNode,
    DropIndexNode,
    DropNode,
    IndexesNode,
    ModifierNode,
    Node,
    OnConflictNode,
    ParameterNode,
    ReplaceNode,
    RestrictNode,
    ReturningNode,
    TableNode
} from '../node';
import { Postgres } from './postgres';

export class Oracle extends Postgres {
    protected myClass = Oracle;

    protected aliasText = ' ';
    constructor(config: any) {
        super(config);
    }
    public _getParameterValue(
        value: null | boolean | number | string | any[] | Date | Buffer | object,
        quoteChar?: string
    ): string | number {
        return Buffer.isBuffer(value)
            ? "utl_raw.cast_to_varchar2(hextoraw('" + value.toString('hex') + "'))"
            : super._getParameterValue(value);
    }
    public _getParameterPlaceholder(index: string | number, value: any): string {
        return `:${index}`;
    }
    public visitReplace(replaceNode: ReplaceNode): string[] {
        throw new Error('Oracle does not support REPLACE.');
    }
    public visitAlias(aliasNode: AliasNode): string[] {
        const result = [this.visit(aliasNode.value) + ' ' + this.quote(aliasNode.alias)];
        return result;
    }
    public visitAlter(alterNode: AlterNode): string[] {
        const errMsg = 'ALTER TABLE cannot be used to perform multiple different operations in the same statement.';
        // Implement our own add column:
        //   PostgreSQL: ALTER TABLE "name" ADD COLUMN "col1", ADD COLUMN "col2"
        //   Oracle:  ALTER TABLE "name" ADD ("col1", "col2")
        const addColumn = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            this.visitingAddColumn = true;
            let result = 'ALTER TABLE ' + this.visit(table.toNode()) + ' ADD (' + this.visit(alterNode.nodes[0].nodes[0]);
            for (let i = 1, len = alterNode.nodes.length; i < len; i++) {
                const node = alterNode.nodes[i];
                assert(node.type === 'ADD COLUMN', errMsg);
                result += ', ' + this.visit(node.nodes[0]);
            }
            result += ')';
            this.visitingAddColumn = false;
            this.visitingAlter = false;
            return [result];
        };
        // Implement our own drop column:
        //   PostgreSQL: ALTER TABLE "name" DROP COLUMN "col1", DROP COLUMN "col2"
        //   Oracle:  ALTER TABLE "name" DROP ("col1", "col2")
        const dropColumn = () => {
            this.visitingAlter = true;
            const table = this.queryNode!.table;
            const result = ['ALTER TABLE', ...this.visit(table.toNode())];
            let columns = 'DROP (' + this.visit(alterNode.nodes[0].nodes[0]);
            for (let i = 1, len = alterNode.nodes.length; i < len; i++) {
                const node = alterNode.nodes[i];
                assert(node.type === 'DROP COLUMN', errMsg);
                columns += ', ' + this.visit(node.nodes[0]);
            }
            columns += ')';
            result.push(columns);
            this.visitingAlter = false;
            return result;
        };
        if (isAlterAddColumn(alterNode)) {
            return addColumn();
        }
        if (isAlterDropColumn(alterNode)) {
            return dropColumn();
        }
        return super.visitAlter(alterNode);
    }
    public visitTable(tableNode: TableNode): string[] {
        const table = tableNode.table;
        let txt = '';
        if (table.getSchema()) {
            txt = this.quote(table.getSchema()!);
            txt += '.';
        }
        txt += this.quote(table.getName());
        if (table.alias) {
            txt += ' ' + this.quote(table.alias);
        }
        return [txt];
    }
    public visitCascade(cascadeNode: CascadeNode): string[] {
        return ['CASCADE CONSTRAINTS'];
    }
    public visitRestrict(restrictNode: RestrictNode): string[] {
        throw new Error('Oracle do not support RESTRICT in DROP TABLE');
    }
    public visitDrop(dropNode: DropNode): string[] {
        if (!isDropIfExists(dropNode)) {
            return super.visitDrop(dropNode);
        }
        // Implement our own drop if exists:
        //   PostgreSQL: DROP TABLE IF EXISTS "group"
        //   Oracle:
        //     BEGIN
        //          EXECUTE IMMEDIATE 'DROP TABLE POST';
        //     EXCEPTION
        //          WHEN OTHERS THEN
        //                 IF SQLCODE != -942 THEN
        //                      RAISE;
        //                 END IF;
        //     END;
        const table = this.queryNode!.table;
        const tableResult = this.visit(table.toNode());
        const dropResult = ['DROP TABLE'];
        dropResult.push(...tableResult);
        return [
            "BEGIN EXECUTE IMMEDIATE '" + dropResult.join(' ') + "'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -942 THEN RAISE; END IF; END;"
        ];
    }
    public visitCreate(createNode: CreateNode): string[] {
        const isNotExists = isCreateIfNotExists(createNode);
        // const isTemporary=isCreateTemporary(create)
        let createText = super.visitCreate(createNode);
        if (isNotExists) {
            // Implement our own create if not exists:
            //   PostgreSQL: CREATE TABLE IF NOT EXISTS "group" ("id" constchar(100))
            //   Oracle:
            //     BEGIN
            //          EXECUTE IMMEDIATE 'CREATE TABLE ...';
            //     EXCEPTION
            //          WHEN OTHERS THEN
            //                 IF SQLCODE != -955 THEN
            //                      RAISE;
            //                 END IF;
            //     END;
            createText = [
                "BEGIN EXECUTE IMMEDIATE '" +
                    createText.join(' ').replace(' IF NOT EXISTS', '') +
                    "'; EXCEPTION WHEN OTHERS THEN IF SQLCODE != -955 THEN RAISE; END IF; END;"
            ];
        }
        return createText;
    }
    public visitBinary(binaryNode: BinaryNode): string[] {
        if (binaryNode.operator === '@@') {
            let text = '(INSTR (' + this.visit(binaryNode.left) + ', ';
            text += this.visit(binaryNode.right);
            text += ') > 0)';
            return [text];
        }
        if (!isRightSideArray(binaryNode)) {
            return super.visitBinary(binaryNode);
        }
        if (binaryNode.operator === 'IN' || binaryNode.operator === 'NOT IN') {
            return super.visitBinary(binaryNode);
        }
        throw new Error('Oracle does not support arrays in this type of expression.');
    }
    public visitModifier(modifierNode: ModifierNode): string[] {
        const ret = super.visitModifier(modifierNode);
        if (ret.indexOf('OFFSET') >= 0) {
            ret.push('ROWS');
        }
        if (ret.indexOf('LIMIT') >= 0) {
            ret[0] = 'FETCH NEXT';
            ret.push('ROWS ONLY');
        }
        return ret;
    }
    public visitQueryHelper(actions: Node[], targets: Node[], filters: Node[]): string[] {
        const output = super.visitQueryHelper(actions, targets, filters);
        // In Oracle, OFFSET must come before FETCH NEXT (limit)
        // Change positions, if both are present and not done already
        const offset = output.indexOf('OFFSET');
        const limit = output.indexOf('FETCH NEXT');
        if (offset !== -1 && limit !== -1 && offset > limit) {
            const temp = [output[offset], output[offset + 1], output[offset + 2]];
            output[offset] = output[limit];
            output[offset + 1] = output[limit + 1];
            output[offset + 2] = output[limit + 2];
            output[limit] = temp[0];
            output[limit + 1] = temp[1];
            output[limit + 2] = temp[2];
        }
        return this.output;
    }
    public visitColumn(columnNode: ColumnNode): string[] {
        const table = columnNode.table;
        const inSelectClause = !this.selectOrDeleteEndIndex;
        const arrayAgg = () => {
            throw new Error('Oracle does not support array_agg.');
        };
        const countStar = () => {
            // Implement our own since count(table.*) is invalid in Oracle
            let result = 'COUNT(*)';
            if (inSelectClause && columnNode.alias) {
                result += this.aliasText + this.quote(columnNode.alias);
            }
            return [result];
        };
        if (isCountStarExpression(columnNode)) {
            return countStar();
        }
        if (inSelectClause && table && !table.alias && columnNode.asArray) {
            return arrayAgg();
        }
        return super.visitColumn(columnNode);
    }
    public visitReturning(returningNode: ReturningNode): string[] {
        // TODO: need to add some code to the INSERT clause to support this since its the equivalent of the OUTPUT clause
        // in MS SQL which appears before the values, not at the end of the statement.
        throw new Error('Returning clause is not yet supported for Oracle.');
    }
    public visitIndexes(indexesNode: IndexesNode): string[] {
        const tableName = this.queryNode!.table.getName();
        const schemaName = this.queryNode!.table.getSchema();
        let indexes = "SELECT * FROM USER_INDEXES WHERE TABLE_NAME = '" + tableName + "'";
        if (schemaName) {
            indexes += " AND TABLE_OWNER = '" + schemaName + "'";
        }
        return [indexes];
    }
    public visitDropIndex(dropIndexNode: DropIndexNode): string[] {
        const result = ['DROP INDEX'];
        const schemaName = dropIndexNode.table.getSchema();
        if (schemaName) {
            result.push(this.quote(schemaName) + '.');
        }
        result.push(this.quote(dropIndexNode.options.indexName));
        return result;
    }
    // Need to implement a special version of CASE since Oracle doesn't support
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
    public visitOnConflict(onConflictNode: OnConflictNode): string[] {
        throw new Error('Oracle does not allow onConflict clause.');
    }
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
