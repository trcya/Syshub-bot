const { createCanvas } = require('canvas');
const crypto = require('crypto');

const DIGITS = '0123456789';

function generateCaptcha(length = 4) {
    let code = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        code += DIGITS[bytes[i] % DIGITS.length];
    }
    return code;
}

function generateCaptchaImage(code) {
    const width = 400;
    const height = 120;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Subtle noise lines
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
    }

    // Draw each digit with large bold font, centered and spaced evenly
    const charWidth = width / (code.length + 1);
    for (let i = 0; i < code.length; i++) {
        const x = charWidth * (i + 1);
        const y = height / 2 + (Math.random() * 8 - 4);

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate((Math.random() - 0.5) * 0.2);

        const colors = ['#1a1a2e', '#16213e', '#0f3460', '#333333'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.font = 'bold 72px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(code[i], 0, 0);

        ctx.restore();
    }

    // Light border
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, width, height);

    return canvas.toBuffer('image/png');
}

module.exports = { generateCaptcha, generateCaptchaImage };
