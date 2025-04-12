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
    <div className="mx-auto w-full max-w-sm p-6 rounded-md border shadow-sm">
      {isResetMode ? (
        <>
          <h1 className="text-xl font-bold mb-2">Forgot your password?</h1>
          <p className="mb-4 text-gray-600">
            Enter your email address and we'll send you a link to reset your password.
          </p>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
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
          <h1 className="text-xl font-bold mb-2">Welcome back to Clarify</h1>
          <p className="mb-4 text-gray-600">Login to your account!</p>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSignInWithGoogle}
          >
            Sign in with Google
          </Button>

          <div className="my-4 flex items-center justify-center">
            <span className="text-sm text-gray-400">or</span>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                  required
                />
                <Button
                  type="button"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full">
              Login
            </Button>
            
            <div className="mt-4 flex flex-col items-center gap-2">
              <p className="text-sm">
                Don't have an account?{" "}
                <Link to="/register" className="text-blue-500 hover:underline">
                  Register
                </Link>
              </p>
              <p 
                className="text-sm"
              >
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
  );
}

export default Login
