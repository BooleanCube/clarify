import React, { useState, useEffect } from "react";

import * as pdfjsLib from "pdfjs-dist";
pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";



const NewNote: React.FC = () => {

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [fontSize, setFontSize] = useState<number>(16); // Default font size
  const [fontWeight, setFontWeight] = useState<number>(400); // Default font weight
  const [lineHeight, setLineHeight] = useState<number>(1.5); // Default line height
  const [letterSpacing, setLetterSpacing] = useState<number>(0); // Default letter spacing
  const [textColor, setTextColor] = useState<string>("#000000"); // Default text color
  const [backgroundColor, setBackgroundColor] = useState<string>("#ffffff"); // Default background color
  const [fontFamily, setFontFamily] = useState<string>("Arial"); // Default font family


  // Chunk feature
  const [chunkSize, setChunkSize] = useState<number>(3); // Default chunk size
  const [chunks, setChunks] = useState<string[]>([]); // Array to hold chunks
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0); // Index of the current chunk

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf") {
        setSelectedFile(file);
      } else {
        alert("Please select a PDF file.");
        setSelectedFile(null);
      }
    }
  };

  const extractTextFromPDF = async (file: File) => {
    try {
      const fileReader = new FileReader();

      fileReader.onload = async () => {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;
        const numPages = pdf.numPages;
        let fullText = "";

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();

          const pageText = content.items.map((item: any) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }

        setPdfText(fullText);
      };

      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
    }
  };

  const handleUpload = async () => {
    if (selectedFile) {
      await extractTextFromPDF(selectedFile);
    } else {
      alert("Please select a file to upload.");
    }
  };

  const handleNextChunk = () => {
    if (currentChunkIndex < chunks.length - 1) {
      setCurrentChunkIndex(currentChunkIndex + 1);
    }
  };

  const handlePrevChunk = () => {
    if (currentChunkIndex > 0) {      
      setCurrentChunkIndex(currentChunkIndex - 1);  
    }
  };

  useEffect(() => {
    if(pdfText){
      const sentences = pdfText
        .replace(/([.!?])\s*(?=[A-Z])/g, "$1|") // Split sentences by punctuation followed by a capital letter
        .split("|")
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence.length > 0); // Filter out empty sentences
      
      const newChunks: string[] = [];
      for (let i = 0; i < sentences.length; i += chunkSize) {
        newChunks.push(sentences.slice(i, i + chunkSize).join(" "));
      }
      setChunks(newChunks);
      setCurrentChunkIndex(0); // Reset to the first chunk
    }
  }, [chunkSize, pdfText]);


  return (
    <div>
      <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">Upload a file (.pdf, .docx)</h1>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
        />
        <button
          onClick={handleUpload}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Upload
        </button>
      </div>
      {selectedFile && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Selected File:</h2>
          <p className="text-gray-700">{selectedFile.name}</p>
        </div>
      )}
      {selectedFile && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Reading Settings:</h2>
          {/* Font Size */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Font Size: {fontSize}px</label>
            <input
              type="range"
              min="10"
              max="50"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          {/* Font Weight */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Font Weight: {fontWeight}</label>
            <input
              type="range"
              min="100"
              max="900"
              step="100"
              value={fontWeight}
              onChange={(e) => setFontWeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          {/* Line Height */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Line Height: {lineHeight}</label>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          {/* Letter Spacing */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Letter Spacing: {letterSpacing}px</label>
            <input
              type="range"
              min="-5"
              max="10"
              step="0.5"
              value={letterSpacing}
              onChange={(e) => setLetterSpacing(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          {/* Text Color */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Text Color:</label>
            <select 
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="#000000">Black</option>
              <option value="#FF0000">Red</option>
              <option value="#00FF00">Green</option>
              <option value="#0000FF">Blue</option>
              <option value="#FFFF00">Yellow</option>
              <option value="#FFA500">Orange</option>
            </select>
          </div>
          {/* Background Color */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Background Color:</label>
            <select 
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="#FDF6E3">Off-White (Cream)</option>
              <option value="#FFFACD">Light Yellow</option>
              <option value="#DFF6FF">Light Blue</option>
              <option value="#DFFFD6">Pale Green</option>
              <option value="#E8E8E8">Soft Gray</option>
              <option value="#E6E6FA">Lavender</option>
            </select>
          </div>
          {/* Font Family */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Font Family:</label>
            <select 
              value={fontFamily}
              onChange={(e) => setFontFamily(e.target.value)}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="'Atkinson Hyperlegible', sans-serif">Atkinson Hyperlegible</option>
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
          </div>
          {/* Chunk Size */}
          <div className="mb-4">
            <label className="block mb-2 text-sm font-medium text-gray-700">Chunk Size:</label>
            <select
              value={chunkSize}
              onChange={(e) => setChunkSize(Number(e.target.value))}
              className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={2}>2 Sentences</option>
              <option value={6}>6 Sentences</option>
              <option value={15}>15 Sentences</option>
            </select>
          </div>
        </div>
      )}
      {chunks.length > 0 && (
        <div className="mt-6">
        <h2 className="text-lg font-semibold">Extracted Text (Chunk):</h2>
        <div
          className="text-gray-700 whitespace-pre-wrap text-start border border-gray-300 p-4 rounded-lg overflow-auto"
          style={{
            fontSize: `${fontSize}px`,
            fontWeight: fontWeight,
            lineHeight: lineHeight,
            letterSpacing: `${letterSpacing}px`,
            color:textColor,
            backgroundColor:backgroundColor,
            fontFamily: fontFamily,
            width: "100%",
            height: "300px",
            overflow: "auto",
            wordWrap: "break-word",
          }}
        >
          {chunks[currentChunkIndex]}
        </div>
        {/* Page Number */}
        <div className="text-center mt-4 text-sm text-gray-600">
          Page {currentChunkIndex + 1} of {chunks.length}
        </div>
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-4">
          <button
            onClick={handlePrevChunk}
            disabled={currentChunkIndex === 0}
            className={`py-2 px-4 rounded-lg ${
              currentChunkIndex === 0 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Previous
          </button>
          <button
            onClick={handleNextChunk}
            disabled={currentChunkIndex === chunks.length - 1}
            className={`py-2 px-4 rounded-lg ${
              currentChunkIndex === chunks.length - 1 ? "bg-gray-300 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            Next
          </button>
        </div>
      </div>
      )}

      {/* {pdfText && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Extracted Text:</h2>
          <div
            className="text-gray-700 whitespace-pre-wrap text-start border border-gray-300 p-4 rounded-lg overflow-auto"
            style={{
              fontSize: `${fontSize}px`,
              fontWeight: fontWeight,
              lineHeight: lineHeight,
              letterSpacing: `${letterSpacing}px`,
              width: "100%",
              height: "300px",
              overflow: "auto",
              wordWrap: "break-word",
            }}
          >
            {pdfText}
          </div>
        </div>
      )} */}
    </div>
  );
};

export default NewNote;