import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";

export const meta = () => ([
  { title: "Resumind | Auth" },
  { name: "description", content: "Log into your account" },
]);

const Auth = () => {
  const { isLoading, auth } = usePuterStore();

  const location = useLocation();
  const next = location.search.split("next=")[1];

  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated) navigate(next || "/");
  }, [auth.isAuthenticated, next, navigate]);

  return (
    <main className="bg-[url('/images/bg-auth.svg')] bg-cover bg-center min-h-screen flex items-center justify-center p-4">
      <div className="gradient-border shadow-lg w-full max-w-lg">
        <section className="flex flex-col gap-6 sm:gap-8 bg-white rounded-2xl p-6 sm:p-10 w-full items-center">
          {/* Heading */}
          <div className="flex flex-col items-center gap-2 text-center w-full">
            <h1 className="!text-3xl sm:!text-4xl md:!text-5xl font-bold">Welcome</h1>
            <h2 className="!text-base sm:!text-lg text-gray-600">Log In to Continue Your Job Journey</h2>
          </div>

          {/* Auth Button Section */}
          <div className="w-full flex justify-center">
            {isLoading ? (
              <button className="auth-button animate-pulse" disabled>
                <p>Signing you in...</p>
              </button>
            ) : (
              <>
                {auth.isAuthenticated ? (
                  <button
                    className="auth-button"
                    onClick={auth.signOut}
                  >
                    <p>Log Out</p>
                  </button>
                ) : (
                  <button
                    className="auth-button"
                    onClick={auth.signIn}
                  >
                    <p>Log In</p>
                  </button>
                )}
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

export default Auth;