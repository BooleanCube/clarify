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
  id?: number;
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

  // Formatting and styling states
  const [fontSize, setFontSize] = useState<number>(16);
  const [lineHeight, setLineHeight] = useState<number>(1.5);
  const [letterSpacing, setLetterSpacing] = useState<number>(0);
  const [textColor, setTextColor] = useState<string>("#000000");
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff");
  const [fontFamily, setFontFamily] = useState<string>("Arial");
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

  // Editing state for chunks
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedChunk, setEditedChunk] = useState<string>("");

  // Presets
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
          .update({ "preset_id": selectedPresetData.id })
          .eq("id", note?.id);

        if (error) {
          console.error("Error updating preset id:", error);
        } else {
          console.log("Preset id updated:", data);
        }
      }
    }
  };

  const handlePresetChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetName = e.target.value;
    setSelectedPreset(presetName);

    if (presetName === "save-current") {
      // Do nothing for now, just let the preset name selection fall through
      return;
    }

    const selectedPresetData = presets.find((p: Preset) => p.name === presetName);
    if (selectedPresetData) await setPresetData(selectedPresetData);
  };

  async function fetchPresets() {
    if (!pid) return;
    const { data, error } = await supabase.from("presets").select("*").eq("profile_id", pid);
    if (error) {
      console.error("Error fetching presets:", error);
    } else if (data) {
      setPresets(data);
    }
  }

  // -- Lifecycle: Fetch presets --------------------------------------------------------
  useEffect(() => {
    fetchPresets();
  }, [pid]);

  // Save a brand-new preset
  const handleSavePreset = async (current: Preset) => {
    const { data, error } = await supabase.from("presets").insert([current]);
    if (error) {
      console.log("Error inserting preset:", error);
    } else {
      fetchPresets();
      setSelectedPreset(current.name);
      setPresetData(current);
    }
    return data;
  };

  // -- Lifecycle: Fetch note data -----------------------------------------------------
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
      const { data, error } = await supabase.from("notes").select("*").eq("id", id).single();
      if (error) {
        console.error("Error fetching note content:", error);
        alert(error.message);
      } else if (data) {
        setNote(data);
        setEditedName(data.name);

        const selectedPresetData = presets.find((p: Preset) => p.id === data.preset_id);
        if (selectedPresetData) setPresetData(selectedPresetData);
      }
    }
    fetchNoteContent();
  }, [location, navigate, presets, pid]);

  // -- Lifecycle: Load Google/OpenDyslexic fonts ---------------------------------------
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

  // Inject multiple @font-face rules for OpenDyslexic
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

  // -- Lifecycle: Re-chunk whenever note or chunk settings change ----------------------
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

  // -- Chunk navigation ----------------------------------------------------------------
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

  // -- Generate audio ------------------------------------------------------------------
  // const generateAudio = async (text: string) => {
  //   setLoadingAudio(true);
  //   try {
  //     const apiKey = import.meta.env.VITE_GOOGLE_CLOUD_TTS_API_KEY;
  //     if (!apiKey) {
  //       console.error("Google Cloud TTS API key not found in environment variables.");
  //       setLoadingAudio(false);
  //       return;
  //     }

  //     const response = await fetch(
  //       `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({
  //           input: { text: text },
  //           voice: { languageCode: "en-US", name: "en-US-Neural2-A" },
  //           audioConfig: { audioEncoding: "MP3" },
  //         }),
  //       }
  //     );

  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       console.error("Error from Google Cloud TTS API:", errorData);
  //       setLoadingAudio(false);
  //       return;
  //     }

  //     const data = await response.json();
  //     if (data.audioContent) {
  //       const audioBlob = new Blob(
  //         [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
  //         { type: "audio/mp3" }
  //       );
  //       const url = URL.createObjectURL(audioBlob);
  //       setAudioUrl(url);
  //     } else {
  //       console.error("No audio content received from Google Cloud TTS.");
  //     }
  //   } catch (error) {
  //     console.error("Error calling Google Cloud TTS API:", error);
  //   } finally {
  //     setLoadingAudio(false);
  //   }
  // };
  const generateAudio = async (text: string) => {
    console.log("Generating audio for text:", text);
    setLoadingAudio(true);
    try {
      if (!text.trim()){
        throw new Error("No text provided for audio generation.");
      }

    const response = await groq.audio.speech.create({
        model: "playai-tts",
        voice: "Fritz-PlayAI",
        input: text,
      response_format: "wav"
    });

    if (!response) {
      throw new Error("No response received from Groq API.");
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBlob = new Blob([arrayBuffer], { type: 'audio/wav' });
    const url = URL.createObjectURL(audioBlob);
    setAudioUrl(url);
    } catch (error) {
      console.error("Error calling Groq API:", error);
      alert("Failed to generate audio. Please try again later.");
    } finally {
      setLoadingAudio(false);
    }
  }

  const handleGenerateAudio = () => {
    console.log("Generating audio for current chunk:", currentChunkIndex);
    if (chunks[currentChunkIndex]) {
      generateAudio(chunks[currentChunkIndex]);
    } else {
      alert("No text to generate audio for.");
    }
  };

  // -- Editing chunks ------------------------------------------------------------------
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
    const { error } = await supabase.from("notes").update({ content: newContent }).eq("id", note.id);
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

  // -- Editing the note title ----------------------------------------------------------
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

  // -- Editor styling ------------------------------------------------------------------
  const textChunkStyle: React.CSSProperties = {
    fontSize: `${fontSize}px`,
    lineHeight: lineHeight,
    letterSpacing: `${letterSpacing}px`,
    color: textColor,
    backgroundColor: backgroundColor,
    fontFamily,
    textAlign: alignment,
    fontWeight: isBold ? 700 : 400,
    fontStyle: isItalic ? "italic" : "normal",
    textDecoration: isUnderline ? "underline" : "none",
    // Some sizing so it looks more like a text editor block
    width: "100%",
    minHeight: "250px",
    overflow: "auto",
    wordWrap: "break-word",
    padding: "1rem",
    borderRadius: "4px",
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
        <div className="max-w-5xl mx-auto mt-30 mb-12">
          <div className="note-container bg-offwhite border rounded-xl shadow-sm p-8">
            <div className="note-header flex items-center justify-between border-b border-gray-300 pb-3 mb-4">
              <div className="flex items-center gap-4">
                {isEditingName ? (
                  <>
                    <input
                      type="text"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="text-lg font-semibold border border-gray-300 rounded px-2 py-1"
                    />
                    <button
                      onClick={handleSaveName}
                      className="bg-green-900 text-white px-3 py-1 rounded-full hover:bg-green-700 cursor-pointer "
                    >
                      Save Title
                    </button>
                    <button
                      onClick={handleCancelNameEdit}
                      className="bg-none text-black border-2 px-3 py-0.5 -translate-x-1.5 rounded-full hover:bg-gray-300 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <h2 className="text-2xl font-semibold">{note?.name || "Untitled Note"}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="bg-emerald-900 text-white px-3 py-1 rounded-full hover:bg-emerald-700 cursor-pointer"
                    >
                      Edit Title
                    </button>
                  </>
                )}
              </div>

              {/* “Save Preset” handling – or you can rename to just “Save” if you like */}
              <div className="relative">
                <select
                  value={selectedPreset || ""}
                  onChange={handlePresetChange}
                  className="text-sm border rounded px-2 py-1 mr-2"
                >
                  <option value="" disabled>
                    Load a Preset
                  </option>
                  {presets.map((preset) => (
                    <option key={preset.name} value={preset.name}>
                      {preset.name}
                    </option>
                  ))}
                  <option value="save-current">Save Current as Preset</option>
                </select>

                {/* If user chooses to save the current settings as a new preset */}
                {selectedPreset === "save-current" && (
                  <div className="absolute top-full mt-2 right-0 bg-white border border-gray-300 rounded shadow-md p-4 z-10 w-52">
                    <p className="text-sm mb-2">Enter a name for your preset:</p>
                    <input
                      type="text"
                      className="border-2 rounded px-2 py-1 w-full text-sm"
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
                            handleSavePreset(newPreset);
                            setSelectedPreset(null);
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

            {/* Toolbar: font family, size, bold, italic, underline, color, alignment, chunk size */}
            <div className="note-toolbar flex flex-wrap items-center gap-2 bg-gray-100 p-2 rounded mb-4">
              {/* Font Family */}
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="text-sm border rounded px-2 py-1"
              >
                <option value="Arial, sans-serif">Arial</option>
                <option value="OpenDyslexic">OpenDyslexic</option>
                <option value="'Comic Sans MS', cursive">Comic Sans</option>
                <option value="'Helvetica, Arial, sans-serif'">Helvetica</option>
                <option value="'Courier New', monospace">Courier</option>
                <option value="Verdana, sans-serif">Verdana</option>
                <option value="'Calibri', sans-serif">Calibri</option>
                <option value="'Atkinson Hyperlegible', sans-serif">Atkinson Hyperlegible</option>
                <option value="'Century Gothic', sans-serif">Century Gothic</option>
                <option value="'Open Sans', sans-serif">Open Sans</option>
              </select>

              {/* Font Size */}
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  className="w-16 text-sm border rounded px-1 py-0.5 text-center"
                  min={8}
                  max={72}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                />
                <span className="text-xs text-gray-500">px</span>
              </div>

              {/* Bold, Italic, Underline */}
              <button
                onClick={() => setIsBold(!isBold)}
                className={`text-sm border rounded px-2 py-1 ${
                  isBold ? "bg-blue-100 font-bold" : ""
                }`}
                title="Bold"
              >
                B
              </button>
              <button
                onClick={() => setIsItalic(!isItalic)}
                className={`text-sm border rounded px-2 py-1 ${
                  isItalic ? "bg-blue-100 italic" : ""
                }`}
                title="Italic"
              >
                I
              </button>
              <button
                onClick={() => setIsUnderline(!isUnderline)}
                className={`text-sm border rounded px-2 py-1 ${
                  isUnderline ? "bg-blue-100 underline" : ""
                }`}
                title="Underline"
              >
                U
              </button>

              {/* Text Color */}
              <div className="flex items-center space-x-1" title="Text Color">
                <span className="text-sm font-semibold">A</span>
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="border rounded p-1 w-6 h-6 cursor-pointer"
                />
              </div>

              {/* Background Color */}
              <div className="flex items-center space-x-1" title="Background Color">
                <i className="fas fa-fill-drip text-sm" />
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="border rounded p-1 w-6 h-6 cursor-pointer"
                />
              </div>

              {/* Line Height */}
              <div className="flex items-center space-x-1" title="Line Height">
                <i className="fas fa-text-height text-sm" />
                <input
                  type="number"
                  className="w-16 text-sm border rounded px-1 py-0.5 text-center"
                  min={1}
                  max={3}
                  step={0.1}
                  value={lineHeight}
                  onChange={(e) => setLineHeight(Number(e.target.value))}
                />
              </div>

              {/* Letter Spacing */}
              <div className="flex items-center space-x-1" title="Letter Spacing">
                <i className="fas fa-text-width text-sm" />
                <input
                  type="number"
                  className="w-16 text-sm border rounded px-1 py-0.5 text-center"
                  value={letterSpacing}
                  onChange={(e) => setLetterSpacing(Number(e.target.value))}
                />
              </div>

              {/* Alignment */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setAlignment("left")}
                  className={`text-sm border rounded px-2 py-1 ${
                    alignment === "left" ? "bg-blue-100" : ""
                  }`}
                  title="Align Left"
                >
                  <i className="fas fa-align-left" />
                </button>
                <button
                  onClick={() => setAlignment("center")}
                  className={`text-sm border rounded px-2 py-1 ${
                    alignment === "center" ? "bg-blue-100" : ""
                  }`}
                  title="Align Center"
                >
                  <i className="fas fa-align-center" />
                </button>
                <button
                  onClick={() => setAlignment("right")}
                  className={`text-sm border rounded px-2 py-1 ${
                    alignment === "right" ? "bg-blue-100" : ""
                  }`}
                  title="Align Right"
                >
                  <i className="fas fa-align-right" />
                </button>
                <button
                  onClick={() => setAlignment("justify")}
                  className={`text-sm border rounded px-2 py-1 ${
                    alignment === "justify" ? "bg-blue-100" : ""
                  }`}
                  title="Justify"
                >
                  <i className="fas fa-align-justify" />
                </button>
              </div>

              {/* Chunk Size */}
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  className="w-16 text-sm border rounded px-1 py-0.5 text-center"
                  min={1}
                  max={999}
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                />
                <span className="text-sm">words</span>
              </div>
            </div>

            {/* Editor area (chunk display or editing) */}
            <div className="note-editor border border-gray-300 bg-white rounded mb-4">
              {isEditing ? (
                <textarea
                  value={editedChunk}
                  onChange={(e) => setEditedChunk(e.target.value)}
                  style={textChunkStyle}
                  className="w-full rounded outline-none"
                />
              ) : (
                <div
                  className="whitespace-pre-wrap text-start rounded"
                  style={textChunkStyle}
                >
                  {chunks[currentChunkIndex] || ""}
                </div>
              )}
            </div>

            {/* Editing / Navigation / Audio controls */}
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center mt-2">
                {/* Chunk Editing Buttons */}
                <div className="flex gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSaveChunk}
                        className="bg-green-900 text-white px-3 py-1 rounded-full hover:bg-green-700 cursor-pointer "
                      >
                        Save Chunk
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-none text-black border-2 px-3 py-0.5 -translate-x-1.5 rounded-full hover:bg-gray-300 cursor-pointer ml-2"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleEditChunk}
                      className="bg-green-900 text-white px-3 py-1 rounded-full hover:bg-green-700 cursor-pointer"
                    >
                      Edit Chunk
                    </button>
                  )}
                </div>

                {/* Pagination for chunks */}
                {chunks.length > 1 && (
                  <div className="flex items-center justify-center -translate-x-96 rounded-3xl space-x-4">
                    <button
                      onClick={handlePrevChunk}
                      disabled={isEditing || currentChunkIndex === 0}
                      className={`px-2 rounded-full ${
                        currentChunkIndex === 0 || isEditing
                          ? "bg-darkgray/50 cursor-not-allowed border-2"
                          : "bg-darkgray text-black hover:bg-gray-400 border-2 cursor-pointer"
                      }`}
                    >
                      <i className="fa-solid fa-chevron-left"></i>
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {currentChunkIndex + 1} of {chunks.length}
                    </span>
                    <button
                      onClick={handleNextChunk}
                      disabled={isEditing || currentChunkIndex === chunks.length - 1}
                      className={`px-2 rounded-full ${
                        currentChunkIndex === chunks.length - 1 || isEditing
                          ? "bg-darkgray/50 cursor-not-allowed border-2"
                          : "bg-darkgray text-black hover:bg-gray-400 border-2 cursor-pointer"
                      }`}
                    >
                      <i className="fa-solid fa-chevron-right"></i>
                    </button>
                  </div>
                )}
              </div>
            </div>



          {/* Audio Generation */}
          {audioUrl && (
          <div className="my-8 w-3xl mx-auto  border-[1.5px] border-black rounded-full">
            <audio controls src={audioUrl} className="w-full">
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
        <div className="mt-2 flex justify-center">
          <button
            onClick={handleGenerateAudio}
            disabled={loadingAudio}
            className="w-48 py-2 px-4 mt-2 bg-black text-white font-semibold rounded-full hover:bg-black/80 cursor-pointer"
          >
            {loadingAudio ? "Generating Audio..." : "Generate Audio"}
          </button>
        </div>
        
      </div>
    </div>
    </div>
    </div>
  );
};

export default Note;
