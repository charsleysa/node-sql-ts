'use strict';

import reduce from 'lodash/reduce';
import sliced from 'sliced';
import { FunctionCallNode } from './node';

// create a function that creates a function call of the specific name, using the specified sql instance
const getFunctionCallCreator = (name: string) => {
    return (...args: any[]) => {
        // turn array-like arguments object into a true array
        return new FunctionCallNode(name, sliced(args));
    };
};

// creates a hash of functions for a sql instance
const getFunctions = (functionNames: string | string[] | readonly string[]) => {
    if (typeof functionNames === 'string') { return getFunctionCallCreator(functionNames); }

    const functions = reduce(
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
const aggregateFunctions = ['AVG', 'COUNT', 'DISTINCT', 'MAX', 'MIN', 'SUM'] as const;

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
] as const;

const dateFunctions = ['YEAR', 'MONTH', 'DAY', 'HOUR', 'CURRENT_TIMESTAMP'] as const;

// hstore function available to Postgres
const hstoreFunctions = ['HSTORE'] as const;

// text search functions available to Postgres
const textsearchFunctions = ['TS_RANK', 'TS_RANK_CD', 'PLAINTO_TSQUERY', 'TO_TSQUERY', 'TO_TSVECTOR', 'SETWEIGHT'] as const;

// jsonb functions available to postgres
const jsonbFunctions = [
    'JSONB_ARRAY_LENGTH',
    'JSONB_BUILD_ARRAY',
    'JSONB_BUILD_OBECT',
    'JSONB_EXTRACT_PATH',
    'JSONB_INSERT',
    'JSONB_OBJECT',
    'JSONB_PRETTY',
    'JSONB_SET',
    'JSONB_STRIP_NULLS',
    'JSONB_TYPEOF',
    'TO_JSONB',
    'JSONB_ARRAY_ELEMENTS',
    'JSONB_ARRAY_ELEMENTS_TEXT',
    'JSONB_EACH',
    'JSONB_EACH_TEXT',
    'JSONB_OBJECT_KEYS',
    'JSONB_AGG'
] as const;

const standardFunctionNames = [
    ...aggregateFunctions,
    ...scalarFunctions,
    ...hstoreFunctions,
    ...textsearchFunctions,
    ...dateFunctions,
    ...jsonbFunctions
] as const;

type StandardFunctions = {
    [K in (typeof standardFunctionNames)[number]]: (...args: any[]) => FunctionCallNode;
}

// creates a hash of standard functions for a sql instance
const getStandardFunctions = (): StandardFunctions => {
    return getFunctions(standardFunctionNames) as StandardFunctions;
};

export { StandardFunctions, getFunctions, getStandardFunctions };
