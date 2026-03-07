/**
 * Sprite Sheet Builder
 * 
 * Takes individual pixel art frame PNGs (with green screen backgrounds),
 * removes the green background, crops to consistent sizes, and stitches
 * them into horizontal sprite sheet strips.
 * 
 * Usage: node scripts/buildSpriteSheet.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = process.argv[2] || './artifacts';
const OUTPUT_DIR = path.resolve('frontend/public/pets');

// Ensure output dir exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Remove green (#00FF00) background and make it transparent.
 * Uses a tolerance range to handle anti-aliased edges.
 */
async function removeGreenBG(inputPath) {
    const img = sharp(inputPath);
    const { data, info } = await img.raw().ensureAlpha().toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const pixels = Buffer.from(data);

    for (let i = 0; i < width * height; i++) {
        const offset = i * channels;
        const r = pixels[offset];
        const g = pixels[offset + 1];
        const b = pixels[offset + 2];

        // Green screen: high green, low red, low blue (with tolerance)
        if (g > 180 && r < 120 && b < 120) {
            pixels[offset + 3] = 0; // Make transparent
        }
        // Also handle bright pure green edges
        if (g > 200 && r < 80 && b < 80) {
            pixels[offset + 3] = 0;
        }
    }

    return sharp(pixels, {
        raw: { width, height, channels }
    }).png();
}

/**
 * Build a horizontal sprite sheet from an array of frame image paths.
 */
async function buildSheet(name, framePaths, outputSize = 128) {
    console.log(`\nBuilding sprite sheet: ${name}`);
    console.log(`  Frames: ${framePaths.length}`);

    // Process each frame: remove green BG, resize to output size
    const processedFrames = [];
    for (const framePath of framePaths) {
        const fullPath = path.join(ARTIFACTS_DIR, framePath);
        if (!fs.existsSync(fullPath)) {
            console.log(`  ⚠️  Frame not found: ${framePath}, skipping`);
            continue;
        }
        console.log(`  Processing: ${framePath}`);
        const processed = await removeGreenBG(fullPath);
        const resized = await processed
            .resize(outputSize, outputSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
        processedFrames.push(resized);
    }

    if (processedFrames.length === 0) {
        console.log(`  ❌ No frames found, skipping sheet`);
        return;
    }

    // Create composite: horizontal strip
    const sheetWidth = outputSize * processedFrames.length;
    const sheetHeight = outputSize;

    const composites = processedFrames.map((buf, i) => ({
        input: buf,
        left: i * outputSize,
        top: 0
    }));

    const outPath = path.join(OUTPUT_DIR, `${name}.png`);
    await sharp({
        create: {
            width: sheetWidth,
            height: sheetHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        }
    })
        .composite(composites)
        .png()
        .toFile(outPath);

    console.log(`  ✅ Saved: ${outPath} (${sheetWidth}x${sheetHeight}, ${processedFrames.length} frames)`);
}

// ── Character definitions ──────────────────────────────────────────
// Each character has walk and idle sprite sheets

const characters = {
    latte_art: {
        walk: [
            'latte_walk_f1_1772773677388.png',
            'latte_walk_f2_1772773690337.png',
            'latte_walk_f3_1772773701399.png',
            'latte_walk_f4_1772773729496.png',
        ],
        idle: [
            'latte_idle_f1_1772773741798.png',
            'latte_idle_f2_1772773756492.png',
        ],
    },
    french_press: {
        walk: [
            'french_walk_f1_1772773801746.png',
            // More frames to be added after quota resets
        ],
        idle: [
            // To be added
        ],
    },
};

// ── Main ───────────────────────────────────────────────────────────

async function main() {
    for (const [charName, states] of Object.entries(characters)) {
        for (const [stateName, frames] of Object.entries(states)) {
            if (frames.length > 0) {
                await buildSheet(`${charName}_${stateName}`, frames, 128);
            }
        }
    }
    console.log('\n🎉 Done!');
}

main().catch(console.error);
