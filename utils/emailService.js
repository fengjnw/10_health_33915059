const nodemailer = require('nodemailer');

let transporter = null;

async function initializeEmailService() {
    try {
        // Create a test account with Ethereal
        const testAccount = await nodemailer.createTestAccount();

        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });

        console.log('✓ Email service initialized with Ethereal test account');
        console.log(`  Test account: ${testAccount.user}`);

        return transporter;
    } catch (error) {
        console.error('✗ Failed to initialize email service:', error);
        throw error;
    }
}

async function sendVerificationEmail(to, verificationCode) {
    if (!transporter) {
        await initializeEmailService();
    }

    const verificationLink = `${process.env.APP_URL || 'http://localhost:3000'}/verify-email?code=${verificationCode}`;

    const mailOptions = {
        from: '"Health & Fitness Tracker" <noreply@healthtracker.com>',
        to: to,
        subject: 'Verify Your Email Address',
        html: `
      <h2>Email Verification</h2>
      <p>You requested to change your email address. Please verify this new email by clicking the link below or entering the verification code.</p>
      <p><strong>Verification Code:</strong> <code style="font-size: 18px; background: #f0f0f0; padding: 5px 10px;">${verificationCode}</code></p>
      <p>Or click this link to verify directly:</p>
      <p><a href="${verificationLink}" style="color: #16a085; text-decoration: none;">Verify Email</a></p>
      <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        // Log the preview URL for development
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('✓ Verification email sent. Preview URL:', previewUrl);

        return {
            success: true,
            previewUrl: previewUrl
        };
    } catch (error) {
        console.error('✗ Failed to send verification email:', error);
        throw error;
    }
}

async function sendPasswordResetEmail(to, verificationCode, userName) {
    if (!transporter) {
        await initializeEmailService();
    }

    const mailOptions = {
        from: '"Health & Fitness Tracker" <noreply@healthtracker.com>',
        to: to,
        subject: 'Reset Your Password',
        html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${userName || 'User'},</p>
      <p>We received a request to reset your password. Use the verification code below to proceed:</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #16a085;">${verificationCode}</p>
      <p><strong>⚠️ This code expires in 1 hour.</strong></p>
      <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
      <hr/>
      <p style="color: #999; font-size: 12px;">This is an automated email. Please do not reply to this message.</p>
    `
    };

    try {
        const info = await transporter.sendMail(mailOptions);

        // Log the preview URL for development
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log('✓ Password reset email sent. Preview URL:', previewUrl);

        return {
            success: true,
            previewUrl: previewUrl
        };
    } catch (error) {
        console.error('✗ Failed to send password reset email:', error);
        throw error;
    }
}

module.exports = {
    initializeEmailService,
    sendVerificationEmail,
    sendPasswordResetEmail
};
