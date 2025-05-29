import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSidebar, FiHeart, FiHome } from "react-icons/fi";
import { CgNotes } from "react-icons/cg";

// (Re)declare your types if needed.
export interface Tag {
  id: number;
  name: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  favorite: boolean;
  tags: Tag[];
}

interface SidebarProps {
  showSidebar: boolean;
  setShowSidebar: React.Dispatch<React.SetStateAction<boolean>>;
  notes: Note[];
  showFavorites: boolean;
  setShowFavorites: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar: React.FC<SidebarProps> = ({
  showSidebar,
  setShowSidebar,
  notes,
  showFavorites,
  setShowFavorites,
}) => {
  const navigate = useNavigate();

  return (
    <div
      className={`
        fixed inset-y-0 left-0 pt-24 z-30 bg-darkgray border-[1.5px] shadow-md transition-all duration-300
        ${showSidebar ? "w-full md:w-64" : "w-20"}
      `}
    >
      <div
        className={`
          flex items-center py-4 cursor-pointer hover:bg-white/30 transition-all duration-300 
          ${showSidebar ? "px-4" : "justify-center"}
        `}
        onClick={() => setShowSidebar((prev) => !prev)}
      >
        <button>
          <FiSidebar size={22} />
        </button>
        {showSidebar && <span className="pl-2 tracking-wide">Menu</span>}
      </div>
      <nav className="flex flex-col">
        <button
          onClick={() => navigate("/dashboard")}
          className={`
            w-full px-4 hover:cursor-pointer py-4 hover:bg-white/30 transition-all duration-300 
            ${showSidebar ? "flex items-center space-x-2" : "flex justify-center"}
          `}
        >
          <FiHome size={20} />
          {showSidebar && <span className="tracking-wide">Dashboard</span>}
        </button>
        <button
          onClick={() => setShowFavorites((prev) => !prev)}
          className={`
            w-full px-4 py-4 hover:bg-white/30 transition-all duration-300 
            ${showSidebar ? "flex items-center space-x-2" : "flex justify-center"}
          `}
        >
          <FiHeart size={20} />
          {showSidebar && <span className="tracking-wide cursor-pointer">Favorites</span>}
        </button>
        <span className="mb-5"></span>
        {showSidebar && (
          <>
            <hr className="my-2 border-t border-gray-400" />
            <div className="mt-4 space-y-4">
              <p className="font-extrabold text-2xl pl-4 tracking-wider">Notes</p>
              {notes.map((note) => {
                if (showFavorites && !note.favorite) return null;
                return (
                  <button
                    key={note.id}
                    className="w-full tracking-wide text-left hover:cursor-pointer px-4 py-4 rounded hover:bg-white/30"
                  >
                    <Link to={`/note/${note.id}`} className="flex items-center">
                      <CgNotes className="mr-2" size={20} />
                      <span>{note.title}</span>
                    </Link>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </nav>
    </div>
  );
};

export default Sidebar;
