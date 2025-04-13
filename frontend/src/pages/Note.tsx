import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Groq from "groq-sdk";
import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";
import Sidebar, { Note as SidebarNote, Tag } from "@/components/ui/Sidebar";


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

  // State for the sidebar notes (all owned notes)
  const [sidebarNotes, setSidebarNotes] = useState<SidebarNote[]>([]);

  // Sidebar UI state
  const [showSidebar, setShowSidebar] = useState<boolean>(true);
  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  // New state for editing the note title
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [editedName, setEditedName] = useState<string>("");

  // Formatting and styling state
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  // IMPORTANT: For OpenDyslexic to work correctly, set the family to exactly "OpenDyslexic"
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

  const [presets, setPresets] = useState<Preset[]>([]);

  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  // --------------------------
  // Sidebar Notes Fetch Logic
  // --------------------------
  const fetchSidebarNotes = async () => {
    if (!pid) return;
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
      console.error("Error fetching notes for sidebar:", error);
      return;
    }

    const notesWithTags: SidebarNote[] = data.map((n: any) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      favorite: n.favorite,
      tags: n.notes_tags.map((nt: any) => nt.tag),
    }));

    setSidebarNotes(notesWithTags);
  };

  useEffect(() => {
    if (pid) {
      fetchSidebarNotes();
    }
  }, [pid]);

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
  // Inject external font links for Google Fonts (for Atkinson Hyperlegible and Open Sans)
  useEffect(() => {
    const linkPreconnect1 = document.createElement("link");
    linkPreconnect1.rel = "preconnect";
    linkPreconnect1.href = "https://fonts.googleapis.com";
    document.head.appendChild(linkPreconnect1);

    const linkPreconnect2 = document.createElement("link");
    linkPreconnect2.rel = "preconnect";
    linkPreconnect2.href = "https://fonts.gstatic.com";
    linkPreconnect2.crossOrigin = "";
    document.head.appendChild(linkPreconnect2);

    const linkFonts = document.createElement("link");
    linkFonts.rel = "stylesheet";
    linkFonts.href =
      "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible&family=Open+Sans&display=swap";
    document.head.appendChild(linkFonts);

    return () => {
      document.head.removeChild(linkPreconnect1);
      document.head.removeChild(linkPreconnect2);
      document.head.removeChild(linkFonts);
    };
  }, []);

  // Inject multiple @font-face rules for OpenDyslexic, including Regular, Bold, Italic, and Bold Italic variants.
  // Make sure these files exist at the specified paths in your public folder.
  useEffect(() => {
    const styleEl = document.createElement("style");
    styleEl.innerHTML = `
      /* OpenDyslexic Regular */
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('/fonts/OpenDyslexic-Regular.woff2') format('woff2'),
             url('/fonts/OpenDyslexic-Regular.woff') format('woff');
        font-weight: 400;
        font-style: normal;
        font-display: swap;
      }
      /* OpenDyslexic Bold */
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('/fonts/OpenDyslexic-Bold.woff2') format('woff2'),
             url('/fonts/OpenDyslexic-Bold.woff') format('woff');
        font-weight: 700;
        font-style: normal;
        font-display: swap;
      }
      /* OpenDyslexic Italic */
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('/fonts/OpenDyslexic-Italic.woff2') format('woff2'),
             url('/fonts/OpenDyslexic-Italic.woff') format('woff');
        font-weight: 400;
        font-style: italic;
        font-display: swap;
      }
      /* OpenDyslexic Bold Italic */
      @font-face {
        font-family: 'OpenDyslexic';
        src: url('/fonts/OpenDyslexic-BoldItalic.woff2') format('woff2'),
             url('/fonts/OpenDyslexic-BoldItalic.woff') format('woff');
        font-weight: 700;
        font-style: italic;
        font-display: swap;
      }
    `;
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Fetch note data from Supabase based on URL ID.\
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
        // Initialize editedName with the fetched note name
        setEditedName(data.name);
      }
    }
    fetchNoteContent();
  }, [location, navigate, presets, pid]);

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
    fontFamily, // Make sure this value is exactly "OpenDyslexic" when you want to use that font.
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
    <div className="flex w-full h-screen bg-white/40">
      {/* Sidebar */}
      <Sidebar
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        notes={sidebarNotes}
        showFavorites={showFavorites}
        setShowFavorites={setShowFavorites}
      />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all ease-in duration-400 ${showSidebar ? "md:ml-64" : "md:ml-20"}`}>
        <div className="p-4">
          {note && (
            <>
              <h2 className="mt-24 text-xl font-semibold text-center">{note.name}</h2>
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
                  {/* IMPORTANT: OpenDyslexic option now sets value exactly to "OpenDyslexic" */}
                  <option value="OpenDyslexic">OpenDyslexic</option>
                  <option value="Arial, sans-serif">Arial</option>
                  <option value="'Comic Sans MS', cursive">Comic Sans</option>
                  <option value="'Helvetica, Arial, sans-serif'">Helvetica</option>
                  <option value="'Courier New', monospace">Courier</option>
                  <option value="Verdana, sans-serif">Verdana</option>
                  <option value="'Calibri', sans-serif">Calibri</option>
                  <option value="'Atkinson Hyperlegible', sans-serif">Atkinson Hyperlegible</option>
                  <option value="'Century Gothic', sans-serif">Century Gothic</option>
                  <option value="'Open Sans', sans-serif">Open Sans</option>
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

          {/* Note Content Display / Editing Area */}
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
      </div>
    </div>
  );
};

export default Note;
