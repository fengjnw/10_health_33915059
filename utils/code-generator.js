// Generate 6-digit numeric verification code

function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

module.exports = {
    generateVerificationCode
};
