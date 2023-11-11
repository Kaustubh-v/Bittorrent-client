'use strict';
import bencode from 'bencode';
import fs from 'fs';

// Specify the path to your torrent file
const torrentFilePath = 'puppy.torrent';

// Read the contents of the torrent file
try {
  const torrentContent = fs.readFileSync(torrentFilePath);
  
  // Decode the torrent content using bencode
  const decodedTorrent = bencode.decode(torrentContent);

  // Log some information from the decoded torrent data
  console.log('Torrent Info:');
  console.log('Name:', decodedTorrent.info.name.toString('utf8'));
  console.log('Announce:', decodedTorrent.announce.toString('utf8'));
  console.log('Piece Length:', decodedTorrent.info['piece length']);
  console.log('Number of Pieces:', decodedTorrent.info.pieces.length / 20); // Each piece is 20 bytes

} catch (error) {
  console.error('Error reading or decoding the torrent file:', error.message);
}
