const { createCanvas } = require('canvas');
const crypto = require('crypto');

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateCaptcha(length = 5) {
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += CHARS[bytes[i] % CHARS.length];
    }
    return code;
}

function generateCaptchaImage(code) {
    const width = 400;
    const height = 150;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    // Add subtle dots
    ctx.fillStyle = '#cccccc';
    for (let i = 0; i < 50; i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * width, Math.random() * height, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw each character with random offset and rotation
    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
        const x = charWidth * (i + 1);
        const y = height / 2 + (Math.random() * 16 - 8);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.3);

        // Random color for each char
        const colors = ['#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code[i], 0, 0);

        ctx.restore();
    }

    // Add border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    return canvas.toBuffer('image/png');
}

module.exports = { generateCaptcha, generateCaptchaImage };
