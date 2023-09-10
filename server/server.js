
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs');
const og = require('open-graph');  // Include 'open-graph' package
const { JSDOM } = require('jsdom');  // Include 'jsdom' package
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const path = require('path');

let db = {};

// Function to update Open Graph images
async function updateOgImages() {
    for (const row in db) {
      for (const block of db[row]) {
        const url = block.url;
        if (url) {
          await new Promise((resolve, reject) => {
            og(url, (err, meta) => {
              if (err) console.log('Error fetching OG data:', err);
              else block.imgSrc = meta.image ? meta.image.url : 'https://via.placeholder.com/100';
              resolve();
            });
          });
        }
      }
    }
  }

fs.readFile('db.json', 'utf8', (err, data) => {
  if (err) {
    console.log('No saved data found.');
  } else {
    db = JSON.parse(data);
    updateOgImages().then(() => {
      io.emit('init', db);
    });
  }
});

io.on('connection', (socket) => {
  socket.emit('init', db);

  socket.on('update', (data) => {
    db = data;
    updateOgImages().then(() => {
      socket.emit('update', db);
      socket.broadcast.emit('update', db);
      fs.writeFile('db.json', JSON.stringify(db), 'utf8', (err) => {
        if (err) {
          console.log('Error saving data:', err);
        }
      });
    });
  });
});

app.use('/static', express.static(path.join(__dirname, '../dist')));
app.use('/', express.static(path.join(__dirname, '../public')));

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log('Server running on http://localhost:3000');
});
