import { randomInt } from 'node:crypto';

/** 31 easy-to-read characters: no 0, 1, I, L or O (CLAUDE.md, resolved conflicts). */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/** A random guest or gallery code. 10 characters ≈ 8 × 10¹⁴ possibilities. */
export function generateCode(length = 10): string {
  let code = '';
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}
