"use strict";
import net from "net";
import { Buffer } from "buffer";
import { getPeers } from "./tracker.js";
import * as message from "./message.js";
import { Pieces } from "./Pieces.js";
import { Queue } from "./Queue.js";
import fs from "fs";

const downlaodTorrent = (torrent, path) => {
  console.log("starting download...");
  getPeers(torrent, (peers) => {
    const pieces = new Pieces(torrent);
    const file = fs.openSync(path, "w");
    peers.forEach((peer) => download(peer, torrent, pieces, file));
  });
};

function download(peer, torrent, pieces, file) {
  console.log("peer =", peer.ip, "peer port : ", peer.port);
  var socket = new net.Socket();
  console.log("socket created");
  socket.on("error", (error) => {
    console.error("Socket error:", error.message);
  });
  socket.connect(peer.port, peer.ip, () => {
    console.log("sending handshake message...");
    socket.write(message.buildHandshake(torrent));
    console.log("handshake msg sent...");
  });
  // socket.on('error' , console.log);
  console.log("calling onWholeMessage");
  const queue = new Queue(torrent);
  onWholeMsg(socket, (msg) =>
    msgHandler(msg, socket, pieces, queue, file, torrent)
  );
}

// for reveiving the whole message at once
function onWholeMsg(socket, callback) {
  console.log("inside onWholeMessage");
  let savedBuf = Buffer.alloc(0);
  let handshake = true;

  socket.on("data", (recvBuf) => {
    // msgLen calculates the length of a whole message
    const msgLen = () =>
      handshake ? savedBuf.readUInt8(0) + 49 : savedBuf.readInt32BE(0) + 4;
    savedBuf = Buffer.concat([savedBuf, recvBuf]);

    while (savedBuf.length >= 4 && savedBuf.length >= msgLen()) {
      if (handshake) {
        console.log("recieved handshake reply= ", recvBuf.toString("ascii"));
      }
      callback(savedBuf.subarray(0, msgLen()));
      savedBuf = savedBuf.subarray(msgLen());
      handshake = false;
    }
  });
}

// this is the callback function for onWholeMsg
function msgHandler(msg, socket, pieces, queue, file, torrent) {
  console.log("inside msghandler...");
  if (isHandshake(msg)) {
    //if message rcvd is handshake then send interested message
    socket.write(message.buildInterested());
  } else {
    const m = message.parse(msg);

    if (m.id === 0) chokeHandler(socket);
    if (m.id === 1) unchokeHandler(socket, pieces, queue);
    if (m.id === 4) haveHandler(m.payload, socket, pieces, queue);
    if (m.id === 5) bitfieldHandler(socket, pieces, queue, m.payload);
    if (m.id === 7)
      pieceHandler(socket, pieces, queue, torrent, m.payload, file);
  }
}

function chokeHandler(socket) {
  socket.end();
}

function unchokeHandler(socket, pieces, queue) {
  console.log("unchoke handler...");
  queue.choked = false;
  requestPiece(socket, pieces, queue);
}

function haveHandler(payload, socket, pieces, queue) {
  console.log("inside have handler...");
  const pieceIndex = payload.readUInt32BE(0);
  const queueEmpty = queue.length === 0;
  queue.queue(pieceIndex);
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

function bitfieldHandler(socket, pieces, queue, payload) {
  console.log("inside bitfieldHandler...");
  const queueEmpty = queue.length === 0;
  payload.forEach((byte, i) => {
    for (let j = 0; j < 8; j++) {
      if (byte % 2) queue.queue(i * 8 + 7 - j);
      byte = Math.floor(byte / 2);
    }
  });
  if (queueEmpty) requestPiece(socket, pieces, queue);
}

function pieceHandler(socket, pieces, queue, torrent, pieceResp, file) {
  console.log("pieceResp = ", pieceResp);
  pieces.addReceived(pieceResp);

  const offset =
    pieceResp.index * torrent.info["piece length"] + pieceResp.begin;
  fs.write(file, pieceResp.block, 0, pieceResp.block.length, offset, () => {});

  if (pieces.isDone()) {
    socket.end();
    console.log("DONE!");
    try {
      fs.closeSync(file);
    } catch (e) {}
  } else {
    requestPiece(socket, pieces, queue);
  }
}

function requestPiece(socket, pieces, queue) {
  console.log("in requestPiece...");
  if (queue.choked) return null;

  while (queue.length()) {
    const pieceBlock = queue.deque();
    if (pieces.needed(pieceBlock)) {
      socket.write(message.buildRequest(pieceBlock));
      pieces.addRequested(pieceBlock);
      break;
    }
  }
}

function isHandshake(msg) {
  return (
    msg.length === msg.readUInt8(0) + 49 &&
    msg.toString("utf8", 1) === "BitTorrent protocol"
  );
}

export default downlaodTorrent;
