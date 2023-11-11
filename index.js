'use strict';
import bencode from 'bencode';
import fs from 'fs';
import { getPeers } from './tracker.js';

// Specify the path to your torrent file
const torrentFilePath = 'puppy.torrent';

// Read the contents of the torrent file
try {
  const torrentContent = fs.readFileSync(torrentFilePath);

  const torrent = bencode.decode(torrentContent);
  console.log("torrent is : " ,torrent.announce)
  
  getPeers(torrent , peers => {
    console.log('list of peers: ' , peers);
  });   

} catch (error) {
  console.error('Error reading or decoding the torrent file:', error.message);
}
