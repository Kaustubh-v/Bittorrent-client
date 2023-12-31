"use strict";
import dgram from "dgram";
import { Buffer } from "buffer";
import { URL } from "url";
// import { url } from 'inspector';
import crypto from "crypto";
import { genId } from "./utils.js";
import { findTorrentSize, infoHash } from "./torrent-parser.js";

export const getPeers = (torrent, callback) => {
  const socket = dgram.createSocket("udp4");
  const url_codes = torrent.announce;
  const url = String.fromCharCode(...url_codes);
  // 1. send connect request
  udpSend(socket, buildConnReq(), url);
  socket.on("message", function (data) {
    console.log("response: ", data);
    if (respType(data) === "connect") {
      // 2. receive and parse connect response
      const connResp = parseConnResp(data);
      console.log(
        "parseConnResp finished - action ",
        connResp.action,
        "\ntransaction id : ",
        connResp.transactionId,
        "\nconncetion id : ",
        connResp.connectionId
      );
      // 3. send announce request
      const announceReq = buildAnnounceReq(connResp.connectionId, torrent);
      console.log("buildAnnounceReq finished");
      udpSend(socket, announceReq, url);
    } else if (respType(data) === "announce") {
      // 4. parse announce response
      const announceResp = parseAnnounceResp(data);
      console.log(
        "parseAnnounceResp - action : ",
        announceResp.action,
        "\ntransaction id : ",
        announceResp.transactionId,
        "\nseeders : ",
        announceResp.seeders,
        "leechers: ",
        announceResp.leechers
      );
      // 5. pass peers to callback
      callback(announceResp.peers);
    }
  });
};

function udpSend(socket, message, rawUrl, callback = () => {}) {
  console.log("called the udp send function...");
  console.log("raw url  is  : ", rawUrl);
  const url = new URL(rawUrl);
  console.log("url port : ", url.port, " url host : ", url.host);
  var url_host = url.host;
  url_host = url_host.slice(0, -3);
  socket.send(message, 0, message.length, url.port, url_host, callback);
}

function respType(resp) {
  const action = resp.readUInt32BE(0);
  if (action === 0) return "connect";
  if (action === 1) return "announce";
}

function buildConnReq() {
  //<Buffer 00 00 04 17 27 10 19 80 00 00 00 00 a6 ec 6b 7d>
  const buf = Buffer.alloc(16); // 2

  // connection id
  buf.writeUInt32BE(0x417, 0); // 3
  buf.writeUInt32BE(0x27101980, 4);
  // action
  buf.writeUInt32BE(0, 8); // 4
  // transaction id
  crypto.randomBytes(4).copy(buf, 12); // 5
  console.log("connection request - ", buf);
  return buf;
}

function parseConnResp(resp) {
  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    connectionId: resp.slice(8),
  };
}

function buildAnnounceReq(connId, torrent, port = 6881) {
  const buf = Buffer.allocUnsafe(98);

  // connection id
  connId.copy(buf, 0);
  // action
  buf.writeUInt32BE(1, 8);
  // transaction id
  crypto.randomBytes(4).copy(buf, 12);
  // info hash
  infoHash(torrent).copy(buf, 16);
  // peerId
  genId().copy(buf, 36);
  // downloaded
  Buffer.alloc(8).copy(buf, 56);
  // left
  findTorrentSize(torrent).copy(buf, 64);
  // uploaded
  Buffer.alloc(8).copy(buf, 72);
  // event
  buf.writeUInt32BE(0, 80);
  // ip address
  buf.writeUInt32BE(0, 80);
  // key
  crypto.randomBytes(4).copy(buf, 88);
  // num want
  buf.writeInt32BE(-1, 92);
  // port
  buf.writeUInt16BE(port, 96);
  console.log("announcement request = ", buf);
  return buf;
}

function parseAnnounceResp(resp) {
  function group(iterable, groupSize) {
    let groups = [];
    for (let i = 0; i < iterable.length; i += groupSize) {
      groups.push(iterable.slice(i, i + groupSize));
    }
    return groups;
  }

  return {
    action: resp.readUInt32BE(0),
    transactionId: resp.readUInt32BE(4),
    leechers: resp.readUInt32BE(8),
    seeders: resp.readUInt32BE(12),
    peers: group(resp.slice(20), 6).map((address) => {
      return {
        ip: address.slice(0, 4).join("."),
        port: address.readUInt16BE(4),
      };
    }),
  };
}
