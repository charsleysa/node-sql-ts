import assert from 'assert';
import isArray from 'lodash/isArray.js';

import { AddColumnNode } from '../node/addColumn.js';
import { AsOfNode } from '../node/asOf.js';
import { BinaryNode } from '../node/binary.js';
import { CascadeNode } from '../node/cascade.js';
import { CreateIndexNode } from '../node/createIndex.js';
import { DefaultNode } from '../node/default.js';
import { DropColumnNode } from '../node/dropColumn.js';
import { ForShareNode } from '../node/forShare.js';
import { ForUpdateNode } from '../node/forUpdate.js';
import { FunctionCallNode } from '../node/functionCall.js';
import { IndexesNode } from '../node/indexes.js';
import { OnConflictNode } from '../node/onConflict.js';
import { OnDuplicateNode } from '../node/onDuplicate.js';
import { OrIgnoreNode } from '../node/orIgnore.js';
import { RenameColumnNode } from '../node/renameColumn.js';
import { ReplaceNode } from '../node/replace.js';
import { RestrictNode } from '../node/restrict.js';
import { ReturningNode } from '../node/returning.js';
import { TruncateNode } from '../node/truncate.js';
import { Dialect } from './dialect.js';

export class Sqlite extends Dialect<{ dateTimeMillis?: boolean }> {
    protected hasAddedAColumn: boolean = false;
    constructor(config: { dateTimeMillis?: boolean }) {
        super(config);
        this.config = config;
        this.arrayAggFunctionName = 'GROUP_CONCAT';
    }
    protected createSubInstance() {
        return new Sqlite(this.config);
    }
    public _getParameterValue(
        value: null | boolean | number | string | any[] | Date | Buffer | Record<string, any>,
        quoteChar?: string
    ): string | number {
        if (Buffer.isBuffer(value)) {
            value = 'x' + this._getParameterValue(value.toString('hex'), quoteChar);
        } else if (value instanceof Date && this.config.dateTimeMillis) {
            value = value.getTime();
        } else if ('boolean' === typeof value) {
            value = value ? 1 : 0;
        } else if (isArray(value)) {
            value = super._getParameterValue(JSON.stringify(value), quoteChar);
        } else {
            value = super._getParameterValue(value, quoteChar);
        }
        return value;
    }
    public visitAsOf(asOfNode: AsOfNode): string[] {
        throw new Error('SQLite does not support AS OF.');
    }
    public visitReplace(replaceNode: ReplaceNode): string[] {
        // don't use table.column for replaces
        this.visitedReplace = true;
        let result = ['REPLACE'];
        result = result.concat(replaceNode.nodes.map((n) => this.visit(n).join()));
        result.push('INTO ' + this.visit(this.queryNode!.table.toNode()));
        result.push('(' + replaceNode.columns.map(this.visit.bind(this)).join(', ') + ')');
        const paramNodes = replaceNode.getParameters();
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
        this.visitedReplace = false;
        return result;
    }
    public visitDefault(defaultNode: DefaultNode): string[] {
        throw new Error('SQLite requires that all rows of a multi-row insert are for the same columns.');
    }
    public visitDropColumn(dropColumnNode: DropColumnNode): string[] {
        throw new Error('SQLite does not allow dropping columns.');
    }
    public visitFunctionCall(functionCallNode: FunctionCallNode): string[] {
        this.visitingFunctionCall = true;
        const left = () => {
            // convert LEFT(column,4) to SUBSTR(column,1,4)
            const nodes = functionCallNode.nodes.map(this.visit.bind(this));
            if (nodes.length !== 2) {
                throw new Error('Not enough parameters passed to LEFT function.');
            }
            return `SUBSTR(${nodes[0] + ''}, 1, ${nodes[1] + ''})`;
        };
        const right = () => {
            // convert RIGHT(column,4) to SUBSTR(column,-4)
            const nodes = functionCallNode.nodes.map(this.visit.bind(this));
            if (nodes.length !== 2) {
                throw new Error('Not enough parameters passed to RIGHT function.');
            }
            return `SUBSTR(${nodes[0] + ''}, -${nodes[1] + ''})`;
        };
        const extract = () => {
            const nodes = functionCallNode.nodes.map(this.visit.bind(this));
            if (nodes.length !== 1) {
                throw new Error(`Not enough parameters passed to ${functionCallNode.name} function`);
            }
            let format;
            switch (functionCallNode.name) {
                case 'YEAR':
                    format = "'%Y'";
                    break;
                case 'MONTH':
                    format = "'%m'";
                    break;
                case 'DAY':
                    format = "'%d'";
                    break;
                case 'HOUR':
                    format = "'%H'";
                    break;
            }
            let col = nodes[0] + '';
            if (this.config.dateTimeMillis) {
                // Convert to a datetime before running the strftime function
                // Sqlite unix epoch is in seconds, but javascript is milliseconds.
                col = `datetime(${col}/1000, "unixepoch")`;
            }
            return `strftime(${format}, ${col})`;
        };
        let txt = '';
        const name = functionCallNode.name;
        // Override LEFT and RIGHT and convert to SUBSTR
        if (name === 'LEFT') {
            txt = left();
        } else if (name === 'RIGHT') {
            txt = right();
        }
        // Override date functions since sqlite uses strftime
        else if (['YEAR', 'MONTH', 'DAY', 'HOUR'].indexOf(functionCallNode.name) >= 0) {
            txt = extract();
        } else if ('CURRENT_TIMESTAMP' === functionCallNode.name) {
            txt = functionCallNode.name;
        } else {
            txt = `${name}(${functionCallNode.nodes.map(this.visit.bind(this)).join(', ')})`;
        }
        this.visitingFunctionCall = false;
        return [txt];
    }
    public visitTruncate(truncateNode: TruncateNode): string[] {
        const result = ['DELETE FROM'];
        return result.concat(truncateNode.nodes.map((n) => this.visit(n).join()));
    }
    public visitRenameColumn(renameColumnNode: RenameColumnNode): string[] {
        throw new Error('SQLite does not allow renaming columns.');
    }
    public visitOnDuplicate(onDuplicateNode: OnDuplicateNode): string[] {
        throw new Error('SQLite does not allow onDuplicate clause.');
    }
    public visitOnConflict(onConflictNode: OnConflictNode): string[] {
        throw new Error('Sqlite does not allow onConflict clause.');
    }
    public visitReturning(returningNode: ReturningNode): string[] {
        throw new Error('SQLite does not allow returning clause.');
    }
    public visitForUpdate(forUpdateNode: ForUpdateNode): string[] {
        throw new Error('SQLite does not allow FOR UPDATE clause.');
    }
    public visitForShare(forShareNode: ForShareNode): string[] {
        throw new Error('SQLite does not allow FOR SHARE clause.');
    }
    public visitAddColumn(addColumnNode: AddColumnNode): string[] {
        assert(!this.hasAddedAColumn, 'SQLite can not add more that one column at a time');
        const result = super.visitAddColumn.call(this, addColumnNode);
        this.hasAddedAColumn = true;
        return result;
    }
    public visitIndexes(indexesNode: IndexesNode): string[] {
        const tableName = this.visit(this.queryNode!.table.toNode())[0];
        return [`PRAGMA INDEX_LIST(${tableName})`];
    }
    public visitCreateIndex(createIndexNode: CreateIndexNode): string[] {
        const { indexType, ifNotExists, indexName, tableName, algorithm, columns, parser } = this._visitCreateIndex(createIndexNode);

        return [
            'CREATE',
            indexType,
            'INDEX',
            ...ifNotExists,
            indexName,
            algorithm,
            'ON',
            ...tableName,
            columns,
            parser
        ].filter(this.notEmpty);
    }
    public visitCascade(cascadeNode: CascadeNode): string[] {
        throw new Error('Sqlite do not support CASCADE in DROP TABLE');
    }
    public visitRestrict(restrictNode: RestrictNode): string[] {
        throw new Error('Sqlite do not support RESTRICT in DROP TABLE');
    }
    public visitBinary(binaryNode: BinaryNode): string[] {
        if (binaryNode.operator === '@@') {
            binaryNode.operator = 'MATCH';
            const ret = super.visitBinary(binaryNode);
            binaryNode.operator = '@@';
            return ret;
        }
        return super.visitBinary(binaryNode);
    }
    public visitOrIgnore(orIgnoreNode: OrIgnoreNode): string[] {
        return ['OR IGNORE'];
    }
}
