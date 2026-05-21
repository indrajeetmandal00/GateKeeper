function generateOtp() {
    const digits = "0123456789";
    let otp = "";
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}
function getOtpHTML(otp) {
    return `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eaeaed; border-radius: 10px; background-color: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #f0f0f5;">
                <h2 style="color: #27272a; margin: 0; font-size: 24px;">Security Verification</h2>
            </div>
            <div style="padding: 30px 0;">
                <p style="font-size: 16px; color: #52525b; line-height: 1.6;">Hello,</p>
                <p style="font-size: 16px; color: #52525b; line-height: 1.6;">Please use the following One Time Password (OTP) to complete your verification process. For your security, do not share this code with anyone.</p>
                <div style="text-align: center; margin: 35px 0;">
                    <span style="display: inline-block; font-size: 36px; font-weight: bold; color: #3b82f6; letter-spacing: 8px; background-color: #eff6ff; padding: 20px 40px; border-radius: 8px; border: 1px solid #bfdbfe;">${otp}</span>
                </div>
                <p style="font-size: 14px; color: #a1a1aa; text-align: center; margin-top: 40px;">If you did not request this code, please ignore this email.</p>
            </div>
        </div>
    `;
}
export { generateOtp, getOtpHTML };