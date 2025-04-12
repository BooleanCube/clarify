import React, { useState } from "react";

interface Note {
  id: number;
  title: string;
  content: string;
  labels: string[];
  favorite: boolean;
}

const initialNotes: Note[] = [
  {
    id: 1,
    title: "Note 1",
    content: "The first 20 words of Note 1...",
    labels: ["Label 1", "Label 2"],
    favorite: false,
  },
  {
    id: 2,
    title: "Note 2",
    content: "Some content for Note 2...",
    labels: ["Label 1"],
    favorite: false,
  },
  {
    id: 3,
    title: "Work",
    content: "Work note content goes here...",
    labels: ["Work"],
    favorite: false,
  },
  {
    id: 4,
    title: "School",
    content: "School note content goes here...",
    labels: ["School"],
    favorite: false,
  },
];

const Dashboard: React.FC = () => {
  // State for notes so they can be updated
  const [notesData, setNotesData] = useState<Note[]>(initialNotes);
  // Available labels for filtering
  const [availableLabels, setAvailableLabels] = useState<string[]>([
    "Label 1",
    "Label 2",
    "Work",
    "School",
  ]);
  // State for active label filter and search term
  const [activeLabel, setActiveLabel] = useState<string | null>(null);
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

  // Handle adding a new tag to a note (via note dropdown)
  const handleAddTag = (noteId: number) => {
    const newTag = window.prompt("Enter new tag:");
    if (newTag && newTag.trim() !== "") {
      const trimmedTag = newTag.trim();
      setNotesData((prevNotes) =>
        prevNotes.map((note) =>
          note.id === noteId && !note.labels.includes(trimmedTag)
            ? { ...note, labels: [...note.labels, trimmedTag] }
            : note
        )
      );
      if (!availableLabels.includes(trimmedTag)) {
        setAvailableLabels((prev) => [...prev, trimmedTag]);
      }
      setOpenMenus((prev) => ({ ...prev, [noteId]: false }));
    }
  };

  // Handle adding a new global tag for filtering (via global "+ New" button)
  const handleAddGlobalTag = () => {
    const newTag = window.prompt("Enter new tag:");
    if (newTag && newTag.trim() !== "") {
      const trimmedTag = newTag.trim();
      if (!availableLabels.includes(trimmedTag)) {
        setAvailableLabels((prev) => [...prev, trimmedTag]);
      }
    }
  };

  // Handle deleting a note
  const handleDelete = (noteId: number) => {
    setNotesData((prev) => prev.filter((note) => note.id !== noteId));
  };

  // Handle toggling favorite status on a note
  const handleFavorite = (noteId: number) => {
    setNotesData((prev) =>
      prev.map((note) =>
        note.id === noteId ? { ...note, favorite: !note.favorite } : note
      )
    );
    setOpenMenus((prev) => ({ ...prev, [noteId]: false }));
  };

  // Compute filtered notes based on active label and search term.
  const filteredNotes = notesData.filter((note) => {
    const matchesLabel = activeLabel ? note.labels.includes(activeLabel) : true;
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch =
      note.title.toLowerCase().includes(lowerSearch) ||
      note.content.toLowerCase().includes(lowerSearch);
    return matchesLabel && matchesSearch;
  });

  // For main dashboard content: if "showFavorites" is true, show only favorites.
  const mainFilteredNotes = filteredNotes.filter((note) =>
    showFavorites ? note.favorite : true
  );

  // For the left sidebar: if "showFavorites" is true, show only favorites.
  const sidebarNotes = showFavorites
    ? notesData.filter((note) => note.favorite)
    : notesData;

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
              {sidebarNotes.map((note) => (
                <button
                  key={note.id}
                  className="w-full text-left px-4 py-2 rounded hover:bg-gray-200"
                >
                  {note.title}
                </button>
              ))}
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
              {availableLabels.map((label) => (
                <span
                  key={label}
                  className={`cursor-pointer inline-block bg-gray-200 text-blue-700 px-3 py-1 rounded ${
                    activeLabel === label ? "bg-blue-700 text-white" : ""
                  }`}
                  onClick={() =>
                    setActiveLabel(activeLabel === label ? null : label)
                  }
                >
                  {label}
                </span>
              ))}
            </div>
            {/* Right: Global "+ New" Button for tags & Search Input */}
            <div className="flex items-center space-x-2">
              <button
                className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
                onClick={handleAddGlobalTag}
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
          <div className="bg-white rounded shadow p-6 mb-4 flex justify-center items-center text-xl font-semibold text-gray-700">
            + New
          </div>
          {/* Render filtered notes for main content */}
          <div className="space-y-4">
            {mainFilteredNotes.map((note) => (
              <div key={note.id} className="bg-white p-4 rounded shadow relative">
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
                          onClick={() => handleAddTag(note.id)}
                        >
                          Add Tag
                        </button>
                        <button
                          className="w-full text-left px-4 py-2 hover:bg-gray-100"
                          onClick={() => handleFavorite(note.id)}
                        >
                          {note.labels.includes("Favorite")
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
                  {note.labels.map((lbl, index) => (
                    <span
                      key={index}
                      className="inline-block bg-gray-200 text-blue-700 px-2 py-1 rounded text-xs"
                    >
                      {lbl}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;