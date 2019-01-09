'use strict';

import { Node } from '.';

export class ForeignKeyNode extends Node {
    public name?: string;
    public columns: string[];
    public schema?: string;
    public table: string;
    public refColumns?: string[];
    public onUpdate?: string;
    public onDelete?: string;
    public constraint?: string;
    constructor(config: {
        table: string;
        columns: string[];
        refColumns?: string[];
        onDelete?: string;
        onUpdate?: string;
        name?: string;
        schema?: string;
        constraint?: string;
    }) {
        super('FOREIGN KEY');
        this.name = config.name;
        this.columns = config.columns;
        this.schema = config.schema;
        this.table = config.table;
        this.refColumns = config.refColumns;
        this.onUpdate = config.onUpdate;
        this.onDelete = config.onDelete;
        this.constraint = config.constraint;
    }
}
