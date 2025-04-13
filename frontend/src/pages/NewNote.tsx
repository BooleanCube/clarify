import React, { useState } from "react";

import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";
import { useNavigate } from "react-router-dom";

import supabase from "@/supabase-client";
import { useAuth } from "@/middleware";

pdfjsLib.GlobalWorkerOptions.workerSrc = "./pdf.worker.min.mjs";


const NewNote = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name)
      if (
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        setSelectedFile(file)
      } else {
        alert("Please select a PDF or DOCX file.")
        console.error("Invalid file type:", file.type)
        setSelectedFile(null)
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

  const handleUpload = async () => {
    if (!selectedFile) {
      alert("Please select a file to upload.");
      console.error("No file selected for upload.");
      return;
    }
  
    console.log("Uploading file:", selectedFile.name);
    alert(`File ${selectedFile.name} uploaded successfully!`);
  
    let extractedText = "";
    if (selectedFile.type === "application/pdf") {
      extractedText = await extractTextFromPDF(selectedFile);
    } else if (
      selectedFile.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      extractedText = await extractTextFromDocx(selectedFile);
    } else {
      console.error("Unsupported file type.")
      return
    }
  
    const { data, error } = await supabase
      .from("notes")
      .insert({
        profile_id: session?.user.id,
        preset_id: 1,
        content: extractedText,
        name: "Note Name",
        favorite: false,
      })
      .select("*");
  
    if (error) {
      alert(`Error creating a new note: ${error.message}`);
      console.error("Error creating a new note:", error);
      return;
    }
  
    const id = data?.[0]?.id;
    if (id) navigate(`/note/${id}`);
  };
  

  return (
    <div>
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
