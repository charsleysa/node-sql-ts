declare module 'sliced' {
    /**
     * Returns a section of an array.
     * @param args something with a length.
     * @param start The beginning of the specified portion of the array.
     * @param end The end of the specified portion of the array.
     */
    function sliced<T>(args: T[], start?: number, end?: number): T[];
    function sliced(args: IArguments, start?: number, end?: number): any[];

    export = sliced;
}
