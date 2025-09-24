
import { Server } from "socket.io";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API
// IMPORTANT: Make sure to set the GEMINI_API_KEY environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

function setupWebsockets(server) {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("a user connected");

    socket.on("disconnect", () => {
      console.log("user disconnected");
    });

    socket.on("chat message", async (msg) => {
      if (msg.message.includes("@ki")) {
        try {
          const prompt = msg.message.replace("@ki", "").trim();
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = await response.text();

          io.emit("chat message", {
            ...msg,
            message: text,
            author: "KI",
            isKi: true,
          });
        } catch (error) {
          console.error(error);
          io.emit("chat message", {
            ...msg,
            message: "Sorry, I am having trouble thinking right now.",
            author: "KI",
            isKi: true,
          });
        }
      } else {
        io.emit("chat message", msg);
      }
    });
  });

  return io;
}

export default setupWebsockets;
