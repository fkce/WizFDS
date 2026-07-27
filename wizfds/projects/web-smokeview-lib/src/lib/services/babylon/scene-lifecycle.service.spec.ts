import { TestBed } from '@angular/core/testing';

import { SceneLifecycleService, SceneScoped } from './scene-lifecycle.service';

class Participant implements SceneScoped {
  resets = 0;
  resetSceneState(): void { this.resets++; }
}

describe('SceneLifecycleService', () => {
  let service: SceneLifecycleService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SceneLifecycleService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('resets every registered participant', () => {
    const first = new Participant();
    const second = new Participant();
    service.register(first);
    service.register(second);

    service.reset();

    expect(first.resets).toBe(1);
    expect(second.resets).toBe(1);
  });

  it('registers a participant once, however often it asks', () => {
    // Services are providedIn: 'root', but a spec can construct one twice
    const participant = new Participant();
    service.register(participant);
    service.register(participant);

    service.reset();

    expect(participant.resets).toBe(1);
  });

  it('resets participants that registered after an earlier reset', () => {
    const early = new Participant();
    service.register(early);
    service.reset();

    const late = new Participant();
    service.register(late);
    service.reset();

    expect(early.resets).toBe(2);
    expect(late.resets).toBe(1);
  });

  it('keeps going when one participant throws', () => {
    // One service failing to clean up must not strand the others - the scene is
    // already gone either way.
    const before = new Participant();
    const after = new Participant();
    service.register(before);
    service.register({ resetSceneState: () => { throw new Error('boom'); } });
    service.register(after);

    expect(() => service.reset()).not.toThrow();
    expect(before.resets).toBe(1);
    expect(after.resets).toBe(1);
  });
});
