import React, { useState, useEffect } from "react";

import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

interface Tag {
  id: number;
  name: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  favorite: boolean;
  tags: Tag[];
}


const Dashboard: React.FC = () => {
  const { session } = useAuth();
  const pid = session?.user.id
  const navigate = useNavigate();

  // Use state for notes so they can be updated
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // add function to do button shit
  const [isModalOpen, setisModalOpen] = useState<boolean>(false);

  // function to do names steps
  const [noteName, setNoteName] = useState<string>("");
  const [modalStep, setModalStep] = useState<"enterName" | "selectOption">("enterName");

  const openModal = () => {
    console.log("open modal")
    setisModalOpen(true);
  }

  const closeModal = () => {
    console.log("close modal")
    setisModalOpen(false);
    setModalStep("enterName");
    setNoteName("");
  }

  const handleOptionSelect = (option: string) => {
    console.log(`Selected option: ${option}, Note name: ${noteName}`);
    closeModal();
    // Navigate to the new note page with the selected option
    navigate("/new", {state: {selectedOption: option, noteName}});
  } 

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from('notes')
      .select(`
        id,
        title: name,
        content,
        notes_tags (
          tag: tags (
            id,
            name
          )
        ),
        favorite
      `)
      .eq("profile_id", pid)
      .order('created_at', { ascending: false });
  
    if (error) {
      console.error("Error fetching notes with tags:", error);
      return;
    }
  
    const notesWithTags: Note[] = data.map((note: any) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.notes_tags.map((nt: any) => nt.tag),
      favorite: note.favorite
    }));
  
    setNotes(notesWithTags);
  };  

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq("profile_id", pid)
      .order('created_at', { ascending: true })
    
    if (error) {
      console.error("Error fetching all tags:", error);
      return;
    }

    const tags: Tag[] = data.map((tag: Tag) => ({
      id: tag.id,
      name: tag.name,
    }))

    setTags(tags)
  }

  useEffect(() => {
    if (!pid) return;
  
    fetchNotes();
    fetchTags();
  
    const notesChannel = supabase
      .channel("notes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, fetchNotes)
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, fetchTags)
      .on("postgres_changes", { event: "*", schema: "public", table: "notes_tags" }, fetchNotes)
      .subscribe();
  
    return () => {
      supabase.removeChannel(notesChannel);
    };
  }, [pid]);
  
 
  // State for active label filter and search term
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  // State to track which note's dropdown is open
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});
  // State to toggle favorites view on the dashboard and sidebar
  const [showFavorites, setShowFavorites] = useState<boolean>(false);
  // New state to toggle sidebar visibility
  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  // Toggle the dropdown menu for a given note
  const toggleMenu = (noteId: number) => {
    setOpenMenus((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  const handleAddNoteTag = async (noteId: number) => {
    // Make sure tags are loaded
    if (tags.length === 0) {
      alert("No tags available.");
      return;
    }
  
    // Prompt user with available tag names
    const tagOptions = tags.map((tag, idx) => `${idx + 1}. ${tag.name}`).join("\n");
    const input = window.prompt(`Select a tag by number:\n${tagOptions}`);
  
    if (!input) return;
  
    const index = parseInt(input.trim(), 10) - 1;
  
    if (isNaN(index) || index < 0 || index >= tags.length) {
      alert("Invalid tag selection.");
      return;
    }
  
    const selectedTag = tags[index];
  
    try {
      // Insert into notes_tags
      const { error } = await supabase.from("notes_tags").insert([
        {
          note_id: noteId,
          tag_id: selectedTag.id,
        },
      ]);
  
      if (error) {
        console.error("Error linking tag to note:", error);
        alert("Failed to add tag.");
      } else {
        fetchNotes(); // Refresh notes
      }
  
      setOpenMenus((prev) => ({ ...prev, [noteId]: false }));
    } catch (err) {
      console.error("Unexpected error in handleAddTag:", err);
    }
  };  

  const handleAddTag = async () => {
    const newTag = window.prompt("Enter new tag:");
  
    if (!newTag || newTag.trim() === "") return;
  
    const trimmedTag = newTag.trim();

    const { data: existingTags, error: fetchError } = await supabase
      .from("tags")
      .select("*")
      .eq("name", trimmedTag)
      .eq("profile_id", session?.user.id)
      .single();
  
    if (existingTags) {
      alert("Tag already exists.");
      return;
    }
  
    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking for existing tag:", fetchError);
      return;
    }
  
    const { data, error } = await supabase.from("tags").insert([
      {
        name: trimmedTag,
        profile_id: session?.user.id,
      },
    ]);
  
    if (error) {
      console.error("Error inserting tag:", error);
      return;
    }
  
    fetchTags();
  };
  

  const handleFavorite = async (noteId: number) => {
    const targetNote = notes.find((note) => note.id === noteId);
    if (!targetNote) return;
  
    const newFavoriteValue = !targetNote.favorite;
  
    const { error } = await supabase
      .from("notes")
      .update({ favorite: newFavoriteValue })
      .eq("id", noteId);
  
    if (error) {
      console.error("Error updating favorite status:", error);
      return;
    }
  
    setNotes((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, favorite: newFavoriteValue } : note
      )
    );
  
    setOpenMenus((prev) => ({ ...prev, [noteId]: false }));
  };
  

  const handleDelete = async (noteId: number) => {
    const { error } = await supabase.from("notes").delete().eq("id", noteId);
    if (error) {
      console.error("Error deleting note:", error);
    } else {
      fetchNotes();
    }
  };  

  // Filter notes based on active label and search term
  const filteredNotes = notes.filter((note: Note) => {
    const matchesLabel = activeTag
      ? note.tags.some((tag) => tag.id === activeTag.id)
      : true;
  
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(lowerSearch) ||
      note.content.toLowerCase().includes(lowerSearch);
  
    return matchesLabel && matchesSearch;
  });

  return (
    <div className="flex h-screen w-screen bg-gray-100">
      {/* Sidebar (Left) */}
      {showSidebar && (
        <aside className="w-64 bg-white shadow-md flex flex-col">
          <nav className="flex-1 px-2 py-20">
            {/* Favorites Toggle Button */}
            <div className="mb-4">
              <button
                className={`w-full text-left px-4 py-2 rounded ${
                  showFavorites
                    ? "bg-blue-700 text-white"
                    : "bg-gray-200 text-blue-700"
                }`}
                onClick={() => setShowFavorites((prev) => !prev)}
              >
                {showFavorites ? "Show All Notes" : "Show Favorites"}
              </button>
            </div>
            {/* Sidebar Heading */}
            <div className="mb-2 font-semibold text-gray-700 px-4 py-2">
              {showFavorites ? "Favorites" : "Notes"}
            </div>
            {/* List of notes for sidebar */}
            <div className="space-y-4">
              {notes.map((note) => {
                if(showFavorites && !note.favorite) {
                  return (<></>)
                }

                return (
                  <button
                    key={note.id}
                    className="w-full text-left px-4 py-2 rounded hover:bg-gray-200"
                  >
                    <Link to={`/note/${note.id}`}>
                      {note.title}
                    </Link>
                  </button>
                )
              })}
            </div>
          </nav>
        </aside>
      )}
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="h-16 bg-white shadow-md flex items-center justify-between px-6 py-20">
          <div className="flex items-center space-x-4">
            <button
              className="bg-gray-300 px-2 py-1 rounded"
              onClick={() => setShowSidebar((prev) => !prev)}
            >
              {showSidebar ? "Hide Sidebar" : "Show Sidebar"}
            </button>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-4">Home</h1>
          {/* Row for label chips and global controls */}
          <div className="flex items-center justify-between mb-4">
            {/* Left: Available label chips */}
            <div className="flex space-x-2">
            {tags.map((tag: Tag) => (
              <span
                key={tag.id}
                className={`cursor-pointer inline-block bg-gray-200 text-blue-700 px-3 py-1 rounded ${
                  activeTag?.id === tag.id ? "bg-blue-700 text-white" : ""
                }`}
                onClick={() => setActiveTag(activeTag?.id === tag.id ? null : tag) }
              >
                {tag.name}
              </span>
            ))}
            </div>
            {/* Right: Global "+ New" Button for tags & Search Input */}
            <div className="flex items-center space-x-2">
              <button
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                onClick={handleAddTag}
              >
                + New
              </button>
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-300 px-3 py-2 rounded focus:outline-none"
              />
            </div>
          </div>
          {/* <div className="bg-white rounded shadow p-6 mb-4 flex justify-center items-center text-xl font-semibold text-gray-700">
            + New
          </div> */}
          <div className="bg-white p-4 rounded shadow mb-4 flex items-center justify-center cursor-pointer hover:bg-gray-100">
            <button className="text-2xl font-bold cursor-pointer hover:bg-gray-100"
              onClick={openModal}
            >
              + New Note
            </button>
            {/* Modal for adding a new note */}
          {isModalOpen && (
           <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-lg p-6 w-96">
                {modalStep === "enterName" ? (
                  // Step 1: Enter Note Name
                  <>
                    <h2 className="text-lg font-bold mb-4">Enter a Name for Your Note</h2>
                    <input
                      type="text"
                      value={noteName}
                      onChange={(e) => setNoteName(e.target.value)}
                      placeholder="Note Name"
                      className="w-full border border-gray-300 px-3 py-2 rounded mb-4 focus:outline-none"
                    />
                    <button
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                      onClick={() => {
                        if (noteName.trim() === "") {
                          alert("Please enter a name for your note.");
                          return;
                        }
                        setModalStep("selectOption"); // Move to the next step
                      }}
                    >
                      Next
                    </button>
                    <button
                      className="mt-4 w-full bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  // Step 2: Select Option
                  <>
                    <h2 className="text-lg font-bold mb-4">Select an Option</h2>
                    <div className="space-y-4">
                      <button
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                        onClick={() => handleOptionSelect("Document")}
                      >
                        Document
                      </button>
                      <button
                        className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                        onClick={() => handleOptionSelect("Image")}
                      >
                        Image
                      </button>
                      <button
                        className="w-full bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
                        onClick={() => handleOptionSelect("Text")}
                      >
                        Text
                      </button>
                    </div>
                    <button
                      className="mt-4 w-full bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                      onClick={closeModal}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
          </div>
          {/* Render filtered notes for main content */}
          <div className="space-y-4">
            {filteredNotes.map((note: Note) => {
              if(showFavorites && !note.favorite) return (<></>)
                
              return (
                <Link to={`/note/${note.id}`} className="cursor-pointer p-4" key={note.id}>
                  <div
                    key={note.id}
                    className="bg-white p-4 rounded shadow relative"
                  >
                    {/* Note Title & Dots Menu Button */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{note.title}</div>
                      <div className="relative">
                        <button
                          className="text-gray-500 hover:text-gray-700 px-2"
                          onClick={() => toggleMenu(note.id)}
                        >
                          <span className="text-xl font-bold">...</span>
                        </button>
                        {openMenus[note.id] && (
                          <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-md z-10">
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => handleAddNoteTag(note.id)}
                            >
                              Add Tag
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => handleFavorite(note.id)}
                            >
                              {note.favorite
                                ? "Unfavorite"
                                : "Favorite"}
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 hover:bg-gray-100"
                              onClick={() => handleDelete(note.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{note.content}</p>
                    <div className="mt-2 flex space-x-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-block bg-gray-200 text-blue-700 px-2 py-1 rounded text-xs"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </Link>
                
              )
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;