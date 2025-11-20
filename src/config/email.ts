const nodemailer = require("nodemailer");

/**
 * Email configuration and service
 * Uses SMTP for sending emails (Gmail, Outlook, or custom SMTP)
 */

// Email transporter configuration
const createEmailTransporter = () => {
  // Support for multiple email providers
  const emailProvider = process.env.EMAIL_PROVIDER || "gmail";

  let transportConfig: any = {};

  switch (emailProvider.toLowerCase()) {
    case "gmail":
      transportConfig = {
        service: "gmail",
        debug: true,
        logger: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD, // Use App Password for Gmail
        },
      };
      break;

    case "outlook":
      transportConfig = {
        service: "hotmail",
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      };
      break;

    case "smtp":
    default:
      transportConfig = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      };
      break;
  }

  return nodemailer.createTransport(transportConfig);
};

/**
 * Send email notification
 * @param to - Recipient email address
 * @param subject - Email subject
 * @param message - Plain text message
 * @param htmlMessage - Optional HTML version of the message
 * @returns Promise with email result
 */
export const sendEmail = async (
  to: string,
  subject: string,
  message: string,
  htmlMessage?: string
) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return {
        success: false,
        error: "Email credentials not configured",
      };
    }

    const transporter = createEmailTransporter();

    const mailOptions = {
      from: {
        name: process.env.EMAIL_FROM_NAME || "Aarath Auctions",
        address: process.env.EMAIL_USER,
      },
      to: to,
      subject: subject,
      text: message,
      html: htmlMessage || `<p>${message.replace(/\n/g, "<br>")}</p>`,
    };
    console.log("mail payload", mailOptions);
    const result = await transporter.sendMail(mailOptions);
    console.log("Email sent:", result);
    return {
      success: true,
      messageId: result.messageId,
      response: result.response,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Create HTML email template for winner notification
 * @param winnerName - Winner's name
 * @param auctionTitle - Auction title
 * @param winningBid - Winning bid amount
 * @returns HTML email content
 */
export const createWinnerNotificationHTML = (
  winnerName: string,
  auctionTitle: string,
  winningBid: string
): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Congratulations! You Won the Auction</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .highlight { background: #e8f5e8; padding: 15px; border-left: 4px solid #4caf50; margin: 20px 0; }
            .steps { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
            .trophy { font-size: 48px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="trophy">🏆</div>
                <h1>Congratulations ${winnerName}!</h1>
                <p>You have won the auction!</p>
            </div>
            
            <div class="content">
                <div class="highlight">
                    <h2>🎉 Auction Won: ${auctionTitle}</h2>
                    <p><strong>Your Winning Bid: ₹${winningBid}</strong></p>
                </div>
                
                <div class="steps">
                    <h3>📞 Next Steps:</h3>
                    <ul>
                        <li>Contact us to arrange payment and delivery</li>
                        <li><strong>Payment deadline: 24 hours from now</strong></li>
                        <li>For support, call: +92 300 1234567</li>
                        <li>Email us at: support@aarath.com</li>
                    </ul>
                </div>
                
                <p>Thank you for using Aarath! We're excited to help you complete your purchase.</p>
            </div>
            
            <div class="footer">
                <p>This email was sent because you won an auction on Aarath.</p>
                <p>If you have any questions, please contact our support team.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};
