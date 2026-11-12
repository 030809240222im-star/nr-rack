import fs from "node:fs";
const F=process.env.FAKE_DB;export const DB=JSON.parse(fs.readFileSync(F,"utf8"));
export function save(){fs.writeFileSync(F,JSON.stringify(DB,null,1))}
process.on("exit",save);
