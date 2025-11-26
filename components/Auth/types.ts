export type AuthSuccessSource = 'login' | 'register';

export interface AuthSuccessContext {
  source: AuthSuccessSource;
  loginCount?: number | null;
  showFeedbackPrompt?: boolean;
}

export type AuthSuccessHandler = (
  token: string,
  user: Record<string, unknown>,
  context: AuthSuccessContext
) => void;
