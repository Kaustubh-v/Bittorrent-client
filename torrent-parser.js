'use strict';
import bencode from 'bencode';
import fs from 'fs';
import crypto from 'crypto'

export const openTorrentFile = (filepath) =>{
    return bencode.decode(fs.readFileSync(filepath));
};

export const infoHash = torrent =>{
    const info = bencode.encode(torrent.info);
    return crypto.createHash('sha1').update(info).digest();
};

export const findTorrentSize = torrent =>{
        const size = torrent.info.files ?
            torrent.info.files.map(file => file.length).reduce((a, b) => a+b):
            torrent.info.length;
        
        return Buffer.from(size.toString(16), 'hex');

};