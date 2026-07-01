import crypto from 'node:crypto';
import { changePasswordSchema, loginSchema, setupPasswordSchema } from '../../shared/schemas/auth.js';
import type { AuthResult, AuthStatus } from '../../shared/types/auth.js';
import { getSqlite } from '../db/index.js';

const username = 'admin';
const hashKey = 'auth_password_hash';
const saltKey = 'auth_password_salt';
const setAtKey = 'auth_password_set_at';
const scryptKeyLength = 64;

export class AuthService {
  getStatus(): AuthStatus {
    return {
      passwordSet: Boolean(this.getMeta(hashKey) && this.getMeta(saltKey)),
      username,
    };
  }

  setupPassword(input: unknown): AuthResult {
    if (this.getStatus().passwordSet) {
      throw new Error('登录密码已设置，请在系统设置中修改密码');
    }

    const data = setupPasswordSchema.parse(input);
    this.savePassword(data.password);
    return { ok: true, username };
  }

  login(input: unknown): AuthResult {
    const data = loginSchema.parse(input);
    if (!this.getStatus().passwordSet) {
      throw new Error('尚未设置登录密码');
    }

    if (!this.verifyPassword(data.password)) {
      throw new Error('密码错误');
    }

    return { ok: true, username };
  }

  changePassword(input: unknown): AuthResult {
    const data = changePasswordSchema.parse(input);
    if (!this.getStatus().passwordSet) {
      throw new Error('尚未设置登录密码');
    }

    if (!this.verifyPassword(data.oldPassword)) {
      throw new Error('旧密码错误');
    }

    this.savePassword(data.newPassword);
    return { ok: true, username };
  }

  private verifyPassword(password: string): boolean {
    const savedHash = this.getMeta(hashKey);
    const savedSalt = this.getMeta(saltKey);
    if (!savedHash || !savedSalt) {
      return false;
    }

    const inputHash = hashPassword(password, savedSalt);
    const left = Buffer.from(savedHash, 'hex');
    const right = Buffer.from(inputHash, 'hex');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  }

  private savePassword(password: string) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);
    const now = Date.now();
    this.setMeta(hashKey, hash, now);
    this.setMeta(saltKey, salt, now);
    this.setMeta(setAtKey, String(now), now);
  }

  private getMeta(key: string): string | null {
    const row = getSqlite().prepare('SELECT value FROM app_meta WHERE key = ?').get(key) as { value?: string } | undefined;
    return row?.value ?? null;
  }

  private setMeta(key: string, value: string, now: number) {
    getSqlite()
      .prepare(
        `
          INSERT INTO app_meta (key, value, created_at, updated_at)
          VALUES (@key, @value, @now, @now)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at
        `,
      )
      .run({ key, value, now });
  }
}

function hashPassword(password: string, salt: string) {
  return crypto.scryptSync(password, salt, scryptKeyLength).toString('hex');
}
