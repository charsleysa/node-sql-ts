'use strict';

import assert from 'assert';
import isFunction from 'lodash/isFunction';
import isNumber from 'lodash/isNumber';
import map from 'lodash/map';
import padStart from 'lodash/padStart';

import {
    AddColumnNode,
    AliasNode,
    AlterNode,
    ArrayCallNode,
    AtNode,
    BinaryNode,
    CascadeNode,
    CaseNode,
    CastNode,
    ColumnNode,
    CreateIndexNode,
    CreateNode,
    CreateViewNode,
    DefaultNode,
    DeleteNode,
    DistinctNode,
    DistinctOnNode,
    DropColumnNode,
    DropIndexNode,
    DropNode,
    ForeignKeyNode,
    ForShareNode,
    ForUpdateNode,
    FromNode,
    FunctionCallNode,
    GroupByNode,
    HavingNode,
    IfExistsNode,
    IfNotExistsNode,
    IndexesNode,
    InNode,
    InsertNode,
    IntervalNode,
    JoinNode,
    LiteralNode,
    ModifierNode,
    Node,
    NotInNode,
    OnConflictNode,
    OnDuplicateNode,
    OrderByNode,
    OrderByValueNode,
    OrIgnoreNode,
    ParameterNode,
    PostfixUnaryNode,
    PrefixUnaryNode,
    Query,
    RenameColumnNode,
    RenameNode,
    ReplaceNode,
    RestrictNode,
    ReturningNode,
    RowCallNode,
    SelectNode,
    SliceNode,
    TableNode,
    TernaryNode,
    TextNode,
    TruncateNode,
    UpdateNode,
    WhereNode
} from '../node';
import { Table } from '../table';
import { Dialect } from './dialect';

function dateToStringUTC(date: Date) {
    let year = date.getUTCFullYear();
    const isBCYear = year < 1;
    if (isBCYear) year = Math.abs(year) + 1; // negative years are 1 off their BC representation

    let ret =
        padStart(String(year), 4, '0') +
        '-' +
        padStart(String(date.getUTCMonth() + 1), 2, '0') +
        '-' +
        padStart(String(date.getUTCDate()), 2, '0') +
        'T' +
        padStart(String(date.getUTCHours()), 2, '0') +
        ':' +
        padStart(String(date.getUTCMinutes()), 2, '0') +
        ':' +
        padStart(String(date.getUTCSeconds()), 2, '0') +
        '.' +
        padStart(String(date.getUTCMilliseconds()), 3, '0');

    ret += 'Z';
    if (isBCYear) ret += ' BC';
    return ret;
}

/**
 * Config can contain:
 *
 * nullOrder: 'first' | 'last'
 *
 * @param config
 * @constructor
 */
export class Postgres extends Dialect {
    protected output: string[];
    protected params: string[];
    protected queryNode?: Query<unknown>;
    protected myClass: typeof Postgres = Postgres;
    protected arrayAggFunctionName: string = 'array_agg';
    protected aliasText: string = ' AS ';
    protected quoteCharacter: string = '"';
    protected disableParameterPlaceholders: boolean = false;
    protected selectOrDeleteEndIndex: number = 0;
    protected visitedInsert: boolean = false;
    protected visitingUpdateTargetColumn: boolean = false;
    protected visitingCreate: boolean = false;
    protected visitCreateCompoundPrimaryKey: boolean = false;
    protected visitingAlter: boolean = false;
    protected visitingCast: boolean = false;
    protected visitingWhere: boolean = false;
    protected visitingCase: boolean = false;
    protected visitedReplace: boolean = false;
    protected visitingAddColumn: boolean = false;
    protected visitingReturning: boolean = false;
    protected visitingJoin: boolean = false;
    protected visitingFunctionCall: boolean = false;
    constructor(config: any) {
        super(config);
        this.output = [];
        this.params = [];
    }
    public _getParameterText(index: number, value: any): string {
        if (this.disableParameterPlaceholders) {
            // do not use placeholder
            return this._getParameterValue(value).toString();
        } else {
            // use placeholder
            return this._getParameterPlaceholder(index, value);
        }
    }
    public _getParameterValue(
        value: null | boolean | number | string | any[] | Date | Buffer | object,
        quoteChar?: string
    ): string | number {
        // handle primitives
        if (null === value) {
            value = 'NULL';
        } else if ('boolean' === typeof value) {
            value = value ? 'TRUE' : 'FALSE';
        } else if ('number' === typeof value) {
            // number is just number
            value = value;
        } else if ('string' === typeof value) {
            // string uses single quote by default
            value = this.quote(value, quoteChar || "'");
        } else if ('object' === typeof value) {
            if (Array.isArray(value)) {
                if (this.myClass === Postgres) {
                    // naive check to see if this is an array of objects, which
                    // is handled differently than an array of primitives
                    if (value.length && 'object' === typeof value[0] && !isFunction(value[0].toISOString) && !Array.isArray(value[0])) {
                        value = `'${JSON.stringify(value)}'`;
                    } else {
                        // In a Postgres array, strings must be double-quoted
                        value = value.map((item) => this._getParameterValue(item, '"'));
                        value = `'{${(value as any[]).join(',')}}'`;
                    }
                } else {
                    value = map(value, this._getParameterValue.bind(this));
                    value = `(${(value as any[]).join(', ')})`;
                }
            } else if (value instanceof Date) {
                // Date object's default toString format does not get parsed well
                // Handle dates using custom dateToString method for postgres and toISOString for others
                value = (this.myClass === Postgres)
                    ? this._getParameterValue(dateToStringUTC(value))
                    : this._getParameterValue(value.toISOString());
            } else if (Buffer.isBuffer(value)) {
                value = this._getParameterValue('\\x' + value.toString('hex'));
            } else {
                // rich object represent with string
                const strValue = value.toString();
                value = strValue === '[object Object]' ? this._getParameterValue(JSON.stringify(value)) : this._getParameterValue(strValue);
            }
        } else {
            throw new Error(`Unable to use ${value} in query`);
        }
        // value has been converted at this point
        return value;
    }
    public _getParameterPlaceholder(index: string | number, value: unknown): string {
        return '$' + index;
    }
    public getQuery(queryNode: Query<unknown> | Table<unknown>): { text: string, values: string[] } {
        // passed in a table, not a query
        if (queryNode instanceof Table) {
            queryNode = queryNode.select(queryNode.star());
        }
        this.output = this.visit(queryNode);
        // if is a create view, must replace paramaters with values
        if (this.output.indexOf('CREATE VIEW') > -1) {
            const previousFlagStatus = this.disableParameterPlaceholders;
            this.disableParameterPlaceholders = true;
            this.output = [];
            this.output = this.visit(queryNode);
            this.params = [];
            this.disableParameterPlaceholders = previousFlagStatus;
        }
        // create the query object
        const query = { text: this.output.join(' '), values: this.params };
        // reset the internal state of this builder
        this.output = [];
        this.params = [];
        return query;
    }
    public getString(queryNode: Query<unknown>) {
        // switch off parameter placeholders
        const previousFlagStatus = this.disableParameterPlaceholders;
        this.disableParameterPlaceholders = true;
        let query;
        try {
            // use the same code path for query building
            query = this.getQuery(queryNode);
        } finally {
            // always restore the flag afterwards
            this.disableParameterPlaceholders = previousFlagStatus;
        }
        return query.text;
    }
    public visit(node: Node): string[] {
        switch (node.type) {
            case 'QUERY':
                return this.visitQuery(node as Query<unknown>);
            case 'SUBQUERY':
                return this.visitSubquery(node as Query<unknown>);
            case 'SELECT':
                return this.visitSelect(node as SelectNode);
            case 'INSERT':
                return this.visitInsert(node as InsertNode);
            case 'REPLACE':
                return this.visitReplace(node as ReplaceNode);
            case 'UPDATE':
                return this.visitUpdate(node as UpdateNode);
            case 'DELETE':
                return this.visitDelete(node as DeleteNode);
            case 'CREATE':
                return this.visitCreate(node as CreateNode);
            case 'DROP':
                return this.visitDrop(node as DropNode);
            case 'TRUNCATE':
                return this.visitTruncate(node as TruncateNode);
            case 'DISTINCT':
                return this.visitDistinct(node as DistinctNode);
            case 'DISTINCT ON':
                return this.visitDistinctOn(node as DistinctOnNode);
            case 'ALIAS':
                return this.visitAlias(node as AliasNode);
            case 'ALTER':
                return this.visitAlter(node as AlterNode);
            case 'CAST':
                return this.visitCast(node as CastNode);
            case 'FROM':
                return this.visitFrom(node as FromNode);
            case 'WHERE':
                return this.visitWhere(node as WhereNode);
            case 'ORDER BY':
                return this.visitOrderBy(node as OrderByNode);
            case 'ORDER BY VALUE':
                return this.visitOrderByValue(node as OrderByValueNode);
            case 'GROUP BY':
                return this.visitGroupBy(node as GroupByNode);
            case 'HAVING':
                return this.visitHaving(node as HavingNode);
            case 'RETURNING':
                return this.visitReturning(node as ReturningNode);
            case 'ONDUPLICATE':
                return this.visitOnDuplicate(node as OnDuplicateNode);
            case 'ONCONFLICT':
                return this.visitOnConflict(node as OnConflictNode);
            case 'FOR UPDATE':
                return this.visitForUpdate(node as ForUpdateNode);
            case 'FOR SHARE':
                return this.visitForShare(node as ForShareNode);
            case 'TABLE':
                return this.visitTable(node as TableNode);
            case 'COLUMN':
                return this.visitColumn(node as ColumnNode);
            case 'FOREIGN KEY':
                return this.visitForeignKey(node as ForeignKeyNode);
            case 'JOIN':
                return this.visitJoin(node as JoinNode);
            case 'LITERAL':
                return this.visitLiteral(node as LiteralNode);
            case 'TEXT':
                return this.visitText(node as TextNode);
            case 'PARAMETER':
                return this.visitParameter(node as ParameterNode);
            case 'DEFAULT':
                return this.visitDefault(node as DefaultNode);
            case 'IF EXISTS':
                return this.visitIfExists(node as IfExistsNode);
            case 'IF NOT EXISTS':
                return this.visitIfNotExists(node as IfNotExistsNode);
            case 'OR IGNORE':
                return this.visitOrIgnore(node as OrIgnoreNode);
            case 'CASCADE':
                return this.visitCascade(node as CascadeNode);
            case 'RESTRICT':
                return this.visitRestrict(node as RestrictNode);
            case 'RENAME':
                return this.visitRename(node as RenameNode);
            case 'ADD COLUMN':
                return this.visitAddColumn(node as AddColumnNode);
            case 'DROP COLUMN':
                return this.visitDropColumn(node as DropColumnNode);
            case 'RENAME COLUMN':
                return this.visitRenameColumn(node as RenameColumnNode);
            case 'INDEXES':
                return this.visitIndexes(node as IndexesNode);
            case 'CREATE INDEX':
                return this.visitCreateIndex(node as CreateIndexNode);
            case 'DROP INDEX':
                return this.visitDropIndex(node as DropIndexNode);
            case 'FUNCTION CALL':
                return this.visitFunctionCall(node as FunctionCallNode);
            case 'ARRAY CALL':
                return this.visitArrayCall(node as ArrayCallNode);
            case 'ROW CALL':
                return this.visitRowCall(node as RowCallNode);
            case 'CREATE VIEW':
                return this.visitCreateView(node as CreateViewNode);
            case 'INTERVAL':
                return this.visitInterval(node as IntervalNode);
            case 'POSTFIX UNARY':
                return this.visitPostfixUnary(node as PostfixUnaryNode);
            case 'PREFIX UNARY':
                return this.visitPrefixUnary(node as PrefixUnaryNode);
            case 'BINARY':
                return this.visitBinary(node as BinaryNode);
            case 'TERNARY':
                return this.visitTernary(node as TernaryNode);
            case 'IN':
                return this.visitIn(node as InNode);
            case 'NOT IN':
                return this.visitNotIn(node as NotInNode);
            case 'CASE':
                return this.visitCase(node as CaseNode);
            case 'AT':
                return this.visitAt(node as AtNode);
            case 'SLICE':
                return this.visitSlice(node as SliceNode);
            case 'LIMIT':
            case 'OFFSET':
                return this.visitModifier(node as ModifierNode);
            default:
                throw new Error(`Unrecognized node type ${node.type}`);
        }
    }
    public quote(word: string, quoteCharacter?: string) {
        const q = quoteCharacter != null ? quoteCharacter : this.quoteCharacter;
        // handle square brackets specially
        if (q === '[') {
            return '[' + word + ']';
        } else {
            return q + word.replace(new RegExp(q, 'g'), q + q) + q;
        }
    }
    public visitSelect(selectNode: SelectNode): string[] {
        const result = ['SELECT'];
        if (selectNode.isDistinct) {
            result.push('DISTINCT');
        }
        const distinctOnNode = selectNode.nodes.filter((node) => node.type === 'DISTINCT ON').shift();
        const nonDistinctOnNodes = selectNode.nodes.filter((node) => node.type !== 'DISTINCT ON');
        if (distinctOnNode) {
            result.push(this.visit(distinctOnNode).join());
        }
        result.push(nonDistinctOnNodes.map(this.visit.bind(this)).join(', '));
        this.selectOrDeleteEndIndex = this.output.length + result.length;
        return result;
    }
    public visitInsert(insertNode: InsertNode): string[] {
        // don't use table.column for inserts
        this.visitedInsert = true;
        const result = ['INSERT', ...insertNode.nodes.map((n) => this.visit(n).join())];
        result.push(`INTO ${this.visit(this.queryNode!.table.toNode()).join()}`);
        result.push(`(${insertNode.columns.map(this.visit.bind(this)).join(', ')})`);
        const paramNodes = insertNode.getParameters();
        if (paramNodes.length > 0) {
            const paramText = paramNodes
                .map((paramSet) => {
                    return paramSet.map((param) => this.visit(param)).join(', ');
                })
                .map((param) => `(${param})`)
                .join(', ');
            result.push('VALUES', paramText);
            if (result.slice(2, 5).join(' ') === '() VALUES ()') {
                result.splice(2, 3, 'DEFAULT VALUES');
            }
        }
        this.visitedInsert = false;
        return result;
    }
    public visitReplace(replaceNode: ReplaceNode): string[] {
        throw new Error('Postgres does not support REPLACE.');
    }
    public visitUpdate(updateNode: UpdateNode): string[] {
        // don't auto-generate from clause
        const params: string[] = [];
        /* jshint boss: true */
        for (const node of updateNode.nodes as ColumnNode[]) {
            this.visitingUpdateTargetColumn = true;
            const targetCol = this.visit(node);
            this.visitingUpdateTargetColumn = false;
            params.push(`${targetCol} = ${this.visit(node.value)}`);
        }
        const result = ['UPDATE', this.visit(this.queryNode!.table.toNode()).join(), 'SET', params.join(', ')];
        return result;
    }
    public visitDelete(deleteNode: DeleteNode): string[] {
        const result = ['DELETE'];
        if (deleteNode.nodes.length) {
            result.push(deleteNode.nodes.map(this.visit.bind(this)).join(', '));
        }
        this.selectOrDeleteEndIndex = result.length;
        return result;
    }
    public visitCreate(createNode: CreateNode): string[] {
        this.visitingCreate = true;
        // don't auto-generate from clause
        const table = this.queryNode!.table;
        const colNodes = table.columns.map((col) => col.toNode());
        const foreignKeyNodes = table.foreignKeys;
        let result = ['CREATE TABLE'];
        if (createNode.options.isTemporary) {
            result = ['CREATE TEMPORARY TABLE'];
        }
        result = result.concat(createNode.nodes.map((n) => this.visit(n).join()));
        result.push(this.visit(table.toNode()).join());
        const primaryColNodes = colNodes.filter((n) => n.primaryKey);
        this.visitCreateCompoundPrimaryKey = primaryColNodes.length > 1;
        let colspec = `(${colNodes.map((n) => this.visit(n).join()).join(', ')}`;
        if (this.visitCreateCompoundPrimaryKey) {
            colspec += `, PRIMARY KEY (${primaryColNodes.map((node) => this.quote(node.name)).join(', ')})`;
        }
        if (foreignKeyNodes.length > 0) {
            colspec += `, ${foreignKeyNodes.map((n) => this.visit(n).join()).join(', ')}`;
        }
        colspec += ')';
        result.push(colspec);
        this.visitCreateCompoundPrimaryKey = false;
        this.visitingCreate = false;
        return result;
    }
    public visitDrop(dropNode: DropNode): string[] {
        // don't auto-generate from clause
        let result = ['DROP TABLE'];
        result = result.concat(dropNode.nodes.map((n) => this.visit(n).join()));
        return result;
    }
    public visitTruncate(truncateNode: TruncateNode): string[] {
        let result = ['TRUNCATE TABLE'];
        result = result.concat(truncateNode.nodes.map((n) => this.visit(n).join()));
        return result;
    }
    public visitDistinct(distinctNode: DistinctNode): string[] {
        // Nothing to do here since it's handled in the SELECT clause
        return [];
    }
    public visitDistinctOn(distinctOnNode: DistinctOnNode): string[] {
        return [`DISTINCT ON(${distinctOnNode.nodes.map((n) => this.visit(n).join()).join(', ')})`];
    }
    public visitAlias(aliasNode: AliasNode): string[] {
        const result = [this.visit(aliasNode.value) + this.aliasText + this.quote(aliasNode.alias)];
        return result;
    }
    public visitAlter(alterNode: AlterNode): string[] {
        this.visitingAlter = true;
        // don't auto-generate from clause
        const table = this.queryNode!.table;
        const result: string[] = ['ALTER TABLE', ...this.visit(table.toNode()), alterNode.nodes.map(this.visit.bind(this)).join(', ')];
        this.visitingAlter = false;
        return result;
    }
    public visitCast(castNode: CastNode): string[] {
        this.visitingCast = true;
        const result: string[] = ['CAST(' + this.visit(castNode.value) + ' AS ' + castNode.dataType + ')'];
        this.visitingCast = false;
        return result;
    }
    public visitFrom(fromNode: FromNode): string[] {
        let result = [];
        if (fromNode.skipFromStatement) {
            result.push(',');
        } else {
            result.push('FROM');
        }
        for (const node of fromNode.nodes) {
            result = result.concat(this.visit(node));
        }
        return result;
    }
    public visitWhere(whereNode: WhereNode): string[] {
        this.visitingWhere = true;
        const result = ['WHERE', whereNode.nodes.map(this.visit.bind(this)).join(', ')];
        this.visitingWhere = false;
        return result;
    }
    public visitOrderBy(orderByNode: OrderByNode): string[] {
        const result = ['ORDER BY', orderByNode.nodes.map(this.visit.bind(this)).join(', ')];
        if (this.myClass === Postgres && this.config.nullOrder) {
            result.push('NULLS ' + this.config.nullOrder.toUpperCase());
        }
        return result;
    }
    public visitOrderByValue(orderByValueNode: OrderByValueNode): string[] {
        let text = this.visit(orderByValueNode.value).join();
        if (orderByValueNode.direction) {
            text += ' ' + this.visit(orderByValueNode.direction).join();
        }
        return [text];
    }
    public visitGroupBy(groupByNode: GroupByNode): string[] {
        const result = ['GROUP BY', groupByNode.nodes.map(this.visit.bind(this)).join(', ')];
        return result;
    }
    public visitHaving(havingNode: HavingNode): string[] {
        const result = ['HAVING', havingNode.nodes.map(this.visit.bind(this)).join(' AND ')];
        return result;
    }
    public visitPrefixUnary(prefixUnaryNode: PrefixUnaryNode): string[] {
        const text = '(' + prefixUnaryNode.operator + ' ' + this.visit(prefixUnaryNode.left) + ')';
        return [text];
    }
    public visitPostfixUnary(postfixUnaryNode: PostfixUnaryNode): string[] {
        const text = '(' + this.visit(postfixUnaryNode.left) + ' ' + postfixUnaryNode.operator + ')';
        return [text];
    }
    public visitBinary(binaryNode: BinaryNode): string[] {
        (binaryNode.left as any).property = (binaryNode.left as any).name;
        (binaryNode.right as any).property = (binaryNode.right as any).name;
        let text = `(${this.visit(binaryNode.left)} ${binaryNode.operator} `;
        if (Array.isArray(binaryNode.right)) {
            text += `(${binaryNode.right.map((node) => this.visit(node)).join(', ')})`;
        } else {
            text += this.visit(binaryNode.right).join();
        }
        text += ')';
        return [text];
    }
    public visitTernary(ternaryNode: TernaryNode): string[] {
        const visitPart = (value: Node) => {
            return Array.isArray(value) ? `(${value.map((node) => this.visit(node)).join(', ')})` : this.visit(value).join();
        };
        const text = `(${this.visit(ternaryNode.left)} ${ternaryNode.operator} ${visitPart(ternaryNode.middle)} ${
            ternaryNode.separator
        } ${visitPart(ternaryNode.right)})`;
        return [text];
    }
    public visitIn(inNode: InNode): string[] {
        let text = '(';
        if (Array.isArray(inNode.right)) {
            if (inNode.right.length) {
                const params: string[] = [];
                let hasNull = false;
                inNode.right.forEach((node) => {
                    if (node.type === 'PARAMETER' && (node as ParameterNode).value() === null) {
                        hasNull = true;
                    } else {
                        params.push(this.visit(node).join());
                    }
                });
                if (params.length) {
                    text += `${this.visit(inNode.left)} IN (${params.join(', ')})`;
                    if (hasNull) {
                        text += ` OR ${this.visit(inNode.left)} IS NULL`;
                    }
                } else {
                    // implicitely has null
                    text += `${this.visit(inNode.left)} IS NULL`;
                }
            } else {
                text += '1=0';
            }
        } else {
            text += `${this.visit(inNode.left)} IN ${this.visit(inNode.right)}`;
        }
        text += ')';
        return [text];
    }
    public visitNotIn(notInNode: NotInNode): string[] {
        let text = '(';
        if (Array.isArray(notInNode.right)) {
            if (notInNode.right.length) {
                const params: string[] = [];
                let hasNull = false;
                notInNode.right.forEach((node) => {
                    if (node.type === 'PARAMETER' && (node as ParameterNode).value() === null) {
                        hasNull = true;
                    } else {
                        params.push(this.visit(node).join());
                    }
                });
                if (params.length && hasNull) {
                    text += `NOT (${this.visit(notInNode.left)} IN (${params.join(', ')}) OR ${this.visit(notInNode.left)} IS NULL)`;
                } else if (params.length) {
                    text += `${this.visit(notInNode.left)} NOT IN (${params.join(', ')})`;
                } else {
                    // implicitely has null
                    text += `${this.visit(notInNode.left)} IS NOT NULL`;
                }
            } else {
                text += '1=1';
            }
        } else {
            text += `${this.visit(notInNode.left)} NOT IN ${this.visit(notInNode.right)}`;
        }
        text += ')';
        return [text];
    }
    public visitCase(caseNode: CaseNode): string[] {
        assert(caseNode.whenList.length === caseNode.thenList.length);
        let text = '(CASE';
        this.visitingCase = true;
        for (let i = 0; i < caseNode.whenList.length; i++) {
            text += ` WHEN ${this.visit(caseNode.whenList[i])} THEN ${this.visit(caseNode.thenList[i])}`;
        }
        if (caseNode.else != null) {
            text += ` ELSE ${this.visit(caseNode.else)}`;
        }
        this.visitingCase = false;
        text += ' END)';
        return [text];
    }
    public visitAt(atNode: AtNode): string[] {
        const text = `(${this.visit(atNode.value)})[${this.visit(atNode.index)}]`;
        return [text];
    }
    public visitSlice(sliceNode: SliceNode): string[] {
        const text = `(${this.visit(sliceNode.value)})[${this.visit(sliceNode.start)}:${this.visit(sliceNode.end)}]`;
        return [text];
    }
    public visitQuery(queryNode: Query<unknown>): string[] {
        if (this.queryNode) {
            return this.visitSubquery(queryNode, dontParenthesizeSubQuery(this.queryNode));
        }
        this.queryNode = queryNode;
        // need to sort the top level query nodes on visitation priority
        // so select/insert/update/delete comes before from comes before where
        let missingFrom = true;
        let hasFrom = false;
        let createView;
        let isSelect = false;
        const actions = [];
        const targets = [];
        const filters = [];
        for (const node of queryNode.nodes) {
            switch (node.type) {
                case 'SELECT':
                    isSelect = true;
                case 'DELETE':
                    actions.push(node);
                    break;
                case 'INDEXES':
                case 'INSERT':
                case 'REPLACE':
                case 'UPDATE':
                case 'CREATE':
                case 'DROP':
                case 'TRUNCATE':
                case 'ALTER':
                    actions.push(node);
                    missingFrom = false;
                    break;
                case 'FROM':
                    (node as FromNode).skipFromStatement = hasFrom;
                    hasFrom = true;
                    missingFrom = false;
                    targets.push(node);
                    break;
                case 'CREATE VIEW':
                    createView = node;
                    break;
                default:
                    filters.push(node);
                    break;
            }
        }
        if (!actions.length) {
            // if no actions are given, guess it's a select
            actions.push(new SelectNode().add('*'));
            isSelect = true;
        }
        if (missingFrom && queryNode.table instanceof Table) {
            // the instanceof handles the situation where a sql.select(some expression) is used and there should be no FROM clause
            targets.push(new FromNode().add(queryNode.table));
        }
        if (createView) {
            if (isSelect) {
                actions.unshift(createView);
            } else {
                throw new Error('Create View requires a Select.');
            }
        }
        return this.visitQueryHelper(actions, targets, filters);
    }
    /**
     * We separate out this part of query building so it can be overridden by other implementations.
     *
     * @param {Node[]} actions
     * @param {Node[]} targets
     * @param {Node[]} filters
     * @returns {String[]}
     */
    public visitQueryHelper(actions: Node[], targets: Node[], filters: Node[]): string[] {
        this.handleDistinct(actions, filters);
        // lazy-man sorting
        const sortedNodes = actions.concat(targets).concat(filters);
        for (const node of sortedNodes) {
            const res = this.visit(node);
            this.output = this.output.concat(res);
        }
        // implicit 'from'
        return this.output;
    }
    public visitSubquery(queryNode: Query<unknown>, dontParenthesize?: boolean): string[] {
        // create another query builder of the current class to build the subquery
        const subQuery = new this.myClass(this.config);
        // let the subquery modify this instance's params array
        subQuery.params = this.params;
        // pass on the disable parameter placeholder flag
        const previousFlagStatus = subQuery.disableParameterPlaceholders;
        subQuery.disableParameterPlaceholders = this.disableParameterPlaceholders;
        try {
            subQuery.visitQuery(queryNode);
        } finally {
            // restore the flag
            subQuery.disableParameterPlaceholders = previousFlagStatus;
        }
        const alias = queryNode.alias;
        if (dontParenthesize) {
            return [subQuery.output.join(' ') + (alias ? ' ' + this.quote(alias) : '')];
        }
        return ['(' + subQuery.output.join(' ') + ')' + (alias ? ' ' + this.quote(alias) : '')];
    }
    public visitTable(tableNode: TableNode): string[] {
        const table = tableNode.table;
        let txt = '';
        if (table.getSchema()) {
            txt = this.quote(table.getSchema()!);
            txt += '.';
        }
        txt += this.quote(table.getName());
        if (typeof table.alias === 'string') {
            txt += this.aliasText + this.quote(table.alias);
        }
        return [txt];
    }
    public visitColumn(columnNode: ColumnNode): string[] {
        const table = columnNode.table;
        const inInsertUpdateClause = this.visitedInsert || this.visitedReplace || this.visitingUpdateTargetColumn;
        const inDdlClause = this.visitingAddColumn || this.visitingAlter || this.visitingCreate;
        const inSelectClause =
            this.visitingReturning ||
            (!this.selectOrDeleteEndIndex &&
                !this.visitingWhere &&
                !inInsertUpdateClause &&
                !inDdlClause &&
                !this.visitingCase &&
                !this.visitingJoin);
        const inFunctionCall = this.visitingFunctionCall;
        const inCast = this.visitingCast;
        const txt = [];
        let closeParen = 0;
        if (inSelectClause && ((table && !table.alias) || !!columnNode.alias)) {
            if (columnNode.asArray) {
                closeParen++;
                txt.push(`${this.arrayAggFunctionName}(`);
            }
            if (!!columnNode.aggregator) {
                closeParen++;
                txt.push(`${columnNode.aggregator}(`);
            }
            if (columnNode.isDistinct === true) {
                closeParen++;
                txt.push('DISTINCT(');
            }
        }
        if (
            !inInsertUpdateClause &&
            !this.visitingReturning &&
            !this.visitingCreate &&
            !this.visitingAlter &&
            !columnNode.subfieldContainer
        ) {
            if (table) {
                if (typeof table.alias === 'string') {
                    txt.push(this.quote(table.alias));
                } else {
                    if (table.getSchema()) {
                        txt.push(this.quote(table.getSchema()!));
                        txt.push('.');
                    }
                    txt.push(this.quote(table.getName()));
                }
                txt.push('.');
            }
        }
        if (columnNode.star) {
            const allCols = [];
            let hasAliases = false;
            if (columnNode.aggregator !== 'COUNT') {
                const tableName = txt.join('');
                for (const col of table!.columns) {
                    const aliased = col.name !== (col.alias || col.property!);
                    hasAliases = hasAliases || aliased;
                    allCols.push(
                        tableName + this.quote(col.name) + (aliased ? this.aliasText + this.quote(col.alias || col.property!) : '')
                    );
                }
            }
            if (hasAliases) {
                txt.length = 0;
                txt.push(allCols.join(', '));
            } else {
                txt.push('*');
            }
        } else if (columnNode.isConstant) {
            // this injects directly into SELECT statement rather than creating a parameter
            //   txt.push(this._getParameterValue(columnNode.literalValue))
            // currently thinking it is better to generate a parameter
            const value = columnNode.constantValue;
            this.params.push(value);
            txt.push(this._getParameterText(this.params.length, value));
        } else {
            if (columnNode.subfieldContainer) {
                txt.push('(' + this.visitColumn(columnNode.subfieldContainer.toNode()) + ').');
            }
            txt.push(this.quote(columnNode.name));
        }
        if (closeParen) {
            for (let j = 0; j < closeParen; j++) {
                txt.push(')');
            }
        }
        if (inSelectClause && !inFunctionCall && !inCast && (columnNode.alias || columnNode.property !== columnNode.name)) {
            txt.push(this.aliasText + this.quote(columnNode.alias || columnNode.property));
        }
        if (this.visitingCreate || this.visitingAddColumn) {
            assert(
                columnNode.dataType,
                `dataType missing for column ${columnNode.name} (CREATE TABLE and ADD COLUMN statements require a dataType)`
            );
            txt.push(` ${columnNode.dataType}`);
            if (this.visitingCreate) {
                if (columnNode.primaryKey && !this.visitCreateCompoundPrimaryKey) {
                    // creating a column as a primary key
                    txt.push(' PRIMARY KEY');
                } else if (columnNode.notNull) {
                    txt.push(' NOT NULL');
                }
                if (!columnNode.primaryKey && columnNode.unique) {
                    txt.push(' UNIQUE');
                }
                if (columnNode.defaultValue !== undefined) {
                    txt.push(` DEFAULT ${this._getParameterValue(columnNode.defaultValue)}`);
                }
            }
            if (!!columnNode.references) {
                assert.strictEqual(
                    typeof columnNode.references,
                    'object',
                    'references is not a object for column ' +
                        columnNode.name +
                        ' (REFERENCES statements within CREATE TABLE and ADD COLUMN statements' +
                        ' require refrences to be expressed as an object)'
                );
                // Empty refrence objects are ok
                if (Object.keys(columnNode.references).length > 0) {
                    const references = columnNode.references! as Exclude<NonNullable<typeof columnNode.references>, string>;
                    assert(
                        references.table,
                        'reference.table missing for column ' +
                            columnNode.name +
                            ' (REFERENCES statements within CREATE TABLE and ADD COLUMN statements' +
                            ' require a table and column)'
                    );
                    assert(
                        references.column,
                        'reference.column missing for column ' +
                            columnNode.name +
                            ' (REFERENCES statements within CREATE TABLE and ADD COLUMN statements' +
                            ' require a table and column)'
                    );
                    txt.push(' REFERENCES ');
                    // TODO: if this is used need to put back in
                    // if (references.schema) {
                    //     txt.push(this.quote(references.schema) + '.');
                    // }
                    txt.push(this.quote(references.table!) + '(' + this.quote(references.column!) + ')');
                    let onDelete: string | undefined = references.onDelete;
                    if (onDelete) {
                        onDelete = onDelete.toUpperCase();
                    }
                    if (
                        onDelete === 'CASCADE' ||
                        onDelete === 'RESTRICT' ||
                        onDelete === 'SET NULL' ||
                        onDelete === 'SET DEFAULT' ||
                        onDelete === 'NO ACTION'
                    ) {
                        txt.push(` ON DELETE ${onDelete}`);
                    }
                    let onUpdate: string | undefined = references.onUpdate;
                    if (onUpdate) {
                        onUpdate = onUpdate.toUpperCase();
                    }
                    if (
                        onUpdate === 'CASCADE' ||
                        onUpdate === 'RESTRICT' ||
                        onUpdate === 'SET NULL' ||
                        onUpdate === 'SET DEFAULT' ||
                        onUpdate === 'NO ACTION'
                    ) {
                        txt.push(` ON UPDATE ${onUpdate}`);
                    }
                    const constraint: string | undefined = references.constraint;
                    if (constraint) {
                        txt.push(` ${constraint.toUpperCase()}`);
                    }
                }
            }
        }
        return [txt.join('')];
    }
    public visitForeignKey(foreignKeyNode: ForeignKeyNode): string[] {
        const txt = [];
        if (this.visitingCreate) {
            assert(foreignKeyNode.table, 'Foreign table missing for table reference');
            assert(foreignKeyNode.columns, 'Columns missing for table reference');
            if (foreignKeyNode.refColumns !== undefined) {
                assert.strictEqual(
                    foreignKeyNode.columns.length,
                    foreignKeyNode.refColumns.length,
                    'Number of local columns and foreign columns differ in table reference'
                );
            }
            if (foreignKeyNode.name !== undefined) {
                txt.push('CONSTRAINT ' + this.quote(foreignKeyNode.name) + ' ');
            }
            txt.push('FOREIGN KEY ( ');
            for (let i = 0; i < foreignKeyNode.columns.length; i++) {
                if (i > 0) {
                    txt.push(', ');
                }
                txt.push(this.quote(foreignKeyNode.columns[i]));
            }
            txt.push(' ) REFERENCES ');
            if (foreignKeyNode.schema !== undefined) {
                txt.push(this.quote(foreignKeyNode.schema) + '.');
            }
            txt.push(this.quote(foreignKeyNode.table));
            if (foreignKeyNode.refColumns !== undefined) {
                txt.push(' ( ');
                for (let i = 0; i < foreignKeyNode.refColumns.length; i++) {
                    if (i > 0) {
                        txt.push(', ');
                    }
                    txt.push(this.quote(foreignKeyNode.refColumns[i]));
                }
                txt.push(' )');
            }
            let onDelete = foreignKeyNode.onDelete;
            if (onDelete) {
                onDelete = onDelete.toUpperCase();
                if (
                    onDelete === 'CASCADE' ||
                    onDelete === 'RESTRICT' ||
                    onDelete === 'SET NULL' ||
                    onDelete === 'SET DEFAULT' ||
                    onDelete === 'NO ACTION'
                ) {
                    txt.push(` ON DELETE ${onDelete}`);
                }
            }
            let onUpdate = foreignKeyNode.onUpdate;
            if (onUpdate) {
                onUpdate = onUpdate.toUpperCase();
                if (
                    onUpdate === 'CASCADE' ||
                    onUpdate === 'RESTRICT' ||
                    onUpdate === 'SET NULL' ||
                    onUpdate === 'SET DEFAULT' ||
                    onUpdate === 'NO ACTION'
                ) {
                    txt.push(` ON UPDATE ${onUpdate}`);
                }
            }
            if (foreignKeyNode.constraint) {
                txt.push(` ${foreignKeyNode.constraint.toUpperCase()}`);
            }
        }
        return [txt.join('')];
    }
    public visitFunctionCall(functionCallNode: FunctionCallNode): string[] {
        this.visitingFunctionCall = true;
        const extract = () => {
            const nodes = functionCallNode.nodes.map(this.visit.bind(this));
            if (nodes.length !== 1) {
                throw new Error(`Not enough parameters passed to ${functionCallNode.name} function`);
            }
            return `EXTRACT(${functionCallNode.name} FROM ${nodes[0] + ''})`;
        };
        let txt = '';
        // Override date functions since postgres (and others) uses extract
        if (['YEAR', 'MONTH', 'DAY', 'HOUR'].indexOf(functionCallNode.name) >= 0) {
            txt = extract();
        }
        // Override CURRENT_TIMESTAMP function to remove parens
        else if ('CURRENT_TIMESTAMP' === functionCallNode.name) {
            txt = functionCallNode.name;
        } else {
            txt = `${functionCallNode.name}(${functionCallNode.nodes.map(this.visit.bind(this)).join(', ')})`;
        }
        this.visitingFunctionCall = false;
        return [txt];
    }
    public visitArrayCall(arrayCallNode: ArrayCallNode): string[] {
        const txt = `ARRAY[${arrayCallNode.nodes.map(this.visit.bind(this)).join(', ')}]`;
        return [txt];
    }
    public visitRowCall(rowCallNode: RowCallNode): string[] {
        const txt = `(${rowCallNode.nodes.map(this.visit.bind(this)).join(', ')})`;
        return [txt];
    }
    public visitParameter(parameterNode: ParameterNode): string[] {
        // save the value into the parameters array
        const value = parameterNode.value();
        this.params.push(value);
        return parameterNode.isExplicit ? [] : [this._getParameterText(this.params.length, value)];
    }
    public visitDefault(defaultNode: DefaultNode): string[] {
        /* jshint unused: false */
        return ['DEFAULT'];
    }
    public visitAddColumn(addColumnNode: AddColumnNode): string[] {
        this.visitingAddColumn = true;
        const result = [`ADD COLUMN ${this.visit(addColumnNode.nodes[0])}`];
        this.visitingAddColumn = false;
        return result;
    }
    public visitDropColumn(dropColumnNode: DropColumnNode): string[] {
        return [`DROP COLUMN ${this.visit(dropColumnNode.nodes[0])}`];
    }
    public visitRenameColumn(renameColumnNode: RenameColumnNode): string[] {
        return [`RENAME COLUMN ${this.visit(renameColumnNode.nodes[0])} TO ${this.visit(renameColumnNode.nodes[1])}`];
    }
    public visitRename(renameNode: RenameNode): string[] {
        return [`RENAME TO ${this.visit(renameNode.nodes[0])}`];
    }
    public visitIfExists(ifExistsNode: IfExistsNode): string[] {
        return ['IF EXISTS'];
    }
    public visitIfNotExists(ifNotExistsNode: IfNotExistsNode): string[] {
        return ['IF NOT EXISTS'];
    }
    public visitOrIgnore(orIgnoreNode: OrIgnoreNode): string[] {
        throw new Error('PostgreSQL does not allow orIgnore clause.');
    }
    public visitCascade(cascadeNode: CascadeNode): string[] {
        return ['CASCADE'];
    }
    public visitRestrict(restrictNode: RestrictNode): string[] {
        return ['RESTRICT'];
    }
    public visitForUpdate(forUpdateNode: ForUpdateNode): string[] {
        return ['FOR UPDATE'];
    }
    public visitForShare(forShareNode: ForShareNode): string[] {
        return ['FOR SHARE'];
    }
    public visitJoin(joinNode: JoinNode): string[] {
        this.visitingJoin = true;
        return [...this.visit(joinNode.from), `${joinNode.subType} JOIN`, ...this.visit(joinNode.to), 'ON', ...this.visit(joinNode.onNode)];
    }
    public visitLiteral(literalNode: LiteralNode): string[] {
        const txt = [literalNode.literal];
        if (literalNode.alias) {
            txt.push(this.aliasText + this.quote(literalNode.alias));
        }
        return [txt.join('')];
    }
    public visitText(textNode: TextNode): string[] {
        return [textNode.text];
    }
    public visitReturning(returningNode: ReturningNode): string[] {
        this.visitingReturning = true;
        const r = ['RETURNING', returningNode.nodes.map(this.visit.bind(this)).join(', ')];
        this.visitingReturning = false;
        return r;
    }
    public visitOnDuplicate(onDuplicateNode: OnDuplicateNode): string[] {
        throw new Error('PostgreSQL does not allow onDuplicate clause.');
    }
    public visitOnConflict(onConflictNode: OnConflictNode): string[] {
        const result = ['ON CONFLICT'];
        const columns = [];
        const updateClause = [];
        let i;
        let col;
        const table = this.queryNode!.table;
        if (onConflictNode.constraint) {
            result.push(['ON CONSTRAINT', this.quote(onConflictNode.constraint)].join(' '));
        } else if (onConflictNode.columns) {
            for (i = 0; i < onConflictNode.columns.length; i++) {
                columns.push(this.quote(table.getColumn(onConflictNode.columns[i])!.name));
            }
            result.push('(' + columns.join(', ') + ')');
        }
        if (onConflictNode.update) {
            updateClause.push('DO UPDATE SET');
            const update = onConflictNode.update;
            const setClause = [];
            for (i = 0; i < update.length; i++) {
                col = this.quote(table.getColumn(update[i])!.name);
                setClause.push(col + ' = EXCLUDED.' + col);
            }
            updateClause.push(setClause.join(', '));
        } else {
            updateClause.push('DO NOTHING');
        }
        result.push(updateClause.join(' '));
        return result;
    }
    public visitModifier(modifierNode: ModifierNode): string[] {
        return [modifierNode.type, ...this.visit(modifierNode.count)];
    }
    public visitIndexes(indexesNode: IndexesNode): string[] {
        /* jshint unused: false */
        const tableName = this.queryNode!.table.getName();
        const schemaName = this.queryNode!.table.getSchema() || 'public';
        return [
            'SELECT relname',
            'FROM pg_class',
            'WHERE oid IN (',
            'SELECT indexrelid',
            `FROM pg_index, pg_class WHERE pg_class.relname='${tableName}'`,
            `AND pg_class.relnamespace IN (SELECT pg_namespace.oid FROM pg_namespace WHERE nspname = '${schemaName}')`,
            'AND pg_class.oid=pg_index.indrelid)'
        ];
    }
    public visitCreateIndex(createIndexNode: CreateIndexNode): string[] {
        if (!createIndexNode.options.columns || createIndexNode.options.columns.length === 0) {
            throw new Error('No columns defined!');
        }
        const tableName = this.visit(createIndexNode.table.toNode());
        let result = ['CREATE'];
        if (createIndexNode.options.type) {
            result.push(createIndexNode.options.type.toUpperCase());
        }
        result = result.concat(['INDEX', this.quote(createIndexNode.indexName())]);
        if (createIndexNode.options.algorithm) {
            result.push('USING ' + createIndexNode.options.algorithm.toUpperCase());
        }
        result = result.concat([
            'ON',
            ...tableName,
            '(' +
                createIndexNode.options.columns.reduce(
                    (res, col) => {
                        const column = col.name ? col.name : col.value.name;
                        const direction = col instanceof OrderByValueNode ? ` ${col.direction!.text}` : '';
                        return res.concat(this.quote(column) + direction);
                    },
                    [] as string[]
                ) +
                ')'
        ]);
        if (createIndexNode.options.parser) {
            result.push('WITH PARSER');
            result.push(createIndexNode.options.parser);
        }
        return result;
    }
    public visitDropIndex(dropIndexNode: DropIndexNode): string[] {
        const result = ['DROP INDEX'];
        result.push(this.quote(dropIndexNode.table.getSchema() || 'public') + '.' + this.quote(dropIndexNode.options.indexName));
        return result;
    }
    public visitCreateView(createViewNode: CreateViewNode): string[] {
        const result = ['CREATE VIEW', this.quote(createViewNode.options.viewName), 'AS'];
        return result;
    }
    public visitInterval(intervalNode: IntervalNode): string[] {
        let parameter = '';
        const add = (n: number, unit: string) => {
            if (!isNumber(n)) {
                return;
            }
            if (parameter !== '') {
                parameter += ' ';
            }
            parameter += `${n} ${unit}`;
        };
        add(intervalNode.years, 'YEAR');
        add(intervalNode.months, 'MONTH');
        add(intervalNode.days, 'DAY');
        add(intervalNode.hours, 'HOUR');
        add(intervalNode.minutes, 'MINUTE');
        add(intervalNode.seconds, 'SECOND');
        if (parameter === '') {
            parameter = '0 SECOND';
        }
        return [`INTERVAL '${parameter}'`];
    }
    /**
     * Broken out as a separate function so that dialects that derive from this class can still use this functionality.
     *
     * @param {Node[]} list
     * @param {String} type
     * @returns {Object|undefined} {index:number, node:Node}
     */
    public findNode(list: Node[], type: string) {
        for (let i = 0, len = list.length; i < len; i++) {
            const n = list[i];
            if (n.type === type) {
                return { index: i, node: n };
            }
        }
        return undefined;
    }
    /**
     * pulls the DISTINCT node out of the filters and flags the SELECT node that it should be distinct.
     * Broken out as a separate function so that dialects that derive from this class can still use this functionality.
     */
    public handleDistinct(actions: Node[], filters: Node[]) {
        const distinctNode = this.findNode(filters, 'DISTINCT');
        // if (!distinctNode) distinctNode = _findNode(targets,"DISTINCT");
        // if (!distinctNode) distinctNode = _findNode(actions,"DISTINCT");
        if (!distinctNode) {
            return;
        }
        const selectInfo = this.findNode(actions, 'SELECT');
        if (!selectInfo) {
            return;
        } // there should be one by now, I think
        // mark the SELECT node that it's distinct
        (selectInfo.node as SelectNode).isDistinct = true;
    }
}

/**
 * If the parent of the subquery is an INSERT we don't want to parenthesize.
 * This happens when you create the query like so:
 *
 * const query=post.insert(post.id)
 * const select=user.select(user.id)
 * query.add(select)
 *
 * @param parentQuery
 * @returns {boolean}
 */
function dontParenthesizeSubQuery(parentQuery: Query<unknown>) {
    if (!parentQuery) {
        return false;
    }
    if (parentQuery.nodes.length === 0) {
        return false;
    }
    if (['INSERT', 'REPLACE'].indexOf(parentQuery.nodes[0].type) === -1) {
        return false;
    }
    return true;
}
