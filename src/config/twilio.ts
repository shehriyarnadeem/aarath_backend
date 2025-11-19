const twilio = require("twilio");

// Twilio configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Initialize Twilio client
const twilioClient = twilio(accountSid, authToken);

export { twilioClient, twilioPhoneNumber };

/**
 * Send SMS notification using Twilio
 * @param to - Recipient phone number (with country code)
 * @param message - Message content
 * @returns Promise with Twilio response
 */
export const sendSMS = async (to: string, message: string) => {
  try {
    // Ensure phone number has country code (default to +92 for Pakistan)
    const formattedNumber = to.startsWith("+")
      ? to
      : `+92${to.replace(/^0/, "")}`;

    const response = await twilioClient.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: formattedNumber,
    });

    // SMS sent successfully
    return { success: true, sid: response.sid };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return { success: false, error: errorMessage };
  }
};

/**
 * Send WhatsApp message using Twilio with template support
 * @param to - Recipient WhatsApp number (with country code)
 * @param message - Message content (only used for freeform messages)
 * @param templateData - Optional template data for WhatsApp Business templates
 * @returns Promise with Twilio response
 */
export const sendWhatsApp = async (
  to: string,
  message: string,
  templateData?: {
    contentSid: string;
    contentVariables: any;
  }
) => {
  try {
    // Ensure phone number has country code and WhatsApp prefix
    const formattedNumber = to.startsWith("+")
      ? to
      : `+92${to.replace(/^0/, "")}`;
    const whatsappNumber = formattedNumber;
    // Use template if provided, otherwise use freeform message
    const messageData: any = templateData
      ? {
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${whatsappNumber}`,
          contentSid: templateData.contentSid,
          contentVariables: templateData.contentVariables,
        }
      : {
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${whatsappNumber}`,
          body: message,
        };

    const response = await twilioClient.messages.create(messageData);

    // WhatsApp sent successfully
    return { success: true, sid: response.sid };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("WhatsApp sending failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
};

/**
 * Send WhatsApp winner notification using approved template
 * @param to - Recipient WhatsApp number (with country code)
 * @param winnerName - Winner's name
 * @param productName - Product name
 * @param bidAmount - Winning bid amount
 * @returns Promise with Twilio response
 */
export const sendWhatsAppWinnerNotification = async (
  to: string,
  winnerName: string,
  productName: string,
  bidAmount: number
) => {
  try {
    // First try with template (if you have one approved)
    // You need to create and get approval for a WhatsApp template in your Twilio console
    // For now, we'll use a generic template structure

    const templateData = {
      // Replace with your actual approved template SID
      contentSid:
        process.env.WHATSAPP_WINNER_TEMPLATE_SID ||
        "HXb5b62575e6e4ff6129ad7c8efe1f983e",
      contentVariables: '{"1":"12/1","2":"3pm"}',
    };

    // If template SID is configured, use template
    if (templateData.contentSid) {
      return await sendWhatsApp(to, "", templateData);
    } else {
      // Fallback to regular message (will fail outside 24-hour window)
      const message = `🎉 Congratulations ${winnerName}! You won the auction for "${productName}" with a bid of $${bidAmount}. Please contact us to complete your purchase.`;
      return await sendWhatsApp(to, message);
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("WhatsApp winner notification failed:", errorMessage);
    return { success: false, error: errorMessage };
  }
};
