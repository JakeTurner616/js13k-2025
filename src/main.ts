// src/main.ts
const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
canvas.width = 320;
canvas.height = 240;

const ctx = canvas.getContext("2d")!;
ctx.fillStyle = "#000";
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.fillStyle = "#fff";
ctx.font = "20px monospace";
ctx.fillText("Hello JS13k!", 50, 120);
