'use strict';

import assert from 'assert';
import { valueExpressionMixin, Node } from '../lib/node/';

suite('value-expression', function() {
    test('value expression mixin should not overwrite Node prototype properties', function() {
        const mixin = valueExpressionMixin();

        // make sure that the node class doesn't have any conflicting properties
        for (const key in mixin) {
            if (mixin.hasOwnProperty(key)) {
                assert.strictEqual((Node.prototype as any)[key], undefined);
            }
        }
    });
});
