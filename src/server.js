
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const requestPromise = require('request-promise');
const base64 = require('base-64');
const blueBirdPromise = require('bluebird');

const { CLIENT_ORIGIN } = require('../config');

const app = express();

app.use(morgan('common'));

app.use(cors({ origin: CLIENT_ORIGIN }));

const spotifyAuth = {
  url: 'https://accounts.spotify.com/api/token',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${base64.encode(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`)}`,
  },
  body: 'grant_type=client_credentials',
  json: true,
};

const spotifySearch = (token, artist) => {
  return {
    url: 'https://api.spotify.com/v1/search',
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    qs: {
      q: artist,
      type: 'artist',
      limit: '1',
    },
    json: true,
  };
};

const mockDataResultsFromSpotify = [
  {
    Name: 'nofx',
  },
  {
    Name: 'me first and the gimme gimmes',
  },
  {
    Name: 'pennywise',
  },
];

app.post('/spotify', (req, res) => {

  requestPromise(spotifyAuth)
    .then((auth) => {
      // replace mock with req body
      const promises = mockDataResultsFromSpotify.map((item) => {
        return requestPromise(spotifySearch(auth.access_token, item.Name));
      });
      return blueBirdPromise.all(promises);
    })
    .then((artists) => {
      res.status(200).json(artists);
    })
    .catch(err => console.log(err.error));
});

let server;

function runServer() {
  const port = process.env.PORT || 8080;
  return new Promise((resolve, reject) => {
    server = app.listen(port, () => {
      console.log(`Your app is listening on port ${port}`);
      resolve(server);
    }).on('error', (err) => {
      reject(err);
    });
  });
}

function closeServer() {
  return new Promise((resolve, reject) => {
    console.log('Closing server');
    server.close((err) => {
      if (err) {
        reject(err);
        // so we don't also call `resolve()`
        return;
      }
      resolve();
    });
  });
}

if (require.main === module) {
  runServer().catch(err => console.error(err));
}

module.exports = { app, runServer, closeServer };

