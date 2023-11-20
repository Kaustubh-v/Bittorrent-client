'use strict';
import net from 'net';
import { Buffer } from 'buffer';
import { getPeers } from './tracker.js';
import * as message from './message.js';
import { Pieces } from './Pieces.js';

const downlaodTorrent = torrent => {
    console.log("starting download...");
    getPeers(torrent , peers => {
        const pieces = new Pieces(torrent.info.pieces.length / 20);
        peers.forEach(peer => download(peer, torrent, pieces));
    });
};


function download(peer , torrent , pieces){
    console.log("peer =",peer.ip , "peer port : " , peer.port);
    var socket = new net.Socket();
    console.log("socket created");
    socket.on('error', (error) => {
      console.error('Socket error:', error.message);
  });
    socket.connect(peer.port , peer.ip , () => {
      console.log("sending handshake message...");
      socket.write(message.buildHandshake(torrent));
      console.log("handshake msg sent...");
    });
    // socket.on('error' , console.log);
    console.log("calling onWholeMessage");
    const queue = {choked: true, queue: []};
    onWholeMsg(socket , msg => msgHandler(msg,socket, pieces , queue));
}

// for reveiving the whole message at once
function onWholeMsg(socket, callback) {
    console.log("inside onWholeMessage");
    let savedBuf = Buffer.alloc(0);
    let handshake = true;
  
    socket.on('data', recvBuf => {
      // msgLen calculates the length of a whole message
      const msgLen = () => handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
      savedBuf = Buffer.concat([savedBuf, recvBuf]);
  
      while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
        if(handshake){
            console.log("recieved handshake reply= ", recvBuf.toString('ascii'));
        }
        callback(savedBuf.subarray(0, msgLen()));
        savedBuf = savedBuf.subarray(msgLen());
        handshake = false;
      }
    });
  }

// this is the callback function for onWholeMsg
function msgHandler(msg, socket, pieces , queue) {
    console.log("inside msghandler...");
    if (isHandshake(msg)) {
        //if message rcvd is handshake then send interested message
        socket.write(message.buildInterested());
      } else {
        const m = message.parse(msg);
    
        if (m.id === 0) chokeHandler(socket);
        if (m.id === 1) unchokeHandler(socket, pieces, queue);
        if (m.id === 4) haveHandler(m.payload , socket , pieces , queue);
        if (m.id === 5) bitfieldHandler(m.payload,socket, pieces, queue);
        if (m.id === 7) pieceHandler(m.payload, socket, pieces, queue);
      }
}

function chokeHandler(socket) { // 
    socket.end();
}

function unchokeHandler(socket, pieces, queue) {//
  console.log("unchoke handler...");
    queue.choked = false;
  // 2
    requestPiece(socket, pieces, queue);
    
}

function haveHandler(payload, socket , pieces, queue) { // 
  console.log("inside have handler...");
    const pieceIndex = payload.readUInt32BE(0);
    queue.queue.push(pieceIndex);
    if (queue.queue.length === 1) {
        requestPiece(socket, pieces, queue);
    } 
}

function bitfieldHandler(payload) { // 
}

function pieceHandler(payload, socket, pieces, queue) { //
    queue.shift();
    requestPiece(socket, pieces, queue);
 }

function requestPiece(socket, pieces, queue) {
  console.log("in requestPiece...");
    if (queue.choked) return null;

    while (queue.queue.length) {
    const pieceIndex = queue.queue.shift();
    if (pieces.needed(pieceIndex)) {
      // need to fix this
      socket.write(message.buildRequest(pieceIndex));
      pieces.addRequested(pieceIndex);
      break;
    }
  }
}

function isHandshake(msg) {
    return msg.length === msg.readUInt8(0) + 49 &&
           msg.toString('utf8', 1) === 'BitTorrent protocol';
}

export default downlaodTorrent;