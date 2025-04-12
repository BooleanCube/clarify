import { ChangeEvent, FormEvent, useState } from "react";
import supabase from "@/supabase-client";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { Link } from "react-router-dom";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isResetMode, setIsResetMode] = useState(false);


  // Handle standard email/password sign-in
  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      setEmail('')
      setPassword('')

      navigate("/")
    }
  };

  // Handle Google OAuth sign-in
  const handleSignInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) {
        alert(error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong with Google sign-in.");
    }
  };

  // Handle forgot password reset email
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset`
      });
      if (error) {
        alert(error.message);
      } else {
        alert("Password reset email sent! Please check your inbox.");
        setIsResetMode(false);
      }
    } catch (err: any) {
      console.error(err);
      alert("An error occurred while sending the password reset email.");
    }
  };

  return (
    // Outer container matching the example page's full-page style
    <div className="flex flex-col items-center w-full bg-pearl min-h-[calc(100vh-10rem)] justify-center pt-28">
      {/* Inner container that holds the login form */}
      <div className="px-8 pt-8 pb-12 rounded-3xl max-w-md w-full bg-white shadow-md">
        {isResetMode ? (
          <>
            <h1 className="text-3xl font-extrabold text-center text-blue-500 mb-4">
              Forgot your password?
            </h1>
            <p className="font-Sora text-blue-500 text-md mb-4">
              Enter your email address and we’ll send you a link to reset your password.
            </p>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label
                  htmlFor="resetEmail"
                  className="font-Dongle text-blue-500 text-3xl"
                >
                  Email
                </Label>
                <Input
                  id="resetEmail"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  className="w-full p-2 border-2 border-lightblue bg-lightlavender font-Sora rounded-xl text-blue-500"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-pearl text-blue-500 font-semibold py-2 rounded-xl border-2 shadow-md hover:bg-blue-500 hover:text-pearl transition"
              >
                Send Reset Email
              </Button>
            </form>
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm">
                <button
                  type="button"
                  onClick={() => setIsResetMode(false)}
                  className="text-blue-500 hover:underline"
                >
                  Back to Login
                </button>
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-extrabold text-center text-black-500 mb-4">
              Welcome back to Clarify
            </h1>
            <p className="font-Sora text-black-500 text-md mb-4 text-center">
              Login to your account!
            </p>
            <Button
              onClick={handleSignInWithGoogle}
              className="w-full bg-pearl text-blue-500 font-semibold py-2 rounded-xl border-2 shadow-md hover:bg-blue-500 hover:text-pearl transition"
              variant="outline"
            >
              Sign in with Google
            </Button>
            <div className="my-4 flex items-center justify-center">
              <span className="text-3xl font-Dongle text-black-500">or</span>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label
                  htmlFor="email"
                  className="font-Dongle text-black-500 text-3xl"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setEmail(e.target.value)
                  }
                  required
                  className="w-full p-2 border-2 border-lightblue bg-lightlavender font-Sora rounded-xl text-blue-500"
                />
              </div>
              <div>
                <Label
                  htmlFor="password"
                  className="font-Dongle text-black-500 text-3xl"
                >
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setPassword(e.target.value)
                    }
                    required
                    className="w-full p-2 border-2 border-lightblue bg-lightlavender font-Sora rounded-xl text-blue-500 pr-20"
                  />
                  {/* Plain button styled as text, not as a box */}
                  <Button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 bg-transparent"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-midblue border-2 border-darkblue text-blue-500 hover:bg-darkblue text-pearl font-semibold py-2.5 rounded-full shadow-md transition"
              >
                Login
              </Button>
              <div className="mt-4 flex flex-col items-center gap-2">
                <p className="text-sm text-black-500">
                  Don't have an account?{" "}
                  <Link to="/register" className="text-blue-500 hover:underline">
                    Register
                  </Link>
                </p>
                <p className="text-sm text-blue-500">
                  <button
                    type="button"
                    onClick={() => setIsResetMode(true)}
                    className="text-blue-500 hover:underline"
                  >
                    Forgot your password?
                  </button>
                </p>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default Login