import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
import { PET_COLORS, COFFEE_COLORS, PET_FRAMES, COFFEE_FRAMES } from './petFrames';

const SCALE = 10;
const FRAME_SIZE = 16;
const OUT_DIR = path.join(process.cwd(), 'public', 'pets');

if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

function renderSpriteSheet(frames: string[][], colors: Record<string, string>, name: string) {
    const width = FRAME_SIZE * SCALE * frames.length;
    const height = FRAME_SIZE * SCALE;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    frames.forEach((frameStrArray, frameIndex) => {
        const offsetX = frameIndex * FRAME_SIZE * SCALE;
        frameStrArray.forEach((row, y) => {
            for (let x = 0; x < row.length; x++) {
                const char = row[x];
                if (colors[char]) {
                    ctx.fillStyle = colors[char];
                    ctx.fillRect(offsetX + x * SCALE, y * SCALE, SCALE, SCALE);
                }
            }
        });
    });

    const outPath = path.join(OUT_DIR, `${name}.png`);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outPath, buffer);
    console.log(`Generated: ${name}.png`);
}

const animations = {
    walk: ['walk1', 'walk2', 'walk3', 'walk4'],
    idle: ['idle'],
    blink: ['blink'],
    look_left: ['look_left'],
    look_right: ['look_right'],
    happy: ['happy'],
    inflate: ['inflate1', 'inflate2'],
    water: ['water1', 'water2']
};

function generate(petName: string, framesData: Record<string, string[]>, colorsData: Record<string, string>) {
    for (const [animName, frameKeys] of Object.entries(animations)) {
        const frames = frameKeys.map(key => framesData[key]);
        renderSpriteSheet(frames, colorsData, `${petName}_${animName}`);
    }
}

generate('bmo', PET_FRAMES, PET_COLORS);
generate('coffee', COFFEE_FRAMES, COFFEE_COLORS);
