import { useEffect, useState } from "react";
import { authApi, type User } from "./services/authApi";
import AuthPage from "./features/auth/AuthPage";
import PropertiesPage from "./features/properties/PropertiesPage";
import "./App.css";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [notice, setNotice] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let isMounted = true;
    authApi
      .currentUser()
      .then((currentUser) => {
        if (isMounted) setUser(currentUser);
      })
      .catch((error: Error) => {
        authApi.clearToken();
        if (isMounted) {
          setUser(null);
          setSessionError(error.message);
        }
      })
      .finally(() => {
        if (isMounted) setCheckingSession(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  function logout() {
    authApi.clearToken();
    setUser(null);
    setNotice("");
  }

  function handleAuthenticated(authenticatedUser: User, serverMessage: string) {
    setUser(authenticatedUser);
    setSessionError("");
    setNotice(serverMessage);
  }

  if (checkingSession) {
    return (
      <main className="auth-page" dir="rtl" aria-busy="true">
        <div className="session-loading">טוענים את החשבון...</div>
      </main>
    );
  }

  return user ? (
    <PropertiesPage user={user} onLogout={logout} initialNotice={notice} />
  ) : (
    <AuthPage
      onAuthenticated={handleAuthenticated}
      initialError={sessionError}
    />
  );
}

export default App;
