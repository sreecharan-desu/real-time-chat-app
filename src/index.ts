
import WebSocket, { WebSocketServer } from 'ws';
import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const server = http.createServer();

server.on('request', (req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({ server });
const MAX_CLIENTS = 1000; // Limit maximum connections
const PING_INTERVAL = 30000; // 30 seconds for heartbeat
const PING_TIMEOUT = 5000; // Timeout if no pong received

interface Client extends WebSocket {
  isAlive: boolean;
  lastPong: number;
}

interface Message {
  id: string;
  name: string;
  message: string;
  timestamp?: number;
  onlineUsers?: number;
}

// Broadcast online users count to all clients
const broadcastOnlineUsers = () => {
  const onlineUsers = wss.clients.size;
  const message = JSON.stringify({ onlineUsers });
  wss.clients.forEach((client) => {
    if ((client as Client).readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
  console.log(`Broadcasted online users: ${onlineUsers}`);
};

// Validate incoming message
const validateMessage = (data: any): Message | null => {
  if (!data || typeof data !== 'object') return null;
  const { id, name, message } = data;
  if (
    typeof id === 'string' &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    typeof message === 'string' &&
    message.trim().length > 0
  ) {
    return { id, name, message };
  }
  return null;
};

wss.on('connection', (ws: Client) => {
  // Reject connection if max clients reached
  if (wss.clients.size > MAX_CLIENTS) {
    ws.close(1008, 'Maximum clients reached');
    console.log('Connection rejected: Maximum clients reached');
    return;
  }

  // Initialize client properties
  ws.isAlive = true;
  ws.lastPong = Date.now();

  console.log(`New client connected. Total clients: ${wss.clients.size}`);

  // Send initial online users count
  broadcastOnlineUsers();

  ws.on('message', (data, isBinary) => {
    try {
      const parsedData = JSON.parse(data.toString());

      // Handle ping messages
      if (parsedData.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        ws.isAlive = true;
        ws.lastPong = Date.now();
        return;
      }

      // Validate message
      const message = validateMessage(parsedData);
      if (!message) {
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
        console.warn('Invalid message received:', parsedData);
        return;
      }

      // Broadcast message with online users count
      const messageData = JSON.stringify({
        ...message,
        timestamp: Date.now(),
        onlineUsers: wss.clients.size,
      });
      wss.clients.forEach((client) => {
        if ((client as Client).readyState === WebSocket.OPEN) {
          client.send(messageData, { binary: isBinary });
        }
      });
      console.log(`Broadcasted message from ${message.name}: ${message.message}`);
    } catch (error) {
      console.error('Error processing message:', error);
      ws.send(JSON.stringify({ error: 'Failed to process message' }));
    }
  });

  ws.on('pong', () => {
    ws.isAlive = true;
    ws.lastPong = Date.now();
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log(`Client disconnected. Total clients: ${wss.clients.size}`);
    broadcastOnlineUsers();
  });
});

// Heartbeat to detect stale clients
setInterval(() => {
  wss.clients.forEach((ws: any) => {
    if (!ws.isAlive || Date.now() - ws.lastPong > PING_INTERVAL + PING_TIMEOUT) {
      console.log('Terminating stale client');
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    ws.ping();
  });
}, PING_INTERVAL);

// Periodic online users update (optional)
setInterval(() => {
  broadcastOnlineUsers();
}, 10000); // Every 10 seconds

wss.on('error', (error) => {
  console.error('WebSocket server error:', error);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
