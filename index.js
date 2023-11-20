'use strict';
// import bencode from 'bencode';
// import fs from 'fs';
//  import { getPeers } from './tracker.js';
import { openTorrentFile } from './torrent-parser.js'
import downlaodTorrent from './download.js';

// Specify the path to your torrent file
const torrentFilePath = 'Adventure.Time.Fionna.and.Cake.S01E03.Cake.the.Cat.1080p.MAX.WEB-DL.DDP5.1.H.264-NTb[TGx].torrent';

// Read the contents of the torrent file
try {

  const torrent = openTorrentFile(torrentFilePath);
  console.log("torrent is : " ,String.fromCharCode.apply(null, torrent.announce))
  console.log("torrent info : " , torrent.toString('utf8'));
  
  // getPeers(torrent , peers => {
  //   console.log('list of peers: ' , peers);
  // });  
  downlaodTorrent(torrent, torrent.info.name);

} catch (error) {
  console.error('Error reading or decoding the torrent file:', error.message);
}
