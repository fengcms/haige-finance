import { z } from 'zod';

const passwordSchema = z.string().min(6, '密码至少需要 6 位').max(128, '密码不能超过 128 位');

export const setupPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });

export const loginSchema = z.object({
  password: z.string().min(1, '请输入密码'),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, '请输入旧密码'),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: '两次输入的新密码不一致',
    path: ['confirmPassword'],
  });
