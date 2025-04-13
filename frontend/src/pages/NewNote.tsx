import React, { useState } from "react";

import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { useNavigate } from "react-router-dom";

import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";
import { useLocation } from "react-router-dom";
import { createWorker } from "tesseract.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";


const NewNote = () => {
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedOption, noteName } = location.state || { selectedOption: null, noteName: "" };
  //console.log("Selected option from location state:", selectedOption);
  console.log("Note name from location state:", noteName);

  // different states (doc, image, text)
  const [imageContent, setImageContent] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // ocr files content
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognitionProgress, setRecognitionProgress] = useState(0);


  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name)
      if (
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setSelectedFile(file)
      } else if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setImageContent(reader.result as string);
          console.log("Image content set:", reader.result);
        }
        reader.readAsDataURL(file);
        setSelectedFile(file);
      } else {
        alert("Unsupported file type. Please select a PDF, DOCX, or image file.");
        console.error("Unsupported file type:", file.type);
        setSelectedFile(null);
        setImageContent("");
      }
    }
  };

  const extractTextFromPDF = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
          const pdf = await pdfjsLib.getDocument(typedArray).promise;
          const numPages = pdf.numPages;
          let fullText = "";
  
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str.trim()).join(" ");
            fullText += pageText + " ";
          }
  
          resolve(fullText)
        } catch (error) {
          reject(error)
        }
      };
      fileReader.onerror = (err) => reject(err)
      fileReader.readAsArrayBuffer(file)
    })
  }
  

  const extractTextFromDocx = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        try {
          const arrayBuffer = fileReader.result as ArrayBuffer;
          const result = await mammoth.extractRawText({ arrayBuffer });
          resolve(result.value);
        } catch (error) {
          reject(error);
        }
      };
      fileReader.onerror = (err) => reject(err);
      fileReader.readAsArrayBuffer(file);
    })
  }

  const extractTextFromImage = async (file: File) => {
    console.log("inside extractTextFromImage");
    console.log("File to be processed:", file.name);
    setIsProcessing(true);
    setRecognitionProgress(0);
  
    try {
      const worker = await createWorker("eng");
      setRecognitionProgress(50);
      
      const { data } = await worker.recognize(file);
      setRecognitionProgress(100);
  
      
      await worker.terminate();
      return data.text;
    } catch (error) {
      console.error("Error during OCR:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleUpload = async () => {
    let content = "";
    
    // Handle Document option (files)
    if (selectedOption === "Document") {
      if (!selectedFile) {
        alert("Please select a file to upload.");
        console.error("No file selected for upload.");
        return;
      }
      
      console.log("Uploading file:", selectedFile.name);
      
      // Extract text from PDF or DOCX
      if (selectedFile.type === "application/pdf") {
        content = await extractTextFromPDF(selectedFile);
      } else if (selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        content = await extractTextFromDocx(selectedFile);
      } else {
        console.error("Unsupported file type.");
        alert("Unsupported file type.");
        return;
      }
      
      alert(`File ${selectedFile.name} uploaded successfully!`);
    } 
    // Handle Image option
    else if (selectedOption === "Image") {
      if (!selectedFile) {
        alert("Please select an image to upload.");
        console.error("No image selected for upload.");
        return;
      }
      //console.log("Should do image to text extraction here");
      try {
        const extractedText = await extractTextFromImage(selectedFile);
        content = extractedText;
        console.log("Extracted text from image:", extractedText);
      } catch (error) {
        console.error("Error during image processing:", error);
        alert("Error during image processing. Please try again.");
        return;
      }
      
      alert(`Image ${selectedFile.name} uploaded successfully!`);
    }
    // Handle Text option 
    else if (selectedOption === "Text") {
      // Check if text content is provided
      if (!textContent.trim()) {
        alert("Please enter some text before saving.");
        console.error("No text content provided.");
        return;
      }
      
      // Use the text content directly
      content = textContent;
      console.log("Saving text content");
    }
    else {
      alert("Invalid option selected.");
      return;
    }
    
    // Save to Supabase database
    const { data, error } = await supabase
      .from("notes")
      .insert({
        profile_id: session?.user.id,
        preset_id: 1,
        content: content,
        name: noteName, // Dynamic name based on type
        favorite: false,
      })
      .select("*");
  
    if (error) {
      alert(`Error creating a new note: ${error.message}`);
      console.error("Error creating a new note:", error);
      return;
    }
  
    // Navigate to the new note
    const id = data?.[0]?.id;
    if (id) navigate(`/note/${id}`);
  };
  

  return (
    <div>
      {selectedOption == "Document" && (
        <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-4">Upload a file (.pdf, .docx)</h1>
        <input
          type="file"
          accept="application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange} 
          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
        />
        <button
          onClick={handleUpload}
          className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Upload
        </button>
      </div>
      )}
      {selectedOption == "Image" && (
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-4">Upload an image</h1>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange} 
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          />
          {isProcessing && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full" 
                  style={{ width: `${recognitionProgress}%` }}
                ></div>
              </div>
              <p className="text-center text-sm text-gray-600 mt-1">
                Processing: {recognitionProgress}%
              </p>
            </div>
          )}
          <button
            onClick={handleUpload}
            disabled={isProcessing}
            className={`w-full py-2 px-4 font-semibold rounded-lg shadow-md 
                      focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                      ${isProcessing 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            {isProcessing ? 'Processing...' : 'Upload'}
          </button>
          {/* <button
            onClick={handleUpload}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upload
          </button> */}
        </div>
      )}
      {selectedOption == "Text" && (
        <div className="p-6 max-w-md mx-auto">
          <h1 className="text-2xl font-bold text-center mb-4">Upload a text file</h1>
          <textarea
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
          ></textarea>
          <button
            onClick={handleUpload}
            className="w-full py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Upload
          </button>
        </div>
      )}
      {selectedFile && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Selected File:</h2>
          <p className="text-gray-700">{selectedFile.name}</p>
        </div>
      )}
    </div>
  )
}

export default NewNote