'use strict';

import { Node } from '.';

export class IfNotExistsNode extends Node {
    constructor() {
        super('IF NOT EXISTS');
    }
}
