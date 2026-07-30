import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { MainService } from '@services/main/main.service';
import { HistoryEntry } from './element-patch';

/**
 * How many gestures can be taken back.
 *
 * One entry holds a copy of every element the gesture touched, and an array
 * command can touch a hundred, so the stack is bounded rather than left to grow
 * for as long as the scenario is open (ADR-0009).
 */
export const MAX_HISTORY_DEPTH = 50;

/**
 * What can be undone, and what can be redone.
 *
 * The stack itself, and nothing else: it hands entries out and takes them back,
 * while writing a patch into `Fds` belongs to FdsEditService, which is the one
 * place that knows how an element is built. Splitting them that way is what
 * keeps this testable without a scenario.
 *
 * It lives in the app because `Fds` does (ADR-0004), and it holds edits made
 * through the command channel only. A change typed into a form does not pass
 * through here and is not in this history - `[(ngModel)]` writes straight to the
 * model, so there is no point at which such a change could be noticed. The
 * boundary is deliberate, and the interface has to be honest about it: the undo
 * button describes the last operation from the 3D view, not "the last change".
 */
@Injectable({
  providedIn: 'root'
})
export class HistoryService {

  /** Gestures that stand, oldest first - what Ctrl+Z works back through. */
  private readonly applied: HistoryEntry[] = [];

  /** Gestures that have been taken back, and could be applied again. */
  private readonly takenBack: HistoryEntry[] = [];

  private readonly changedSubject = new Subject<void>();

  /**
   * Fires whenever what could be undone changes.
   *
   * The buttons that show it are outside the gesture that caused it - the Quick
   * Access Toolbar, and whatever else names the last operation - so they are
   * told rather than polled.
   */
  public readonly changed$: Observable<void> = this.changedSubject.asObservable();

  constructor(mainService: MainService) {
    // A uuid names an element of one scenario. Undoing into the next one would
    // address nothing, or something else entirely (ADR-0009).
    mainService.currentFdsScenario$.subscribe(() => this.clear());
  }

  public get canUndo(): boolean {
    return this.applied.length > 0;
  }

  public get canRedo(): boolean {
    return this.takenBack.length > 0;
  }

  /** What the undo button would take back, if anything. */
  public get undoLabel(): string | undefined {
    return this.applied[this.applied.length - 1]?.label;
  }

  /** What the redo button would put back. */
  public get redoLabel(): string | undefined {
    return this.takenBack[this.takenBack.length - 1]?.label;
  }

  /**
   * Record one applied gesture.
   *
   * Whatever could be redone is dropped: the user has left that branch, and
   * putting it back on top of a scenario that has since changed would restore an
   * element into a state it was never in.
   */
  public push(entry: HistoryEntry): void {
    this.applied.push(entry);
    if (this.applied.length > MAX_HISTORY_DEPTH) { this.applied.shift(); }

    this.takenBack.length = 0;
    this.changedSubject.next();
  }

  /**
   * Take the most recent gesture off the stack, to be reversed.
   *
   * The entry is handed over rather than applied here - applying it means
   * writing `before` back into the scenario, which is FdsEditService's job.
   */
  public undo(): HistoryEntry | undefined {
    const entry = this.applied.pop();
    if (!entry) { return undefined; }

    this.takenBack.push(entry);
    this.changedSubject.next();
    return entry;
  }

  /** Take the most recently undone gesture back, to be applied again. */
  public redo(): HistoryEntry | undefined {
    const entry = this.takenBack.pop();
    if (!entry) { return undefined; }

    this.applied.push(entry);
    this.changedSubject.next();
    return entry;
  }

  /** Forget everything - another scenario, or another project, is open. */
  public clear(): void {
    if (this.applied.length === 0 && this.takenBack.length === 0) { return; }

    this.applied.length = 0;
    this.takenBack.length = 0;
    this.changedSubject.next();
  }
}
