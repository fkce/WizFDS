// =============================================================================
// The File System Access API, as much of it as WizFDS reaches for.
//
// None of this is in TypeScript's own DOM library: `showDirectoryPicker()` and
// the two permission methods are a WICG proposal (https://wicg.github.io/
// file-system-access/), which MDN marks non-standard and only Chromium ships -
// Firefox and Safari have neither. So the declarations live here.
//
// A declaration is not a feature. Every call site still asks
// `'showDirectoryPicker' in window` before using the picker, and never tests
// for the *type* `FileSystemDirectoryHandle`, which every browser has through
// the Origin Private File System and which therefore proves nothing.
// =============================================================================

interface ShowDirectoryPickerOptions {
    /**
     * Names the picker, so the browser reopens it where this same id left it.
     * Unrelated to any WizFDS identifier - it is the browser's own bookmark.
     */
    id?: string,
    mode?: 'read' | 'readwrite',
    startIn?: unknown
}

interface FileSystemHandlePermissionDescriptor {
    mode: 'read' | 'readwrite'
}

interface Window {
    /**
     * Asks the user for a directory. Needs a secure context and a user gesture
     * (without one it rejects with a `SecurityError`), and rejects with an
     * `AbortError` when the user closes the dialog without choosing - which is
     * an answer, not a failure.
     */
    showDirectoryPicker(options?: ShowDirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}

interface FileSystemHandle {
    /** Answers without a user gesture - `'prompt'` means a button is needed. */
    queryPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>,
    /**
     * Asks for the permission, and must itself be reached from a user gesture.
     * After a browser restart a stored handle always comes back at `'prompt'`,
     * so this is what a "Resume access" button is for.
     */
    requestPermission(descriptor?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>
}
