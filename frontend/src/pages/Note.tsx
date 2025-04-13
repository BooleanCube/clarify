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

interface Preset {
  name: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  alignment: "left" | "center" | "right" | "justify";
  chunkSize: number;
}

const Note: React.FC = () => {
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

  const [presets, setPresets] = useState<Preset[]>([
    {
      name: "Default",
      fontSize: 16,
      lineHeight: 1.5,
      letterSpacing: 0,
      textColor: "#000000",
      backgroundColor: "#ffffff",
      fontFamily: "Garamond",
      isBold: false,
      isItalic: false,
      isUnderline: false,
      alignment: "left",
      chunkSize: 30,
    },
    {
      name: "High Contrast",
      fontSize: 18,
      lineHeight: 1.6,
      letterSpacing: 1,
      textColor: "#ffffff",
      backgroundColor: "#000000",
      fontFamily: "Arial, sans-serif",
      isBold: true,
      isItalic: false,
      isUnderline: false,
      alignment: "justify",
      chunkSize: 40,
    },
  ]); // Dummy preset data

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);

    const selectedPresetData = presets.find((p) => p.name === presetName);

    if (selectedPresetData) {
      setFontSize(selectedPresetData.fontSize);
      setLineHeight(selectedPresetData.lineHeight);
      setLetterSpacing(selectedPresetData.letterSpacing);
      setTextColor(selectedPresetData.textColor);
      setBackgroundColor(selectedPresetData.backgroundColor);
      setFontFamily(selectedPresetData.fontFamily);
      setIsBold(selectedPresetData.isBold);
      setIsItalic(selectedPresetData.isItalic);
      setIsUnderline(selectedPresetData.isUnderline);
      setAlignment(selectedPresetData.alignment);
      setChunkSize(selectedPresetData.chunkSize);
    }
  };

  const handleSavedPreset = () => {
    const presetName = window.prompt("Enter preset name:");
    if (presetName) {
      const newPreset: Preset = {
        name: presetName,
        fontSize: fontSize,
        lineHeight: lineHeight,
        letterSpacing: letterSpacing,
        textColor: textColor,
        backgroundColor: backgroundColor,
        fontFamily: fontFamily,
        isBold: isBold,
        isItalic: isItalic,
        isUnderline: isUnderline,
        alignment: alignment,
        chunkSize: chunkSize,
      };

      setPresets([...presets, newPreset]);
      alert(`Preset "${presetName}" saved!`);
    }
  };

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
      }
    }

    fetchNoteContent();
  }, [location, navigate]);

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
      const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY; //
      if (!apiKey) {
        console.error("Google Cloud TTS API key not found in environment variables.");
        setLoadingAudio(false);
        return;
      }
  
      const response = await fetch(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: { text: text },
            voice: { languageCode: "fil-PH", name: "fil-ph-Neural2-A" }, // 
            audioConfig: { audioEncoding: "MP3" },
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error from Google Cloud TTS API:", errorData);
        setLoadingAudio(false);
        return;
      }
  
      const data = await response.json();
      console.log("Google Cloud TTS response:", data);
  
      if (data.audioContent) {
        const audioBlob = new Blob(
          [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
          { type: "audio/mp3" }
        );
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      } else {
        console.error("No audio content received from Google Cloud TTS.");
      }
    } catch (error) {
      console.error("Error calling Google Cloud TTS API:", error);
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
            <div className="relative">
                <select
                    value={selectedPreset || ""}
                    onChange={handlePresetChange}
                    className="text-sm border rounded px-2 py-1"
                >
                  <option value="" disabled>
                      Load Preset
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
                                            fontSize: fontSize,
                                            lineHeight: lineHeight,
                                            letterSpacing: letterSpacing,
                                            textColor: textColor,
                                            backgroundColor: backgroundColor,
                                            fontFamily: fontFamily,
                                            isBold: isBold,
                                            isItalic: isItalic,
                                            isUnderline: isUnderline,
                                            alignment: alignment,
                                            chunkSize: chunkSize,
                                        };

                                        setPresets([...presets, newPreset]);
                                        setSelectedPreset(null); // Reset dropdown
                                        alert(`Preset "${presetName}" saved!`);
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
