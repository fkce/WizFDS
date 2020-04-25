import { PositiveNumberPipe } from './positive-number.pipe';

describe('PositiveNumberPipe', () => {
  it('create an instance', () => {
    const pipe = new PositiveNumberPipe();
    expect(pipe).toBeTruthy();
  });
});
