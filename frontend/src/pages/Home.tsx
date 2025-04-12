import React, { MouseEvent, useEffect, useState } from "react"
import supabase from "@/supabase-client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/middleware";

const Home: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = useState('')

  const { session } = useAuth();

  useEffect(() => {
    if (session?.user?.id) {
      setName(session.user.user_metadata.full_name);
    }
  }, [session]);

  const logout = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const { error } = await supabase.auth.signOut();
    if(error) {
      console.error(error)
      alert(error)
      return
    }

    navigate("/login")
  }

  return (
    <>
      <div>
        Home | Hey {name}
      </div>
      <div>
        <button
          type="button"
          onClick={logout}
          className="text-blue-500 hover:underline"
        >
          Logout
        </button>
      </div>
    </>
  );
};

export default Home
