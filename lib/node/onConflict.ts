'use strict';

import { Node } from '.';

export class OnConflictNode extends Node {
    public columns?: string[];
    public constraint?: string;
    public update?: string[];

    constructor(config: { columns?: string[]; constraint?: string; update?: string[] }) {
        super('ONCONFLICT');
        this.columns = config.columns;
        this.constraint = config.constraint;
        this.update = config.update;
    }
}
