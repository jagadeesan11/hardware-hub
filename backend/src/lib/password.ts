import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';

export const hashPassword = (plain: string) => bcrypt.hash(plain, env.BCRYPT_ROUNDS);

export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

/**
 * Burns roughly the same time as a real comparison. Without it, a missing email
 * returns far faster than a wrong password, which leaks account existence.
 */
export const fakeVerify = () =>
  bcrypt.compare('dummy-password', '$2a$12$C6UzMDM.H6dfI/f/IKcEe.rjkS7VJUvAYGGJdlXLNUvhqjqHUxsO2');
