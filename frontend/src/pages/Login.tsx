import {FormEvent, useState } from "react";
import supabase from "@/supabase-client";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import Google from '../assets/web_neutral_rd_na.svg';

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
    <div className="flex flex-col items-center w-full bg-pearl h-auto min-h-[calc(100vh-10rem)] justify-center pt-28 sm:pt-32 pb-16" id="login">
  <p className=" text-4xl pb-1 font-extrabold">Welcome back to Clarify</p>
  <p className="text-md font-light mb-8 mt-2">Login to your account!</p>

  <div className="p-8 pb-12 rounded-3xl max-w-md w-full bg-offwhite shadow-md">
    {isResetMode ? (
      <>
        <h2 className="text-3xl font-extrabold text-center mb-4">
          Forgot your password?
        </h2>
        <p className="text-md mb-4 text-center">
          Enter your email and we'll send a reset link.
        </p>
        <form onSubmit={handleForgotPassword} className="flex flex-col">
          <p className="text-xl pb-4">Email</p>
          <Input
            id="resetEmail"
            type="email"
            placeholder="You@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-4 border-[1.5px] border-black rounded-full"
          />
          <div className="pt-6">
            <Button
              type="submit"
              className="w-full font-semibold py-2 rounded-xl border-[1.5px] shadow-md hover:bg-darkgray transition"
            >
              Send Reset Email
            </Button>
          </div>
        </form>
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setIsResetMode(false)}
            className=" hover:underline hover:cursor-pointer text-sm"
          >
            Back to Login
          </button>
        </div>
      </>
    ) : (
      <>
        <h2 className="text-3xl font-extrabold text-center mb-6">
          Log in
        </h2>
        <button
          onClick={handleSignInWithGoogle}
          className="w-full justify-center items-center flex  bg-pearl font-semibold py-1 rounded-2xl border-[1.5px] mb-6  hover:shadow-lg transition"
        >
          <img src={Google} alt="Google" className="mr-2" />
          Sign in with Google
        </button>

        <div className="flex items-center space-x-2   my-4">
          <div className="flex-grow border-b"></div>
          <span className="text-xl font-bold">or</span>
          <div className="flex-grow border-b"></div>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col">
          <div className="pb-2">
            <p className="text-left font-bold pb-2 text-xl tracking-wide">Email</p>
            <Input
              id="email"
              type="email"
              placeholder="You@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 border-[1.5px] border-black mb-4 py-4  rounded-full  "
            />
          </div>
          <p className="text-left font-bold pb-2 text-xl tracking-wide">Password</p>
          <div className="relative w-full pb-2">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-4 border-[1.5px] border-black rounded-full py-4 pr-20"
            />
           <Button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-3/5 transform -translate-y-3/4 text-sm font-semibold bg-transparent text-black p-0 m-0"
          >
            {showPassword ? "Hide" : "Show"}
          </Button>

          </div>

          <div className="flex justify-center pt-8 pb-2">
            <Button
              type="submit"
              className="bg-lightgray/30 border-[1.5px] border-black hover:bg-darkgray/30 w-40 font-semibold py-3 rounded-full shadow-md text-black transition"
            >
              Login
            </Button>
          </div>
          <p className="text-sm text-center mt-6">
            Don't have an account?{" "}
            <Link to="/register">
              <span className="font-extrabold underline">Register</span>
            </Link>
          </p>
          <p className="text-sm text-center mt-1">
            <button
              type="button"
              onClick={() => setIsResetMode(true)}
              className="underline cursor-pointer" 
            >
              Forgot your password?
            </button>
          </p>
        </form>
      </>
    )}
  </div>
</div>
  );
};

export default Login
