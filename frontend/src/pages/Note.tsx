import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import Groq from "groq-sdk";
import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true,
});

interface NoteProps {
  id: number;
  name: string;
  content: string;
  favorite: boolean;
  preset_id: number;
}

interface Preset {
  id?: number,
  name: string;
  font_size: number;
  line_height: number;
  letter_spacing: number;
  text_color: string;
  background_color: string;
  font_family: string;
  font_bold: boolean;
  font_italic: boolean;
  font_underline: boolean;
  alignment: "left" | "center" | "right" | "justify";
  chunk_size: number;
  profile_id: string | undefined;
}

const Note: React.FC = () => {
  const { session } = useAuth();
  const pid = session?.user.id;

  const navigate = useNavigate();
  const location = useLocation();

  const [note, setNote] = useState<NoteProps | null>(null);

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

  // Editing state for a single chunk (instead of whole note)
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedChunk, setEditedChunk] = useState<string>("");

  const [presets, setPresets] = useState<Preset[]>([]);

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const setPresetData = async (selectedPresetData: Preset) => {
    if (selectedPresetData) {
      setFontSize(selectedPresetData.font_size);
      setLineHeight(selectedPresetData.line_height);
      setLetterSpacing(selectedPresetData.letter_spacing);
      setTextColor(selectedPresetData.text_color);
      setBackgroundColor(selectedPresetData.background_color);
      setFontFamily(selectedPresetData.font_family);
      setIsBold(selectedPresetData.font_bold);
      setIsItalic(selectedPresetData.font_italic);
      setIsUnderline(selectedPresetData.font_underline);
      setAlignment(selectedPresetData.alignment);
      setChunkSize(selectedPresetData.chunk_size);

      if (selectedPresetData?.id) {
        const { data, error } = await supabase
          .from("notes")
          .update({ preset_id: selectedPresetData.id })
          .eq("id", note?.id);
      
        if (error) {
          console.error("Error updating preset id:", error);
        } else {
          console.log("Preset id updated:", data);
        }
      }
    }
  }

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);

    const selectedPresetData = presets.find((p: Preset) => p.name === presetName);

    if(selectedPresetData) await setPresetData(selectedPresetData)
  };

  useEffect(() => {
    async function fetchPresets() {
      if (!pid) return;
      const { data, error } = await supabase
        .from("presets")
        .select("*")
        .eq("profile_id", pid);
      if (error) {
        console.error("Error fetching presets:", error);
      } else if (data) {
        setPresets(data);
      }
    }
    
    fetchPresets();
  }, [pid]);

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

        const selectedPresetData = presets.find((p: Preset) => p.id === data.preset_id);
        if(selectedPresetData) setPresetData(selectedPresetData);
      }
    }

    fetchNoteContent();
  }, [location, navigate, presets, pid]);

  // Split note content into chunks whenever note content or chunkSize changes.
  // We do not include any state from editing mode so that the chunks always reflect the saved note.
  useEffect(() => {
    if (note) {
      const parts = note.content.match(/(\S+\s*)/g);
      if (parts) {
        const newChunks: string[] = [];
        for (let i = 0; i < parts.length; i += chunkSize) {
          newChunks.push(parts.slice(i, i + chunkSize).join(""));
        }
        setChunks(newChunks);
        // Ensure currentChunkIndex is valid
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

  const handleSavePreset = async (current: Preset) => {
    const { data, error } = await supabase
      .from("presets")
      .insert([current]);
  
    if (error) {
      console.log("Error inserting preset:", error);
    } else if (data) {
      // Append the newly inserted preset (data[0]) to the current presets.
      setPresets((prev) => [...prev, data[0]]);
    }
    return data;
  };
  

  // When the user clicks Edit, start editing the current chunk only.
  const handleEditChunk = () => {
    if (chunks[currentChunkIndex] !== undefined) {
      setIsEditing(true);
      setEditedChunk(chunks[currentChunkIndex]);
    }
  };

  // Save the edited chunk by merging it into the full note content and updating Supabase.
  const handleSaveChunk = async () => {
    if (!note) return;
    // Replace the current chunk with the edited text.
    const updatedChunks = [...chunks];
    updatedChunks[currentChunkIndex] = editedChunk;
    // Reassemble full note content.
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
    // Update the local note state with new content.
    setNote({ ...note, content: newContent });
    setChunks(updatedChunks);
    setIsEditing(false);
  };

  // Cancel chunk editing
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedChunk("");
  };

  // Define styling for the note/text preview area.
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
          <h2 className="mt-24 text-xl font-semibold text-center">{note.name}</h2>

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
            {/* Font Family Dropdown */}
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

            {/* Font Size Controls */}
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

            {/* Separator */}
            <span className="text-gray-400">•</span>

            {/* Bold, Italic, Underline */}
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

            {/* Separator */}
            <span className="text-gray-400">•</span>

            {/* Text Color Picker */}
            <div className="flex items-center space-x-1" title="Text Color">
              <span className="text-sm font-semibold">A</span>
              <input
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                className="border rounded p-1 w-6 h-6 cursor-pointer"
              />
            </div>

            {/* Background Color Picker */}
            <div className="flex items-center space-x-1" title="Background Color">
              <i className="fas fa-fill-drip text-sm" />
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="border rounded p-1 w-6 h-6 cursor-pointer"
              />
            </div>

            {/* Separator */}
            <span className="text-gray-400">•</span>

            {/* Line Height Controls */}
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

            {/* Letter Spacing Controls */}
            <div className="flex items-center space-x-1" title="Letter Spacing">
              <i className="fas fa-text-width text-sm" />
              <input
                type="number"
                className="w-14 text-sm border rounded px-1 py-0.5 text-center"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
              />
            </div>

            {/* Separator */}
            <span className="text-gray-400">•</span>

            {/* Alignment Controls */}
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

            {/* Separator */}
            <span className="text-gray-400">•</span>

            {/* Chunk Size Controls */}
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

            {/* Separator */}       
            <span className="text-gray-400">•</span>

            <div className="relative">
                <select
                    value={selectedPreset || ""}
                    onChange={handlePresetChange}
                    className="text-sm border rounded px-2 py-1"
                >
                  <option value="" disabled>
                      Default
                  </option>
                    {presets.map((preset) => (
                        <option key={preset.name} value={preset.name}>
                            {preset.name}
                        </option>
                    ))}
                  <option value="save-current">Save Current Settings as Preset</option>
                </select>

                {/* Save Current Preset Logic */}
                {selectedPreset === "save-current" && (
                    <div className="absolute top-full mt-2 bg-white border rounded shadow-md p-4 z-10">
                        <p className="text-sm mb-2">Enter a name for your preset:</p>
                        <input
                            type="text"
                            className="border rounded px-2 py-1 w-full text-sm"
                            placeholder="Preset Name"
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    const presetName = (e.target as HTMLInputElement).value.trim();
                                    if (presetName) {
                                        const newPreset: Preset = {
                                            name: presetName,
                                            font_size: fontSize,
                                            line_height: lineHeight,
                                            letter_spacing: letterSpacing,
                                            text_color: textColor,
                                            background_color: backgroundColor,
                                            font_family: fontFamily,
                                            font_bold: isBold,
                                            font_italic: isItalic,
                                            font_underline: isUnderline,
                                            alignment: alignment,
                                            chunk_size: chunkSize,
                                            profile_id: pid,
                                        };

                                        handleSavePreset(newPreset)
                                        setSelectedPreset(null); // Reset dropdown
                                    } else {
                                        alert("Please enter a valid preset name.");
                                    }
                                }
                            }}
                        />
                    </div>
                )}
            </div>
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

      {/* Pagination and audio generation controls */}
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
