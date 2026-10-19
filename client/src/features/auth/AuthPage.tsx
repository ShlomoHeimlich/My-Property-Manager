import { useState, type FormEvent } from "react";
import { authApi, type User } from "../../services/authApi";

type AuthPageProps = {
  onAuthenticated: (user: User, message: string) => void;
  initialError?: string;
};

export default function AuthPage({
  onAuthenticated,
  initialError = "",
}: AuthPageProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(initialError);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      let serverMessage = "";
      const result =
        mode === "login"
          ? await authApi.login({ email, password }, (message) => {
              serverMessage = message;
            })
          : await authApi.register({ name, email, password }, (message) => {
              serverMessage = message;
            });
      authApi.saveToken(result.token);
      onAuthenticated(result.user, serverMessage);
      setPassword("");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "אירעה שגיאה",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page" dir="rtl">
      <header className="topbar">
        <a className="brand" href="/" aria-label="בית מנהל הנכסים">
          <span className="brand-mark" aria-hidden="true">
            מ
          </span>
          <span>מנהל הנכסים</span>
        </a>
        <span className="topbar-note">המרחב שלך, מסודר במקום אחד</span>
      </header>

      <section className="auth-layout" aria-label="אזור משתמש">
        <div className="form-panel">
          <>
            <p className="eyebrow">ברוכים הבאים</p>
            <h2>
              {mode === "login" ? "טוב לראות אותך שוב" : "יוצרים חשבון חדש"}
            </h2>
            <p className="form-description">
              {mode === "login"
                ? "התחברו כדי להמשיך לניהול הנכסים שלכם."
                : "מלאו את הפרטים כדי להתחיל."}
            </p>

            <div
              className="mode-switch"
              role="tablist"
              aria-label="סוג התחברות"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                כניסה
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={mode === "register" ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                הרשמה
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "register" && (
                <label className="field-label">
                  שם מלא
                  <input
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="איך קוראים לך?"
                    minLength={2}
                    maxLength={80}
                    required
                  />
                </label>
              )}
              <label className="field-label">
                כתובת אימייל
                <input
                  type="email"
                  dir="ltr"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  maxLength={254}
                  required
                />
              </label>
              <label className="field-label">
                סיסמה
                <span className="password-control">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="לפחות 8 תווים"
                    minLength={8}
                    maxLength={72}
                    required
                  />
                  <button
                    className="password-visibility"
                    type="button"
                    aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.3 9.5 6-.4.7-1.3 1.9-2.8 3M6.2 6.2C4.3 7.4 3.1 9.2 2.5 11c1 1.7 4.5 6 9.5 6 1 0 2-.2 2.9-.5" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                        <circle cx="12" cy="12" r="2.5" />
                      </svg>
                    )}
                  </button>
                </span>
              </label>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="submit-button"
                type="submit"
                disabled={loading}
              >
                {loading
                  ? "מתחברים..."
                  : mode === "login"
                    ? "כניסה לחשבון"
                    : "יצירת חשבון"}
                <span aria-hidden="true">←</span>
              </button>
            </form>
            <p className="form-legal">הפרטים שלך נשמרים באופן מאובטח</p>
          </>
        </div>
      </section>
      <footer className="page-footer">
        <span>מנהל הנכסים</span>
        <span>ניהול ברור. שקט בראש.</span>
      </footer>
    </main>
  );
}
