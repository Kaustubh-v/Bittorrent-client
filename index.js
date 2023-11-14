'use strict';
import bencode from 'bencode';
import fs from 'fs';
import { getPeers } from './tracker.js';
import { openTorrentFile } from './torrent-parser.js'

// Specify the path to your torrent file
const torrentFilePath = 'puppy.torrent';

// Read the contents of the torrent file
try {

  const torrent = openTorrentFile(torrentFilePath);
  console.log("torrent is : " ,torrent.announce)
  
  getPeers(torrent , peers => {
    console.log('list of peers: ' , peers);
  });   

} catch (error) {
  console.error('Error reading or decoding the torrent file:', error.message);
}
