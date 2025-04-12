import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/middleware";
import supabase from "@/supabase-client";
import logo from "../../assets/clarify.svg";

const Footer = () => {
  const [name, setName] = useState("");
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setName(session.user.user_metadata.full_name);
    }
  }, [session]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    navigate("/login");
  };

  return (
    <footer className="w-screen z-50 shadow border-t-[1.5px] border-black/20 bg-darkgray px-20 py-8">

      <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 px-6">
        <Link to="/" className="flex items-center space-x-2">
          <img
            src={logo}
            alt="Logo"
            className="h-8 hover:opacity-70 transition duration-300"
          />
        </Link>

    <div className="flex space-x-8 items-center text-md">
      <Link to="/#home" className="nav-color">Home</Link>
      <Link to="/#about" className="nav-color">About</Link>

      {session ? (
        <>
          <span className="nav-color font-medium">{name}</span>
          <button
            onClick={handleLogout}
            className="nav-color"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="nav-color text-bold rounded-full">Login</Link>
          <Link to="/register" className="nav-color text-bold rounded-full">Sign Up</Link>
        </>
      )}
    </div>
  </div>
</footer>
  );
};

export default Footer;
