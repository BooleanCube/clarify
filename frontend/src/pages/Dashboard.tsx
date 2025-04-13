import React, { useState, useEffect } from "react";
import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";
import { Link, useNavigate } from "react-router-dom";
import { FiTrash2 } from "react-icons/fi";
import { GrSearch } from "react-icons/gr";
import Sidebar, { Note, Tag } from "@/components/ui/Sidebar"; // Adjust the import path as needed

const Dashboard: React.FC = () => {
  const { session } = useAuth();
  const pid = session?.user.id;
  const navigate = useNavigate();

  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isModalOpen, setisModalOpen] = useState<boolean>(false);
  const [noteName, setNoteName] = useState<string>("");
  const [modalStep, setModalStep] = useState<"enterName" | "selectOption">("enterName");

  // UI states for sidebar and filters
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [activeTag, setActiveTag] = useState<Tag | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [openMenus, setOpenMenus] = useState<Record<number, boolean>>({});
  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  const openModal = () => {
    console.log("open modal");
    setisModalOpen(true);
  };

  const closeModal = () => {
    console.log("close modal");
    setisModalOpen(false);
    setModalStep("enterName");
    setNoteName("");
  };

  const handleOptionSelect = (option: string) => {
    console.log(`Selected option: ${option}, Note name: ${noteName}`);
    closeModal();
    navigate("/new", { state: { selectedOption: option, noteName } });
  };

  const fetchNotes = async () => {
    const { data, error } = await supabase
      .from("notes")
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
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes with tags:", error);
      return;
    }

    const notesWithTags: Note[] = data.map((note: any) => ({
      id: note.id,
      title: note.title,
      content: note.content,
      tags: note.notes_tags.map((nt: any) => nt.tag),
      favorite: note.favorite,
    }));

    setNotes(notesWithTags);
  };

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from("tags")
      .select("*")
      .eq("profile_id", pid)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching all tags:", error);
      return;
    }

    const tags: Tag[] = data.map((tag: Tag) => ({
      id: tag.id,
      name: tag.name,
    }));

    setTags(tags);
  };

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

  const toggleMenu = (noteId: number) => {
    setOpenMenus((prev) => ({
      ...prev,
      [noteId]: !prev[noteId],
    }));
  };

  const handleAddNoteTag = async (noteId: number) => {
    if (tags.length === 0) {
      alert("No tags available.");
      return;
    }

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
        fetchNotes();
      }

      setOpenMenus((prev) => ({ ...prev, [noteId]: false }));
    } catch (err) {
      console.error("Unexpected error in handleAddNoteTag:", err);
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

  // Delete a tag from the global tag list
  const handleDeleteTag = async (tagId: number) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) {
      return;
    }
    const { error } = await supabase.from("tags").delete().eq("id", tagId);
    if (error) {
      console.error("Error deleting tag:", error);
      alert("Failed to delete tag.");
    } else {
      fetchTags();
      fetchNotes();
      if (activeTag?.id === tagId) setActiveTag(null);
    }
  };

  // Delete a tag from a note by removing its linking record
  const handleDeleteNoteTag = async (noteId: number, tagId: number) => {
    if (!window.confirm("Are you sure you want to remove this tag from the note?")) {
      return;
    }
    const { error } = await supabase
      .from("notes_tags")
      .delete()
      .eq("note_id", noteId)
      .eq("tag_id", tagId);
    if (error) {
      console.error("Error deleting note tag:", error);
      alert("Failed to remove tag from note.");
    } else {
      fetchNotes();
    }
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
    <div className="flex w-full h-screen bg-white/40">
      {/* Sidebar Component */}
      <Sidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        notes={notes}
        showFavorites={showFavorites}
        setShowFavorites={setShowFavorites}
      />

      {/* Main Content */}
      <div
        className={`
          flex-1 flex flex-col transition-all ease-in duration-400
          ${showSidebar ? "md:ml-64" : "md:ml-20"}
        `}
      >
        {/* Sticky Header for Dashboard Title & Global Controls */}
        <header className="sticky pt-30 top-0 px-12 shadow-lg z-30 bg-gray-100/90 border-b border-gray-200 p-4">
          <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {tags.map((tag: Tag) => (
                <span
                  key={tag.id}
                  onClick={() =>
                    setActiveTag(activeTag?.id === tag.id ? null : tag)
                  }
                  className={`cursor-pointer inline-flex items-center px-3 py-1 rounded-full ${
                    activeTag?.id === tag.id
                      ? "bg-black text-white"
                      : "bg-white border-[1.5px] text-black"
                  }`}
                >
                  {tag.name}
                  {activeTag?.id === tag.id && (
                    <FiTrash2
                      className="ml-2 hover:text-red-500"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTag(tag.id);
                      }}
                    />
                  )}
                </span>
              ))}
              <button
                className="bg-black text-white px-4 py-1.5 rounded-full hover:bg-gray-800"
                onClick={handleAddTag}
              >
                + New
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <GrSearch size={24} />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border-2 border-black/20 px-3 py-2 rounded-full focus:outline-none"
              />
            </div>
          </div>
        </header>

        {/* Scrollable Notes Area */}
        <main className="flex-1 p-12 overflow-auto">
          {isModalOpen && (
            <div className="fixed inset-0 bg-black-100 bg-transparent backdrop-blur-md flex items-center justify-center z-100">
              <div className="bg-gray-50 rounded-lg shadow-lg p-6 w-96">
                {modalStep === "enterName" ? (
                  <>
                    <h2 className="text-lg font-bold mb-4">
                      Enter a Name for Your Note
                    </h2>
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
                        setModalStep("selectOption");
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
          <div
            className="bg-white/30 p-4 rounded-lg border-[1.5px] shadow mb-4 flex items-center justify-center cursor-pointer hover:shadow-lg hover:bg-white/60 hover:-translate-y-0.5 transition-all duration-200"
          >
            <button className="text-3xl tracking-wider py-6 font-semibold" onClick={openModal}>
              + New Note
            </button>
          </div>
          {/* Notes Title and List */}
          <div className="space-y-4">
            {filteredNotes.map((note: Note) => {
              if (showFavorites && !note.favorite) return null;
              return (
                <div key={note.id} className="relative">
                  <Link
                    to={`/note/${note.id}`}
                    className="cursor-pointer p-4 block bg-white/30 rounded-lg border-[1.5px] shadow mb-4 relative hover:shadow-lg hover:bg-white/60 hover:-translate-y-0.5 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{note.title}</div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {note.content.length <= 397
                        ? note.content
                        : note.content.substring(0, 397) + "..."}
                    </p>
                    <div className="mt-2 flex space-x-2">
                      {note.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 rounded-full bg-white border-[1.5px] text-black text-xs"
                        >
                          {tag.name}
                          <FiTrash2
                            className="ml-1 hover:text-red-500 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNoteTag(note.id, tag.id);
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  </Link>
                  <div className="absolute top-2 right-2">
                    <button
                      className="text-gray-500 hover:text-gray-700 px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleMenu(note.id);
                      }}
                    >
                      <span className="text-xl font-bold">...</span>
                    </button>
                    {openMenus[note.id] && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border border-gray-200 rounded shadow-md z-10">
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-black/15 hover:cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddNoteTag(note.id);
                          }}
                        >
                          Add Tag
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-black/15 hover:cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFavorite(note.id);
                          }}
                        >
                          {note.favorite ? "Unfavorite" : "Favorite"}
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-black/15 hover:cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(note.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
