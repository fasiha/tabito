import crypto from "crypto";
export function newComponentId() {
  return `${Date.now().toString(36)}.${crypto
    .randomBytes(2)
    .toString("base64url")}`;
}
