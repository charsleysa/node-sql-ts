'use strict';
import _ = require('lodash');
import sliced = require('sliced');
import { FunctionCallNode } from './node';

// create a function that creates a function call of the specific name, using the specified sql instance
const getFunctionCallCreator = (name: string) => {
    return (...args: any[]) => {
        // turn array-like arguments object into a true array
        return new FunctionCallNode(name, sliced(args));
    };
};

// creates a hash of functions for a sql instance
const getFunctions = (functionNames: string | string[]) => {
    if (typeof functionNames === 'string') { return getFunctionCallCreator(functionNames); }

    const functions = _.reduce(
        functionNames,
        (reducer, name) => {
            (reducer as any)[name] = getFunctionCallCreator(name);
            return reducer;
        },
        {}
    );
    return functions;
};

// aggregate functions available to all databases
const aggregateFunctions = ['AVG', 'COUNT', 'DISTINCT', 'MAX', 'MIN', 'SUM'];

// common scalar functions available to most databases
const scalarFunctions = [
    'ABS',
    'COALESCE',
    'LEFT',
    'LENGTH',
    'LOWER',
    'LTRIM',
    'RANDOM',
    'RIGHT',
    'ROUND',
    'RTRIM',
    'SUBSTR',
    'TRIM',
    'UPPER'
];

const dateFunctions = ['YEAR', 'MONTH', 'DAY', 'HOUR', 'CURRENT_TIMESTAMP'];

// hstore function available to Postgres
const hstoreFunction = 'HSTORE';

// text search functions available to Postgres
const textsearchFunctions = ['TS_RANK', 'TS_RANK_CD', 'PLAINTO_TSQUERY', 'TO_TSQUERY', 'TO_TSVECTOR', 'SETWEIGHT'];

const standardFunctionNames = aggregateFunctions
    .concat(scalarFunctions)
    .concat(hstoreFunction)
    .concat(textsearchFunctions)
    .concat(dateFunctions);

// creates a hash of standard functions for a sql instance
const getStandardFunctions = (): { [key: string]: (...args: any[]) => FunctionCallNode } => {
    return getFunctions(standardFunctionNames);
};

export { getFunctions, getStandardFunctions };
