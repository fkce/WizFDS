/**
 * The bytes of one FDS case, wherever they physically sit.
 *
 * The two hosts reach the same results directory from opposite sides: wizfds
 * gets a folder the user picked off their own disk, the standalone viewer gets
 * a case directory served over HTTP. Everything built on top - the catalog of
 * #148, the format readers of Phase 6 (#149...#155) - only ever asks "give me
 * those bytes of that file", so that is the whole of the contract, and neither
 * side of it knows which source answered.
 */
export interface ResultsDirectory {
    /**
     * `null` means the file is not there, which is an ordinary answer rather
     * than a failure: the `.smv` is a table of contents written while the
     * solver ran, so it cheerfully lists files an interrupted run never got to
     * write and files a user has since deleted. Everything else - a denied
     * permission, a server that broke - throws.
     *
     * `filename` is relative to the results directory and separated by `/`,
     * exactly as `SmvResultFile.filename` spells it.
     */
    open(filename: string): Promise<ResultFileHandle | null>
}

/**
 * One open result file, addressed by byte offset.
 *
 * Random access rather than a stream, because that is how the Phase 6 readers
 * work: a slice or boundary file is a run of time frames, and a reader takes
 * the header, then jumps to the frame it wants - it does not pull half a
 * gigabyte through itself to reach the last one. `size` is what makes the
 * jumping possible. It is measured when the file is opened and does not follow
 * a file that keeps growing under a running solver.
 */
export interface ResultFileHandle {
    readonly size: number,
    /**
     * Callers stay inside `size`. Past the end the two sources disagree - a
     * local slice comes back short or empty, a byte range the server cannot
     * satisfy is an error - and there is nothing to gain from papering over
     * that here.
     */
    read(offset: number, length: number): Promise<ArrayBuffer>
}
