require('dotenv').config({ path: './.env' });
const nodemailer = require('nodemailer');

let smtpPass = process.env.SMTP_PASS;
if (smtpPass && smtpPass.startsWith('"') && smtpPass.endsWith('"')) {
    smtpPass = smtpPass.substring(1, smtpPass.length - 1);
}

console.log('SMTP config:');
console.log('  HOST:', process.env.SMTP_HOST);
console.log('  PORT:', process.env.SMTP_PORT);
console.log('  USER:', process.env.SMTP_USER);
console.log('  FROM:', process.env.SMTP_FROM);
console.log('  PASS: (' + (smtpPass ? smtpPass.length + ' chars' : 'NOT SET') + ')');
console.log('');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: smtpPass,
    },
    tls: {
        rejectUnauthorized: false
    }
});

async function test() {
    console.log('Verifying SMTP connection...');
    try {
        await transporter.verify();
        console.log('✓ SMTP connection OK');
    } catch (err) {
        console.error('✗ SMTP connection FAILED:', err.message);
        process.exit(1);
    }

    const recipient = process.argv[2] || process.env.SMTP_USER;
    console.log('Sending test email to:', recipient);

    try {
        const info = await transporter.sendMail({
            from: `Ticketing Test <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: recipient,
            subject: 'Test de notificaciones - Ticketing',
            html: '<h1>Funciona</h1><p>El sistema de correo está configurado correctamente.</p>'
        });
        console.log('✓ Email sent! Message ID:', info.messageId);
    } catch (err) {
        console.error('✗ Send FAILED:', err.message);
    }
}

test();
