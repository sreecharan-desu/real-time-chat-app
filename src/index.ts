import WebSocket, { WebSocketServer } from "ws";
import http from "http";
import dotenv from "dotenv";
dotenv.config();

const server = http.createServer();

server.on("request", (req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Server is up");
  }
});

const websocketInstance = new WebSocketServer({ server });

websocketInstance.on("connection", (ws) => {
  

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

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
