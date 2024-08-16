// example.test.ts

import doubleNumber from '../example';

describe('doubleNumber function', () => {

  it('should return the correct doubled value', () => {
    const input: number = 5;
    const expectedOutput: number = 10;
    const result: number = doubleNumber(input);
    expect(result).toBe(expectedOutput);
  });

  it('should handle zero input', () => {
    const input: number = 0;
    const expectedOutput: number = 0;
    const result: number = doubleNumber(input);
    expect(result).toBe(expectedOutput);
  });

});
