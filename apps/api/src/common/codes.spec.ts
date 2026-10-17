import { CODE_ALPHABET, generateCode } from './codes';

describe('generateCode', () => {
  it('uses the 31 easy-to-read characters only', () => {
    expect(CODE_ALPHABET).toHaveLength(31);
    expect(CODE_ALPHABET).not.toMatch(/[01ILO]/);
    for (let i = 0; i < 200; i++) expect(generateCode()).toMatch(/^[2-9A-HJKMNP-Z]{10}$/);
  });

  it('is random', () => {
    expect(new Set(Array.from({ length: 50 }, () => generateCode())).size).toBe(50);
  });
});
