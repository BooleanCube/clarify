import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Groq from "groq-sdk";
import supabase from "@/supabase-client";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

interface NoteProps {
  id: number;
  name: string;
  content: string;
  favorite: boolean;
}

const Note: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [note, setNote] = useState<NoteProps | null>(null);

  // New state for editing the note title
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>("");

  // Formatting and styling state
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [fontFamily, setFontFamily] = useState<string>("Garamond");

  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);

  const [alignment, setAlignment] = useState<"left" | "center" | "right" | "justify">("left");

  // Chunking and audio generation states
  const [chunkSize, setChunkSize] = useState<number>(30);
  const [chunks, setChunks] = useState<string[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingAudio, setLoadingAudio] = useState<boolean>(false);

  // Editing state for a single chunk (instead of the whole note)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedChunk, setEditedChunk] = useState<string>("");

  // Fetch note data from Supabase based on URL ID
  useEffect(() => {
    async function fetchNoteContent() {
      let path = location.pathname;
      if (path.at(path.length - 1) === "/") path = path.slice(0, -1);
      const idStr = path.substring(path.lastIndexOf("/") + 1);

      if (idStr.trim() === "") {
        navigate("/dashboard");
        return;
      }

      const id = Number(idStr.trimEnd());
      if (!Number.isInteger(id) || isNaN(id)) {
        navigate("/dashboard");
        return;
      }

      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching note content:", error);
        alert(error.message);
      } else if (data) {
        setNote(data);
        // Initialize editedName with the fetched note name
        setEditedName(data.name);
      }
    }

    fetchNoteContent();
  }, [location, navigate]);

  // Split note content into chunks based on the saved note (editing mode does not affect chunk splitting)
  useEffect(() => {
    if (note) {
      const parts = note.content.match(/(\S+\s*)/g);
      if (parts) {
        const newChunks: string[] = [];
        for (let i = 0; i < parts.length; i += chunkSize) {
          newChunks.push(parts.slice(i, i + chunkSize).join(""));
        }
        setChunks(newChunks);
        if (currentChunkIndex >= newChunks.length) {
          setCurrentChunkIndex(0);
        }
      }
    }
  }, [note, chunkSize, currentChunkIndex]);

  const handlePrevChunk = () => {
    if (currentChunkIndex > 0 && !isEditing) {
      setCurrentChunkIndex((idx) => idx - 1);
    }
  };

  const handleNextChunk = () => {
    if (currentChunkIndex < chunks.length - 1 && !isEditing) {
      setCurrentChunkIndex((idx) => idx + 1);
    }
  };

  const generateAudio = async (text: string) => {
    setLoadingAudio(true);
    try {
      const response = await groq.audio.speech.create({
        model: "playai-tts",
        voice: "Fritz-PlayAI",
        input: text,
        response_format: "wav",
      });
      const arrayBuffer = await response.arrayBuffer();
      const blob = new Blob([new Uint8Array(arrayBuffer)], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (error) {
      console.error("Error generating audio:", error);
    } finally {
      setLoadingAudio(false);
    }
  };

  const handleGenerateAudio = () => {
    if (chunks[currentChunkIndex]) {
      generateAudio(chunks[currentChunkIndex]);
    } else {
      alert("No text to generate audio for.");
    }
  };

  // Save Preset (stub function)
  const handleSavePreset = () => {
    alert("Preset saved! (This is a stub function.)");
  };

  // Chunk editing functions
  const handleEditChunk = () => {
    if (chunks[currentChunkIndex] !== undefined) {
      setIsEditing(true);
      setEditedChunk(chunks[currentChunkIndex]);
    }
  };

  const handleSaveChunk = async () => {
    if (!note) return;
    const updatedChunks = [...chunks];
    updatedChunks[currentChunkIndex] = editedChunk;
    const newContent = updatedChunks.join("");
    const { error } = await supabase
      .from("notes")
      .update({ content: newContent })
      .eq("id", note.id);
    if (error) {
      console.error("Error updating note content:", error);
      alert("Failed to save note.");
      return;
    }
    setNote({ ...note, content: newContent });
    setChunks(updatedChunks);
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedChunk("");
  };

  // Note title editing functions
  const handleSaveName = async () => {
    if (!note) return;
    const { error } = await supabase
      .from("notes")
      .update({ name: editedName })
      .eq("id", note.id);
    if (error) {
      console.error("Error updating note name:", error);
      alert("Failed to save note name.");
      return;
    }
    setNote({ ...note, name: editedName });
    setIsEditingName(false);
  };

  const handleCancelNameEdit = () => {
    if (note) {
      setEditedName(note.name);
    }
    setIsEditingName(false);
  };

  // Define styling for the note/text preview area
  const textChunkStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    letterSpacing: `${letterSpacing}px`,
    color: textColor,
    backgroundColor: backgroundColor,
    fontFamily,
    textAlign: alignment,
    width: "100%",
    height: "300px",
    overflow: "auto",
    wordWrap: "break-word",
    fontWeight: isBold ? 700 : 400,
    fontStyle: isItalic ? "italic" : "normal",
    textDecoration: isUnderline ? "underline" : "none",
  };

  return (
    <div className="p-4">
      {note && (
        <>
          {/* Note title area with edit functionality */}
          <div className="mt-24 text-center">
            {isEditingName ? (
              <div className="flex flex-col items-center gap-2">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="text-xl font-semibold text-center border border-gray-300 rounded px-2 py-1"
                />
                <div className="space-x-2">
                  <button
                    onClick={handleSaveName}
                    className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                  >
                    Save Title
                  </button>
                  <button
                    onClick={handleCancelNameEdit}
                    className="bg-gray-300 text-black px-4 py-1 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center gap-4">
                <h2 className="text-xl font-semibold">{note.name}</h2>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                >
                  Edit Title
                </button>
              </div>
            )}
          </div>

          {/* Chunk editing controls */}
          <div className="mt-2 text-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSaveChunk}
                  className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
                >
                  Save Chunk
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="bg-gray-300 text-black px-4 py-1 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleEditChunk}
                className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
              >
                Edit Chunk
              </button>
            )}
          </div>

          {/* Toolbar with formatting controls */}
          <div className="mt-6 flex flex-wrap items-center gap-3 bg-gray-100 p-2 rounded justify-center">
            <select
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="Helvetica, sans-serif">Helvetica</option>
              <option value="Courier, monospace">Courier</option>
              <option value="Arial, sans-serif">Arial</option>
              <option value="Verdana, sans-serif">Verdana</option>
              <option value="'CMU Serif', serif">CMU Serif</option>
              <option value="'OpenDyslexic', sans-serif">OpenDyslexic</option>
              <option value="Roboto, sans-serif">Roboto</option>
              <option value="Lato, sans-serif">Lato</option>
              <option value="'Tiresias', sans-serif">Tiresias</option>
            </select>
            <div className="flex items-center space-x-1">
              <input
                type="number"
                className="w-14 text-sm border rounded px-1 py-0.5 text-center"
                min={8}
                max={72}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <span className="text-gray-400">•</span>
            <button
              onClick={() => setIsBold(!isBold)}
              className={`text-sm border rounded px-2 py-1 ${isBold ? "bg-blue-100 font-bold" : ""}`}
              title="Bold"
            >
              B
            </button>
            <button
              onClick={() => setIsItalic(!isItalic)}
              className={`text-sm border rounded px-2 py-1 ${isItalic ? "bg-blue-100 italic" : ""}`}
              title="Italic"
            >
              I
            </button>
            <button
              onClick={() => setIsUnderline(!isUnderline)}
              className={`text-sm border rounded px-2 py-1 ${isUnderline ? "bg-blue-100 underline" : ""}`}
              title="Underline"
            >
              U
            </button>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1" title="Text Color">
              <span className="text-sm font-semibold">A</span>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="border rounded p-1 w-6 h-6 cursor-pointer"
              />
            </div>
            <div className="flex items-center space-x-1" title="Background Color">
              <i className="fas fa-fill-drip text-sm" />
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="border rounded p-1 w-6 h-6 cursor-pointer"
              />
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1" title="Line Height">
              <i className="fas fa-text-height text-sm" />
              <input
                type="number"
                className="w-14 text-sm border rounded px-1 py-0.5 text-center"
                min={1}
                max={3}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
              />
            </div>
            <div className="flex items-center space-x-1" title="Letter Spacing">
              <i className="fas fa-text-width text-sm" />
              <input
                type="number"
                className="w-14 text-sm border rounded px-1 py-0.5 text-center"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
              />
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setAlignment("left")}
                className={`text-sm border rounded px-2 py-1 ${alignment === "left" ? "bg-blue-100" : ""}`}
                title="Align Left"
              >
                <i className="fas fa-align-left" />
              </button>
              <button
                onClick={() => setAlignment("center")}
                className={`text-sm border rounded px-2 py-1 ${alignment === "center" ? "bg-blue-100" : ""}`}
                title="Align Center"
              >
                <i className="fas fa-align-center" />
              </button>
              <button
                onClick={() => setAlignment("right")}
                className={`text-sm border rounded px-2 py-1 ${alignment === "right" ? "bg-blue-100" : ""}`}
                title="Align Right"
              >
                <i className="fas fa-align-right" />
              </button>
              <button
                onClick={() => setAlignment("justify")}
                className={`text-sm border rounded px-2 py-1 ${alignment === "justify" ? "bg-blue-100" : ""}`}
                title="Justify"
              >
                <i className="fas fa-align-justify" />
              </button>
            </div>
            <span className="text-gray-400">•</span>
            <div className="flex items-center space-x-1" title="Chunk Size">
              <input
                type="number"
                className="w-14 text-sm border rounded px-1 py-0.5 text-center"
                min={1}
                max={999}
                value={chunkSize}
                onChange={(e) => setChunkSize(Number(e.target.value))}
              />
              <span className="text-sm">words</span>
            </div>
            <span className="text-gray-400">•</span>
            <button
              onClick={handleSavePreset}
              className="bg-blue-500 text-white px-2 py-1 rounded text-sm flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span>Save Preset</span>
            </button>
          </div>
        </>
      )}

      {/* Note content display / editing area */}
      {isEditing ? (
        <textarea
          value={editedChunk}
          onChange={(e) => setEditedChunk(e.target.value)}
          style={textChunkStyle}
          className="w-full h-64 p-4 border border-gray-300 rounded-lg mt-6"
        />
      ) : (
        <div
          className="text-gray-700 whitespace-pre-wrap text-start border border-gray-300 p-4 rounded-lg mt-6"
          style={textChunkStyle}
        >
          {chunks[currentChunkIndex]}
        </div>
      )}

      {chunks.length > 0 && (
        <div className="mt-6">
          <div className="text-center mt-4 text-sm text-gray-600">
            Page {currentChunkIndex + 1} of {chunks.length}
          </div>
          <div className="flex justify-between mt-4">
            <button
              onClick={handlePrevChunk}
              disabled={isEditing || currentChunkIndex === 0}
              className={`py-2 px-4 rounded-lg ${
                currentChunkIndex === 0 || isEditing
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNextChunk}
              disabled={isEditing || currentChunkIndex === chunks.length - 1}
              className={`py-2 px-4 rounded-lg ${
                currentChunkIndex === chunks.length - 1 || isEditing
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Next
            </button>
          </div>

          <div className="mt-4">
            <button
              onClick={handleGenerateAudio}
              disabled={loadingAudio}
              className="w-full py-2 px-4 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              {loadingAudio ? "Generating Audio..." : "Generate Audio"}
            </button>
            {audioUrl && (
              <div className="mt-4">
                <audio controls src={audioUrl} className="w-full">
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Note;
