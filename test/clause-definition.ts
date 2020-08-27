'use strict';

import { strictEqual } from 'assert';

import { Node } from '../lib/node/';

class Bang extends Node {
    constructor() {
        super('SELECT');
    }
}

class Boom extends Node {
    name: string;
    constructor(n: string) {
        super('BOOM');
        this.name = n;
    }
}

test('clause definition', function() {
    const select = new Bang();
    strictEqual(select.type, 'SELECT');
    strictEqual(select.nodes.length, 0);

    const q = new Boom('hai');
    strictEqual(q.nodes.length, 0);
    const q2 = new Boom('bai');
    q.nodes.push(select);
    strictEqual(q.nodes.length, 1);
    strictEqual(q.name, 'hai');
    strictEqual(q2.nodes.length, 0);
    strictEqual(q2.name, 'bai');
});
