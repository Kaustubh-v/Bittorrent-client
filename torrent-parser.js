"use strict";
import bencode from "bencode";
import fs from "fs";
import crypto from "crypto";
import { Buffer } from "buffer";

export const openTorrentFile = (filepath) => {
  return bencode.decode(fs.readFileSync(filepath));
};

export const infoHash = (torrent) => {
  const info = bencode.encode(torrent.info);
  return crypto.createHash("sha1").update(info).digest();
};

export const findTorrentSize = (torrent) => {
  const size = torrent.info.files
    ? torrent.info.files.map((file) => file.length).reduce((a, b) => a + b)
    : torrent.info.length;

  return Buffer.from(size.toString(16), "hex");
};

export const BLOCK_LEN = Math.pow(2, 14);

export const pieceLen = (torrent, pieceIndex) => {
  const totalLength = Number(
    BigInt("0x" + findTorrentSize(torrent).toString("hex"))
  );

  const pieceLength = torrent.info["piece length"];

  const lastPieceLength = totalLength % pieceLength;
  const lastPieceIndex = Math.floor(totalLength / pieceLength);

  return lastPieceIndex === pieceIndex ? lastPieceLength : pieceLength;
};

export const blocksPerPiece = (torrent, pieceIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);
  return Math.ceil(pieceLength / BLOCK_LEN);
};

export const blockLen = (torrent, pieceIndex, blockIndex) => {
  const pieceLength = pieceLen(torrent, pieceIndex);

  const lastPieceLength = pieceLength % BLOCK_LEN;
  const lastPieceIndex = Math.floor(pieceLength / BLOCK_LEN);

  return blockIndex === lastPieceIndex ? lastPieceLength : BLOCK_LEN;
};
