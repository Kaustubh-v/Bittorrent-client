"use strict";
import crypto from "crypto";

let id = null;

export const genId = () => {
  if (!id) {
    id = crypto.randomBytes(20);
    Buffer.from("-UW14-").copy(id, 0);
    // UW - uTorerrnt Web , version 1.4.0
  }
  return id;
};
