'use strict';
import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker';
import * as message from './message';

const downlaodTorrent = torrent => {
    getPeers(torrent , peers => {
        peers.forEach(download);
    });
};


function download(peer){
    const socket = net.Socket();
    socket.on('error' , console.log);
    socket.connect(peer.port , peer.ip , () => {
        socket.write(message.buildHandshake(torrent));
    });
    onWholeMsg(socket , msg => msgHandler(msg,socket));
}

// for reveiving the whole message at once
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

// this is the callback function for onWholeMsg
function msgHandler(msg, socket) {
    // if recvd message is of handshake then send interested message
    if (isHandshake(msg)) socket.write(message.buildInterested());
}


function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 &&
           msg.toString('utf8', 1) === 'BitTorrent protocol';
}

export default downlaodTorrent;