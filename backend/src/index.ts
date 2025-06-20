import WebSocket, { WebSocketServer } from "ws";
import http from "http";

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

server.listen(3000, () => {
  console.log("Server is listening on port 3000");
});
