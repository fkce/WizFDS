import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Global, cross-component UI-chrome state for the app shell.
 *
 * Currently holds only the sidebar collapse flag, but it is the natural home for
 * any future layout preference (panel widths, density, …). The flag is a
 * per-user preference (NOT per-scenario), so it lives in localStorage rather than
 * the scenario-scoped UiState. The shell (AppComponent) reads it to switch the
 * grid column width; the sidebar (MenuComponent / FdsMenuComponent) reads it to
 * switch between the labelled and icon-rail presentations.
 */
@Injectable({ providedIn: 'root' })
export class LayoutService {

  private static readonly STORAGE_KEY = 'wizfds.sidebarCollapsed';

  private _collapsed = new BehaviorSubject<boolean>(this.readCollapsed());

  /** Emits the current sidebar-collapsed state (starts with the persisted value). */
  public readonly collapsed$: Observable<boolean> = this._collapsed.asObservable();

  /** Synchronous accessor for template getters. */
  public get collapsed(): boolean {
    return this._collapsed.value;
  }

  /** Flip the sidebar between expanded and collapsed (icon-rail). */
  public toggleSidebar(): void {
    this.setCollapsed(!this._collapsed.value);
  }

  public setCollapsed(value: boolean): void {
    this._collapsed.next(value);
    try {
      localStorage.setItem(LayoutService.STORAGE_KEY, value ? '1' : '0');
    } catch {
      // localStorage may be unavailable (private mode); collapse still works in-session.
    }
  }

  private readCollapsed(): boolean {
    try {
      return localStorage.getItem(LayoutService.STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }
}
