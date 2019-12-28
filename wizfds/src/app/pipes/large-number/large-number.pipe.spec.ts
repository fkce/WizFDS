import { LargeNumberPipe } from './large-number.pipe';

describe('LargeNumberPipe', () => {
  it('create an instance', () => {
    const pipe = new LargeNumberPipe();
    expect(pipe).toBeTruthy();
  });
});
