import { useState, useEffect } from "react";
import { AiOutlineClose, AiOutlineMenu } from "react-icons/ai";
import logo from "../../assets/clarify.svg";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/middleware";
import supabase from "@/supabase-client";

const Navbar = () => {
  const [nav, setNav] = useState(false);
  const [name, setName] = useState("");
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session?.user?.user_metadata?.full_name) {
      setName(session.user.user_metadata.full_name);
    }
  }, [session]);

  const handleNav = () => {
    setNav(!nav);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      alert(error.message);
      return;
    }
    navigate("/login");
  };

  const AuthDropdown = () => (
    <div className="relative group">
      <button className="nav-color tracking-wide">{name}</button>
      <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
        <button
          onClick={handleLogout}
          className="block w-full font-bold tracking-wide text-left px-4 py-2 text-sm hover:bg-gray-100"
        >
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <nav className="p-4 fixed top-0 left-0 w-full z-50 shadow bg-offwhite">
      <div className="w-full max-w-[1440px] mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center ml-6">
          <img
            src={logo}
            alt="Logo"
            className="md:h-10 h-8 2xl:h-12 hover:opacity-70 lg:ml-[80px] transition-all duration-300 ease-in-out"
          />
        </Link>

        <div className="hidden md:flex mr-8 lg:mr-[80px] tracking-wide items-center space-x-6 text-md">
          <Link to="/#home" className="nav-color font-bold tracking-wide nav-link">Home</Link>
          <Link to="/#about" className="nav-color font-bold tracking-wide nav-link">About</Link>

          {session ? (
            <>
              <Link to="/dashboard" className="nav-color font-bold tracking-wide nav-link">
                Dashboard
              </Link>
              <AuthDropdown />
            </>
          ) : (
            <>
              <Link to="/login" className="nav-color border-[1.5px] bg-offwhite hover:bg-darkgray/35 transition-all duration-300 border-black px-6 py-1 rounded-full font-bold tracking-wide ">Login</Link>
              <Link to="/register" className="nav-color border-[1.5px] border-black px-6 py-1 rounded-full font-bold tracking-wide  bg-darkgray hover:bg-darkgray/60 transition-all duration-300">Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Menu Icon */}
        <div className="block md:hidden cursor-pointer mr-6" onClick={handleNav}>
          {nav ? <AiOutlineClose size={28} /> : <AiOutlineMenu size={28} />}
        </div>
      </div>

      {/* Mobile Menu */}
      <ul
        className={`fixed top-0 right-0 w-full h-full flex flex-col items-center justify-start space-y-8 transform transition-all duration-500 ease-in-out ${
          nav ? "translate-x-0" : "translate-x-full"
        } md:hidden bg-white z-40`}
      >
        <li className="absolute top-6 right-6">
          <AiOutlineClose size={28} className="cursor-pointer" onClick={handleNav} />
        </li>
        <li className="text-md tracking-wide translate-y-20">
          <Link to="/" onClick={handleNav} className="text-4xl">Home</Link>
        </li>
        <li className="text-md tracking-wide translate-y-20">
          <Link to="/about" onClick={handleNav} className="text-4xl">About</Link>
        </li>
        {session ? (
          <>
            <li className="text-md translate-y-20 text-3xl font-semibold">
              {name}
            </li>
            <li className="text-md translate-y-20">
              <Link to="/dashboard" onClick={handleNav} className="text-4xl tracking-wide">Dashboard</Link>
            </li>
            <li className="text-md tracking-wide translate-y-20">
              <button onClick={handleLogout} className="text-4xl text-red-500">
                Logout
              </button>
            </li>
          </>
        ) : (
          <>
            <li className="text-md translate-y-20">
              <Link to="/login" onClick={handleNav} className="text-4xl tracking-wide">Login</Link>
            </li>
            <li className="text-md translate-y-20">
              <Link to="/register" onClick={handleNav} className="text-4xl tracking-wide">Sign Up</Link>
            </li>
          </>
        )}
      </ul>
    </nav>
  );
};

export default Navbar;
