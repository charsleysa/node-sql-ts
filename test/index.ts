'use strict';

import { readdirSync } from 'fs';
import { join, extname } from 'path';

const testDir = __dirname;

const directories = [testDir + '/dialects'];

directories.forEach((d) => {
    const files = readdirSync(d);
    for (const file of files) {
        const filePath = join(d, file);
        if (extname(file) === '.ts') {
            require(filePath);
        }
    }
});
