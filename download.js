'use strict';
import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker';

const downlaodTorrent = torrent => {
    getPeers(torrent , peers => {
        peers.forEach(download);
    });
};

function onWholeMsg(socket, callback) {
    let savedBuf = Buffer.alloc(0);
    let handshake = true;
  
    socket.on('data', recvBuf => {
      // msgLen calculates the length of a whole message
      const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
      savedBuf = Buffer.concat([savedBuf, recvBuf]);
  
      while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
        callback(savedBuf.subarray(0, msgLen()));
        savedBuf = savedBuf.subarray(msgLen());
        handshake = false;
      }
    });
  }

function download(peer){
    const socket = net.Socket();
    socket.on('error' , console.log);
    socket.connect(peer.port , peer.ip , () => {
        //
    });
    socket.on('data' , data => {
        //
    })
}

export default downlaodTorrent;