'use strict';

import { Node } from '.';

export class CreateNode extends Node {
    public options: { isTemporary: boolean };

    constructor(isTemporary: boolean) {
        super('CREATE');

        this.options = { isTemporary };
    }
}
