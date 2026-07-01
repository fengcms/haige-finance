export interface AuthStatus {
  passwordSet: boolean;
  username: string;
}

export interface AuthResult {
  ok: boolean;
  username: string;
}

export interface SetupPasswordInput {
  password: string;
  confirmPassword: string;
}

export interface LoginInput {
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}
