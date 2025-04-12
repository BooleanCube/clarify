import { ChangeEvent, FormEvent, useState } from "react";
import supabase from "@/supabase-client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

import { Link } from "react-router-dom";

const Register: React.FC = () => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);


  // Handle standard email/password sign-up
  const handleRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if(password !== confirmPassword) {
      alert("Passwords do not match! Please make sure you typed it correctly.")
      return
    }

    const { data, error } = await supabase.auth.signUp({
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

      setFirstName('')
      setLastName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    }
  };

  // Handle Google OAuth sign-up
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
    <div className="mx-auto w-full max-w-sm p-6 rounded-md border shadow-sm">
      <h1 className="text-xl font-bold mb-2">Welcome to Clarify</h1>
      <p className="mb-4 text-gray-600">Register an account!</p>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleSignUpWithGoogle}
      >
        Sign up with Google
      </Button>

      <div className="my-4 flex items-center justify-center">
        <span className="text-sm text-gray-400">or</span>
      </div>

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              placeholder="John"
              value={firstName}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setFirstName(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
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

        <div>
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            />
            <Button
              type="button"
              size="sm"
              className="absolute right-2 top-2"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full">
          Register
        </Button>
        
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-sm">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-500 hover:underline">
              Login
            </Link>
          </p>
        </div>
      </form>
    </div>
  );
}

export default Register
