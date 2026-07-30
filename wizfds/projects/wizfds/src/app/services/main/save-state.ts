import { Main } from './main';

/** Where the scenario stands with auto-save. */
export type SaveState = 'unsaved' | 'saved' | 'idle';

/**
 * Read the auto-save indicator.
 *
 * `autoSave.fdsObjectSaveFont` is a CSS class name the auto-save loop writes -
 * a colour, not a state - so it is translated here rather than in each of the
 * two bars that show it: the app's status bar and the ribbon's Quick Access
 * Toolbar, which AutoCAD puts the save indicator in.
 */
export function saveStateOf(main: Main | undefined): SaveState {
  const flag = (main && main.autoSave && main.autoSave.fdsObjectSaveFont) || '';
  if (flag.indexOf('red') >= 0) { return 'unsaved'; }
  if (flag.indexOf('green') >= 0) { return 'saved'; }
  return 'idle';
}
