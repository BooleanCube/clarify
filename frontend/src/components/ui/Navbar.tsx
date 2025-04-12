import React from "react"
import { Link } from "react-router-dom";

const Navbar: React.FC = () => {
  return (
    <nav className="flex gap-4 items-center justify-center">
      <Link to="/">Home</Link>
      <Link to="/register">Register</Link>
      <Link to="/login">Login</Link>
      <Link to="/new">New Note</Link>
    </nav>
  );
};

export default Navbar
