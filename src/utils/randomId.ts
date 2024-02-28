import crypto from "crypto";
export function newComponentId() {
  return `${Date.now().toString(36)}.${crypto
    .randomBytes(4)
    .toString("base64url")}`;
}
