const nodemailer = require("nodemailer");

/**
 * Email configuration and service
 * Uses SMTP for sending emails (Gmail, Outlook, or custom SMTP)
 */

interface WelcomeEmailData {
  name: string;
  email: string;
  role: string;
  businessName?: string;
  city?: string;
  state?: string;
}
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

export const sendWelcomeEmail = async (
  userData: WelcomeEmailData
): Promise<boolean> => {
  try {
    const { name, email, role, businessName, city, state } = userData;
    const transporter = createEmailTransporter();
    const location = city && state ? `${city}, ${state}` : state || "Pakistan";
    const displayName = businessName || name || "Valued User";

    const htmlContent = generateWelcomeEmailHTML({
      name: displayName,
      role,
      location,
      businessName,
    });

    const mailOptions = {
      from: {
        name: "Aarath Team",
        address: process.env.EMAIL_USER || "noreply@aarath.app",
      },
      to: email,
      subject: `🌾 Welcome to Aarath - Pakistan's First Agricultural Marketplace!`,
      html: htmlContent,
      text: generatePlainTextWelcome({
        name: displayName,
        role,
        location,
      }),
    };

    const result = await transporter.sendMail(mailOptions);
    console.log("✅ Welcome email sent successfully:", result.messageId);
    return true;
  } catch (error) {
    console.error("❌ Error sending welcome email:", error);
    return false;
  }
};

export const generateWelcomeEmailHTML = (data: {
  name: string;
  role: string;
  location: string;
  businessName?: string;
}): string => {
  const { name, role, location, businessName } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Aarath</title>
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; background: white; }
            .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 40px 30px; text-align: center; }
            .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
            .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.9; }
            .content { padding: 40px 30px; }
            .welcome-text { font-size: 18px; color: #1f2937; margin-bottom: 20px; }
            .user-info { background: #f9fafb; border-left: 4px solid #059669; padding: 20px; margin: 25px 0; border-radius: 8px; }
            .user-info h3 { margin: 0 0 15px 0; color: #059669; font-size: 18px; }
            .user-detail { margin: 8px 0; display: flex; align-items: center; }
            .user-detail strong { min-width: 100px; color: #374151; }
            .features { margin: 30px 0; }
            .feature { display: flex; align-items: flex-start; margin: 20px 0; padding: 15px; border-radius: 8px; background: #f0f9f4; }
            .feature-icon { font-size: 24px; margin-right: 15px; }
            .feature-content h4 { margin: 0 0 5px 0; color: #059669; font-size: 16px; }
            .feature-content p { margin: 0; color: #6b7280; font-size: 14px; }
            .cta-section { text-align: center; margin: 30px 0; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; }
            .footer { background: #1f2937; color: #9ca3af; padding: 30px; text-align: center; font-size: 14px; }
            .footer a { color: #10b981; text-decoration: none; }
            .social-links { margin: 20px 0; }
            .social-links a { display: inline-block; margin: 0 10px; color: #10b981; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <!-- Header -->
            <div class="header">
                <h1>🌾 Welcome to Aarath!</h1>
                <p>Pakistan's First Agricultural Marketplace</p>
            </div>

            <!-- Content -->
            <div class="content">
                <p class="welcome-text">
                    Dear <strong>${name}</strong>,
                </p>
                
                <p>Congratulations! 🎉 You have successfully joined Aarath, Pakistan's pioneering digital agricultural marketplace. We're thrilled to have you as part of our growing community of farmers, traders, and agricultural professionals.</p>

                <div class="user-info">
                    <h3>📋 Your Profile Details</h3>
                    <div class="user-detail">
                        <strong>Role:</strong> <span>${role}</span>
                    </div>
                    ${businessName ? `<div class="user-detail"><strong>Business:</strong> <span>${businessName}</span></div>` : ""}
                    <div class="user-detail">
                        <strong>Location:</strong> <span>${location}</span>
                    </div>
                </div>

                <div class="features">
                    <h3>🚀 What you can do now:</h3>
                    
                    <div class="feature">
                        <span class="feature-icon">🛒</span>
                        <div class="feature-content">
                            <h4>Buy & Sell Products</h4>
                            <p>Access thousands of agricultural products from verified sellers across Pakistan</p>
                        </div>
                    </div>

                    <div class="feature">
                        <span class="feature-icon">🔨</span>
                        <div class="feature-content">
                            <h4>Participate in Auctions</h4>
                            <p>Join live auctions to get the best deals on bulk agricultural commodities</p>
                        </div>
                    </div>

                    <div class="feature">
                        <span class="feature-icon">📈</span>
                        <div class="feature-content">
                            <h4>Track Market Prices</h4>
                            <p>Stay updated with real-time market prices and trends</p>
                        </div>
                    </div>

                    <div class="feature">
                        <span class="feature-icon">🤝</span>
                        <div class="feature-content">
                            <h4>Connect with Community</h4>
                            <p>Network with farmers, traders, and suppliers across the country</p>
                        </div>
                    </div>
                </div>

                <div class="cta-section">
                    <a href="https://aarath.app" class="cta-button">
                        Start Exploring Aarath 🌾
                    </a>
                </div>

                <p>If you have any questions or need assistance, our support team is always here to help. You can reach us at <a href="mailto:support@aarath.app">support@aarath.app</a> or through our mobile app.</p>

                <p>Thank you for choosing Aarath. Together, let's revolutionize Pakistan's agricultural sector!</p>

                <p>Best regards,<br>
                <strong>The Aarath Team</strong><br>
                <em>Empowering Pakistan's Agriculture 🇵🇰</em></p>
            </div>

            <!-- Footer -->
            <div class="footer">
                <div class="social-links">
                    <a href="https://aarath.app">🌐 Website</a>
                    <a href="#">📱 Mobile App</a>
                    <a href="#">📞 Support</a>
                </div>
                
                <p>© 2024 Aarath. All rights reserved.</p>
                <p>This email was sent to ${data.name} because you signed up for Aarath.</p>
                
                <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
                    Aarath - Pakistan's First Agricultural Marketplace<br>
                    Connecting farmers, traders, and suppliers nationwide
                </p>
            </div>
        </div>
    </body>
    </html>
    `;
};

export const generatePlainTextWelcome = (data: {
  name: string;
  role: string;
  location: string;
}): string => {
  return `
Welcome to Aarath - Pakistan's First Agricultural Marketplace! 🌾

Dear ${data.name},

Congratulations! You have successfully joined Aarath. We're thrilled to have you as part of our growing agricultural community.

Your Profile:
- Role: ${data.role}
- Location: ${data.location}

What you can do now:
🛒 Buy & Sell agricultural products
🔨 Participate in live auctions  
📈 Track real-time market prices
🤝 Connect with the agricultural community

Get started: https://aarath.app

Need help? Contact us at support@aarath.app

Best regards,
The Aarath Team
Empowering Pakistan's Agriculture 🇵🇰
    `;
};
