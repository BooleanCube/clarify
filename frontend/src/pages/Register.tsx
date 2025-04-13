import { ChangeEvent, FormEvent, useState } from "react";
import supabase from "@/supabase-client";
import { useNavigate, Link } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import Google from '../assets/web_neutral_rd_na.svg';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match! Please make sure you typed it correctly.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          firstName,
          lastName,
        },
      },
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Registration successful! Please check your email for verification.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      navigate("/login");
    }
  };

  const handleSignUpWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      if (error) {
        alert(error.message);
      }
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong with Google sign-up.");
    }
  };

  return (
    <div className="flex flex-col items-center w-full bg-pearl h-auto min-h-[calc(100vh-10rem)] justify-center pt-28 sm:pt-32 pb-16">
      <p className="text-4xl pb-1 font-extrabold">Join us on Clarify</p>
      <p className="text-md font-light mb-8 mt-2">Create your account!</p>

      <div className="p-8 pb-12 rounded-3xl max-w-md w-full bg-offwhite shadow-md">
        <h2 className="text-3xl font-extrabold text-center mb-6">Sign up</h2>

        <button
          onClick={handleSignUpWithGoogle}
          className="w-full justify-center items-center flex bg-pearl font-semibold py-1 rounded-2xl border-[1.5px] mb-6 hover:shadow-lg transition"
        >
          <img src={Google} alt="Google" className="mr-2" />
          Sign up with Google
        </button>

        <div className="flex items-center space-x-2 my-4">
          <div className="flex-grow border-b"></div>
          <span className="text-xl font-bold">or</span>
          <div className="flex-grow border-b"></div>
        </div>

        <form onSubmit={handleRegister} className="flex flex-col space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <p className="text-left font-bold pb-2 text-xl tracking-wide">First Name</p>
              <Input
                id="firstName"
                placeholder="Jane"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full p-4 border-[1.5px] border-black rounded-full"
              />
            </div>
            <div className="flex-1">
              <p className="text-left font-bold pb-2 text-xl tracking-wide">Last Name</p>
              <Input
                id="lastName"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full p-4 border-[1.5px] border-black rounded-full"
              />
            </div>
          </div>

          <div>
            <p className="text-left font-bold pb-2 text-xl tracking-wide">Email</p>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 border-[1.5px] border-black rounded-full"
            />
          </div>

          <div className="relative">
            <p className="text-left font-bold pb-2 text-xl tracking-wide">Password</p>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-4 border-[1.5px] border-black rounded-full pr-20"
            />
            <Button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3/5 transform -translate-y-1/5 text-sm font-semibold bg-transparent text-black p-0 m-0"
            >
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>

          <div className="relative">
            <p className="text-left font-bold pb-2 text-xl tracking-wide">Confirm Password</p>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-4 border-[1.5px] border-black rounded-full pr-20"
            />
            <Button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3/5 transform -translate-y-1/5 text-sm font-semibold bg-transparent text-black p-0 m-0"
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </Button>
          </div>

          <div className="flex justify-center pt-4 pb-2">
            <Button
              type="submit"
              className="bg-lightgray/30 border-[1.5px] border-black hover:bg-darkgray/30 w-40 font-semibold py-3 rounded-full shadow-md text-black transition"
            >
              Register
            </Button>
          </div>

          <p className="text-sm text-center mt-2">
            Already have an account?{" "}
            <Link to="/login">
              <span className="font-extrabold underline">Login</span>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
