import { Column } from '../column.js';
import { Table } from '../table.js';
import { Node } from './node.js';

export class ColumnNode extends Node {
    public name: string;
    public property: string;
    public alias?: string;
    public star?: boolean;
    public isConstant?: boolean;
    public constantValue?: any;
    public asArray?: boolean;
    public aggregator?: string;
    public table?: Table<unknown>;
    public value: any;
    public dataType?: string;
    public isDistinct?: boolean;
    public primaryKey?: boolean;
    public notNull?: boolean;
    public defaultValue?: any;
    public references?:
        | string
        | {
              table?: string;
              column?: string;
              constraint?: string;
              onDelete?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
              onUpdate?: 'restrict' | 'cascade' | 'no action' | 'set null' | 'set default';
          };
    public subfieldContainer?: Column<unknown>;
    public subfields: { [key: string]: Column<unknown> };
    public autoGenerated: boolean;
    public unique: boolean;
    constructor(config: Column<unknown>) {
        super('COLUMN');
        this.name = config.name;
        this.property = config.property || config.name;
        this.alias = config.alias;
        this.star = config.star;
        this.isConstant = config.isConstant;
        this.constantValue = config.constantValue;
        this.asArray = config.asArray;
        this.aggregator = config.aggregator;
        this.table = config.table;
        this.value = config.getValue();
        this.dataType = config.dataType;
        this.isDistinct = config.isDistinct;
        this.primaryKey = config.primaryKey;
        this.notNull = config.notNull;
        this.defaultValue = config.defaultValue;
        this.references = config.references;
        // If subfieldContainer is present, this is a subfield and subfieldContainer
        // is the parent Column
        this.subfieldContainer = config.subfieldContainer;
        this.subfields = config.subfields;
        this.autoGenerated = !!config.autoGenerated;
        this.unique = !!config.unique;
    }
    public distinct(): this {
        this.isDistinct = true;
        return this;
    }
    public as(alias: string): this {
        this.alias = alias;
        return this;
    }
}
