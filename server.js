const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

let broadcasterId = null;
const viewers = new Set();

app.use(express.static(path.join(__dirname)));
app.use('/dashboard', express.static(path.join(__dirname, 'dashboard')));
app.get('/dashboard/live', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard', 'live.html'));
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('broadcaster', () => {
    broadcasterId = socket.id;
    console.log('Broadcaster registered:', broadcasterId);
    io.to(socket.id).emit('broadcaster-accepted');
  });

  socket.on('watcher', () => {
    viewers.add(socket.id);
    console.log('Viewer joined:', socket.id);
    io.emit('viewer-count', viewers.size);
    if (broadcasterId) {
      io.to(broadcasterId).emit('watcher', socket.id);
    }
  });

  socket.on('offer', (payload) => {
    const { viewerId, sdp } = payload;
    if (viewerId) {
      io.to(viewerId).emit('offer', {
        sdp,
        broadcasterId: socket.id
      });
    }
  });

  socket.on('answer', (payload) => {
    const { broadcasterId: toBroadcasterId, sdp } = payload;
    if (toBroadcasterId) {
      io.to(toBroadcasterId).emit('answer', {
        sdp,
        viewerId: socket.id
      });
    }
  });

  socket.on('candidate', (payload) => {
    const { target, candidate } = payload;
    if (target) {
      io.to(target).emit('candidate', {
        candidate,
        from: socket.id
      });
    }
  });

  socket.on('public-like', () => {
    if (broadcasterId) {
      io.to(broadcasterId).emit('public-like');
    }
  });

  socket.on('public-comment', (comment) => {
    if (broadcasterId) {
      io.to(broadcasterId).emit('public-comment', {
        comment,
        viewerId: socket.id
      });
    }
  });

  socket.on('disconnect', () => {
    if (socket.id === broadcasterId) {
      console.log('Broadcaster disconnected:', socket.id);
      broadcasterId = null;
      io.emit('broadcaster-left');
    }
    if (viewers.has(socket.id)) {
      viewers.delete(socket.id);
      io.emit('viewer-count', viewers.size);
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});