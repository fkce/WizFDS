/** What frameAt() answers when nothing has happened yet at the asked-for time. */
export const NO_FRAME = -1;

/**
 * The index of the last frame at or before `time`, or NO_FRAME when there is
 * none - the step function of "Oś czasu" (CONTEXT.md), and the only place it
 * is implemented.
 *
 * It lives here rather than on the timeline because the contract puts the
 * mapping inside the format (ADR-0018): every animated format owns files with
 * their own frame times, and a group whose files disagree - an interrupted run
 * leaves one mesh short - must resolve each of them separately. A file that
 * ends early then holds its last frame because that genuinely is the last
 * frame at or before `time`, not because a shared index was clamped.
 *
 * `times` must be ascending, which is how the solver writes it.
 */
export function frameAt(times: ArrayLike<number>, time: number): number {
    let low = 0;
    let high = times.length - 1;
    let found = NO_FRAME;

    while (low <= high) {
        const middle = (low + high) >> 1;
        if (times[middle] <= time) {
            found = middle;
            low = middle + 1;
        } else {
            high = middle - 1;
        }
    }
    return found;
}
