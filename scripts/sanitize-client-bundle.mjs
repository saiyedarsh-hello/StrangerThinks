import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, "../lib/chapterQuestions.ts");

let content = fs.readFileSync(targetFile, "utf-8");
content = content.replace(/(["']?correctAnswerId["']?:\s*)["'][^"']*["']/g, '$1""');
content = content.replace(/(["']?correctOrder["']?:\s*)\[[^\]]*\]/g, '$1[]');
fs.writeFileSync(targetFile, content, "utf-8");
console.log("Successfully sanitized lib/chapterQuestions.ts: All answer keys removed from client bundle!");
