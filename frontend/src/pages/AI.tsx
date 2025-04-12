// import { GoogleGenAI } from "@google/genai";
// import React, { useState, useEffect } from "react";

// /// Working on text-to-speech
// const gemniAPI = import.meta.env.VITE_GEMINI_API_KEY;
// const ai = new GoogleGenAI({
//   apiKey: gemniAPI,
// });

// const AI: React.FC = () => {
//   const [responseText, setResponseText] = useState<string>(""); // State to store the response text
//   const [imageSrc, setImageSrc] = useState<string | null>(null); // State to store the image source

//   useEffect(() => {
//     const fetchAIResponse = async () => {
//       console.log("Fetching AI response...");
//       try {
//         const contents =
//           "Hi, can you create a 3d rendered image of a dog " +
//           "with wings and a top hat flying over a happy " +
//           "futuristic scifi city with lots of greenery?";

//         // Generate content with both text and image modalities
//         console.log("Sending Request to AI...");
//         const response = await ai.models.generateContent({
//           model: "gemini-2.0-flash-exp-image-generation",
//           contents: contents,
//           config: {
//             responseModalities: ["Text", "Image"],
//           },
//         });
//         console.log("Received response from AI:", response);

//         // Check if candidates exist
//         if (response.candidates && response.candidates.length > 0) {
//           console.log("Candidates found:", response.candidates);
//           const candidate = response.candidates[0]; // Get the first candidate
//           if (candidate.content && candidate.content.parts) {
//             console.log("Candidate content parts:", candidate.content.parts);
//             for (const part of candidate.content.parts) {
//               console.log("Part:", part);
//               if (part.text) {
//                 console.log("Text part found:", part.text);
//                 setResponseText(part.text); // Set the response text
//               } else if (part.inlineData && part.inlineData.data) {
//                 console.log("Image part found:", part.inlineData.data);
//                 const imageData = part.inlineData.data;
//                 const imageBase64 = `data:image/png;base64,${imageData}`;
//                 console.log("Base64 image data:", imageBase64);
//                 setImageSrc(imageBase64); // Set the image source for the <img> tag
//               }
//             }
//           } else {
//             console.error("Candidate content or parts are missing.");
//             setResponseText("No content available.");
//           }
//         } else {
//           console.error("No candidates found in the response.");
//           setResponseText("No candidates found.");
//         }
//       } catch (error) {
//         console.error("Error fetching AI response:", error);
//         setResponseText("Error fetching AI response");
//       }
//     };

//     fetchAIResponse();
//   }, []); // Empty dependency array to run only once

//   return (
//     <div>
//       <h1 className="text-2xl font-bold text-center mb-4">Google AI Generated Content</h1>
//       <p className="text-center">{responseText || "Loading..."}</p>
//       {imageSrc && (
//         <div className="flex justify-center mt-4">
//           <img src={imageSrc} alt="AI Generated" className="rounded-lg shadow-lg" />
//         </div>
//       )}
//     </div>
//   );
// };

// export default AI;

import { GoogleGenAI } from "@google/genai";
import React, { useState, useEffect } from "react";

/// Working on text-to-speech and image generation
const gemniAPI = import.meta.env.VITE_GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: gemniAPI,
});

const AI: React.FC = () => {
  const [storyChunks, setStoryChunks] = useState<string[]>([]); // Array of story chunks
  const [images, setImages] = useState<string[]>([]); // Array of image URLs
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0); // Current chunk index
  const [loading, setLoading] = useState<boolean>(true); // Loading state

  const story = "In a forgotten town, a boy discovered a glowing key beneath an ancient oak tree. That night, dreams turned real. Shadows whispered secrets, stars blinked in code. He unlocked a hidden world of wonder, where hope lived in every heartbeat. The town awoke, remembering magic it once chose to forget.";

  useEffect(() => {
    const generateStoryImages = async () => {
      console.log("Splitting story into chunks...");
      const chunks = story.split(". ").map((chunk) => chunk.trim() + ".");
      setStoryChunks(chunks);
      console.log("Story chunks:", chunks);

      const generatedImages: string[] = [];
      for (const chunk of chunks) {
        console.log("Generating image for chunk:", chunk);
        try {
          const response = await ai.models.generateContent({
            model: "gemini-2.0-flash-exp-image-generation",
            contents: `Create a highly detailed, visually stunning image that represents the following story part. Focus on capturing the essence and atmosphere of the scene described, with vibrant colors and artistic depth. Do not include any text or labels in the image. Here is the story part: "${chunk}"`,
            config: {
              responseModalities: ["Text", "Image"],
            },
          });
          console.log("Response for chunk:", response);

          const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (imageData) {
            const imageBase64 = `data:image/png;base64,${imageData}`;
            console.log("Generated Base64 image:", imageBase64);
            generatedImages.push(imageBase64);
          } else {
            console.error("No image data found for chunk:", chunk);
            generatedImages.push(""); // Push null if no image is generated
          }
        } catch (error) {
          console.error("Error generating image for chunk:", chunk, error);
          generatedImages.push(""); // Push null if an error occurs
        }
      }

      setImages(generatedImages);
      setLoading(false); // Set loading to false after all images are generated
      console.log("All images generated:", generatedImages);
    };

    generateStoryImages();
  }, [story]); // Run only once when the story is set

  const handleNext = () => {
    if (currentChunkIndex < storyChunks.length - 1) {
      setCurrentChunkIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentChunkIndex > 0) {
      setCurrentChunkIndex((prev) => prev - 1);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-center mb-4">Visual Storybook</h1>
      {loading ? (
        <p className="text-center">Generating story and images... Please wait.</p>
      ) : (
        <div>
          <div className="text-center mb-4">
            <h2 className="text-lg font-semibold">{storyChunks[currentChunkIndex]}</h2>
          </div>
          {images[currentChunkIndex] ? (
            <div className="flex justify-center mb-4">
              <img
                src={images[currentChunkIndex]}
                alt={`Story Image ${currentChunkIndex + 1}`}
                className="rounded-lg shadow-lg"
              />
            </div>
          ) : (
            <p className="text-center text-red-500">No image available for this part of the story.</p>
          )}
          <div className="flex justify-between mt-4">
            <button
              onClick={handlePrevious}
              disabled={currentChunkIndex === 0}
              className={`py-2 px-4 rounded-lg ${
                currentChunkIndex === 0
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNext}
              disabled={currentChunkIndex === storyChunks.length - 1}
              className={`py-2 px-4 rounded-lg ${
                currentChunkIndex === storyChunks.length - 1
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AI;