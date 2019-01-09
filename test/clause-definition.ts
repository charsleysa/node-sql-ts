'use strict';

import { equal } from 'assert';

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
    equal(select.type, 'SELECT');
    equal(select.nodes.length, 0);

    const q = new Boom('hai');
    equal(q.nodes.length, 0);
    const q2 = new Boom('bai');
    q.nodes.push(select);
    equal(q.nodes.length, 1);
    equal(q.name, 'hai');
    equal(q2.nodes.length, 0);
    equal(q2.name, 'bai');
});
