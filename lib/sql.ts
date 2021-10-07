import defaults from 'lodash/defaults.js';
import sliced from 'sliced';
import { Column } from './column.js';
import { ColumnDefinition, SQLDialects, TableDefinition } from './configTypes.js';
import { DEFAULT_DIALECT, getDialect } from './dialect/mapper.js';
import * as functions from './functions.js';
import { ArrayCallNode } from './node/arrayCall.js';
import { FunctionCallNode } from './node/functionCall.js';
import { IntervalNode } from './node/interval.js';
import { LiteralNode } from './node/literal.js';
import { ParameterNode } from './node/parameter.js';
import { Query } from './node/query.js';
import { RowCallNode } from './node/rowCall.js';
import { Table, TableWithColumns } from './table.js';

export class Sql {
    public functions: functions.StandardFunctions;
    public dialect: any;
    public dialectName!: SQLDialects;
    public config: any;
    private _function: any;
    constructor(dialect: SQLDialects = DEFAULT_DIALECT, config: any = {}) {
        this.setDialect(dialect, config);
        // attach the standard SQL functions to this instance
        this.functions = functions.getStandardFunctions();
        this._function = functions.getFunctions;
    }
    // Define a function
    public function(functionNames: string[]): { [key: string]: (...args: any[]) => FunctionCallNode };
    public function(functionName: string): (...args: any[]) => FunctionCallNode;
    public function(...args: any[]): any {
        return this._function(...args);
    }
    // Define a table
    public define<T>(def: TableDefinition): TableWithColumns<T> {
        def = defaults(def || {}, {
            sql: this
        });
        return Table.define(def);
    }
    public defineColumn<T>(def: ColumnDefinition): Column<T> {
        return new Column<T>(def);
    }
    // Returns a bracketed call creator literal
    public array(...args: any[]) {
        const arrayCall = new ArrayCallNode(sliced(args));
        return arrayCall;
    }
    // Returns a bracketed call creator literal
    public row(...args: any[]) {
        const rowCall = new RowCallNode(sliced(args));
        return rowCall;
    }
    // Returns a select statement
    public select(...args: any[]) {
        const query = new Query({ sql: this } as any);
        query.select(...args);
        return query;
    }
    // Returns an interval clause
    public interval(...args: any[]) {
        const interval = new IntervalNode(sliced(args));
        return interval;
    }
    // Set the dialect
    public setDialect(dialect: SQLDialects, config: any = {}) {
        this.dialect = getDialect(dialect);
        this.dialectName = dialect;
        this.config = config;
        return this;
    }
    // Create a constant Column (for use in SELECT)
    public constant(value: any) {
        const config = {
            constantValue: value,
            isConstant: true,
            name: 'constant',
            property: 'constant'
        };
        const cn = new Column(config);
        return cn;
    }
    // Create a literal
    public literal(literal: any): LiteralNode {
        return new LiteralNode(literal);
    }
    // Create a parameter
    public parameter(value: any): ParameterNode {
        return new ParameterNode(value);
    }
}
