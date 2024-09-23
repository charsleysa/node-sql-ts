import typescript from '@rollup/plugin-typescript';
import del from 'rollup-plugin-delete';
import dts from 'rollup-plugin-dts';

export default [
    {
        input: './lib/index.ts',
        output: {
            file: './dist/lib.js',
            format: 'esm',
            sourcemap: true
        },
        external: [
            'assert',
            'lodash/defaults.js',
            'lodash/flatten.js',
            'lodash/fromPairs.js',
            'lodash/isArray.js',
            'lodash/isNumber.js',
            'lodash/isFunction.js',
            'lodash/map.js',
            'lodash/padStart.js',
            'lodash/reduce.js',
            'sliced'
        ],
        plugins: [
            del({
                targets: './dist'
            }),
            typescript({
                tsconfig: './tsconfig.build.json'
            })
        ]
    },
    {
        input: './lib/index.ts',
        output: {
            file: './dist/lib.cjs',
            format: 'commonjs',
            sourcemap: true
        },
        external: [
            'assert',
            'lodash/defaults.js',
            'lodash/flatten.js',
            'lodash/fromPairs.js',
            'lodash/isArray.js',
            'lodash/isNumber.js',
            'lodash/isFunction.js',
            'lodash/map.js',
            'lodash/padStart.js',
            'lodash/reduce.js',
            'sliced'
        ],
        plugins: [
            typescript({
                tsconfig: './tsconfig.build.json'
            })
        ]
    },
    {
        input: './dist/dts/index.d.ts',
        output: {
            file: './dist/lib.d.ts',
            format: 'es'
        },
        plugins: [
            dts(),
            del({
                hook: 'buildEnd',
                targets: './dist/dts'
            })
        ]
    }
];
