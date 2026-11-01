/* 毎朝のバックアップ(backup-日付.enc)を元に戻す: BACKUP_PASSWORD=... node server/decrypt-backup.mjs backup-2026-11-01.enc > backup.json */
import fs from "node:fs";
import crypto from "node:crypto";
const buf = fs.readFileSync(process.argv[2]);
const salt = buf.subarray(0, 16), iv = buf.subarray(16, 28), tag = buf.subarray(28, 44), enc = buf.subarray(44);
const d = crypto.createDecipheriv("aes-256-gcm", crypto.scryptSync(process.env.BACKUP_PASSWORD || "", salt, 32), iv);
d.setAuthTag(tag);
process.stdout.write(Buffer.concat([d.update(enc), d.final()]).toString("utf8"));
