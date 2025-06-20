import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv"
dotenv.config()

const server = http.createServer();

const websocketInstance = new WebSocketServer({ server });

websocketInstance.on("connection", (ws) => {
  ws.send("Hello there!");

  ws.on("error", (error) => {
    console.error(error);
  });

  ws.on("message", (data, isBinary) => {
    websocketInstance.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
});

const PORT = process.env.PORT;

server.listen(PORT, () => {
  console.log("Server is listening on port 3000");
});
