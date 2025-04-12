import React, { useState } from "react";
import * as pdfjs from "pdfjs-dist";
pdfjs.GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.min.js";

const NewNote: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>("");

  const handleFileChange = async(event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleFileChange called");
    const file = event.target.files?.[0];
    if (file) {
      console.log("File selected:", file.name);
      if (file.type === "application/pdf") {
        setSelectedFile(file);
        await extractTextFromPDF(file);
      } else {
        alert("Please select a PDF file.");
        console.error("Invalid file type:", file.type);
        setSelectedFile(null);
      }
    }
  };

  const extractTextFromPDF = async(file: File) => {
    console.log("extractTextFromPDF called");
    try {
      const fileReader = new FileReader();
      fileReader.onload = async () => {
        const typedArray = new Uint8Array(fileReader.result as ArrayBuffer);
        const pdf = await pdfjs.getDocument(typedArray).promise;
        const numPages = pdf.numPages;
        let textContent = "";

        for (let i = 1; i <= numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const textItems = content.items.map((item: any) => item.str).join(" ");
          textContent += textItems + "\n";
        }

        setPdfText(textContent);
        console.log("Extracted text:", textContent);
      }
      fileReader.readAsArrayBuffer(file);
    } catch (error) {
      console.error("Error extracting text from PDF:", error);
    }
  }

  const handleUpload = () => {
    console.log("handleUpload called");
    if (selectedFile) {
      console.log("uploading file:", selectedFile.name);
      alert(`File ${selectedFile.name} uploaded successfully!`);
    } else {
      alert("Please select a file to upload.");
      console.error("No file selected for upload.");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-4">Upload a PDF</h1>
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
      {selectedFile && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Selected File:</h2>
          <p className="text-gray-700">{selectedFile.name}</p>
        </div>
      )}
      {pdfText && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Extracted Text:</h2>
          <pre className="text-gray-700 whitespace-pre-wrap">{pdfText}</pre>
        </div>
      )}
    </div>
  );
};

export default NewNote;