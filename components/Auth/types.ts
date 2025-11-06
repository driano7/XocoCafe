export type AuthSuccessSource = 'login' | 'register';

export interface AuthSuccessContext {
  source: AuthSuccessSource;
}

export type AuthSuccessHandler = (
  token: string,
  user: Record<string, unknown>,
  context: AuthSuccessContext
) => void;
