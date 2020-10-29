import SubscriptionController from "../controllers/SubscriptionController";
import UserController from "../controllers/Users/UserController";
import nodemailer from "nodemailer";

const webpush = require("web-push");
webpush.setVapidDetails("mailto:eestradapante@gmail.com", process.env.PUBLIC_VAPID, process.env.PRIVATE_VAPID);

class Messenger {
  static sendMessage(data, channels) {
    if (channels.includes(CHANNELS.NOTIFICATION)) {
      sendNotification(data);
    }
    if (channels.includes(CHANNELS.EMAIL)) {
      sendEmail(data);
    }
    if (channels.includes(CHANNELS.TEXT_MESSAGE)) {
      sendTextMessage(data);
    }
  }
}

const sendNotification = async (notification) => {
  try {
    // const recipients = await UserController.findPNRecipientsDataByClientAccount(notification.client_account_id);
    console.log("morrrrrrreeeeeeeeeeeeeeeeeeeeee", notification);

    for (const recipient of notification.recipients) {
      const subscriptions = (await SubscriptionController.findByUser(recipient.id)).rows;
      for (const subscription of subscriptions) {
        try {
          console.log("FINALLYYYYYYYYYYYYYYYYYYYYYYYYYYY", subscription);
          await webpush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            JSON.stringify({ userID: recipient.id, ...notification })
          );

          console.log("good");
        } catch (error) {
          console.error("notification error", error, error.statusCode, error.endpoint);
          if (error.statusCode === 410) {
            SubscriptionController.deleteByEndpoint(error.endpoint);
          } else if (error.statusCode === 503 && JSON.parse(error.body).errno === 202) {
            // sendNotification(subject, payload, severity, [user]);
          }
        }
      }
    }
  } catch (error) {
    console.log(error.toString());
    throw error;
  }
};

const sendEmail = async (email) => {
  var transporter = nodemailer.createTransport({
    // service: "gmail",
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: "eestradapante@gmail.com",
      //pass: "Pespante5*",
	  pass: process.env.MAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: "eestradapante@gmail.com",
    subject: email.subject,
    text: email.payload + "<br>" + email.severity,
  };

  email.recipients.forEach((recipient) => {
    mailOptions.to = recipient.email;

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error.toString());
      } else {
        console.log("Email sent: " + recipient.email + " " + info.response);
      }
    });
  });
};

export const SUBJECT = {
  UNCONFIRMED_INCIDENT: {
    id: 1,
    message: "UNCONFIRMED_INCIDENT",
  },
  UNCONFIRMED_ACCIDENT: {
    id: 2,
    message: "UNCONFIRMED_ACCIDENT",
  },
  UNAUTHORIZED_TOKEN: {
    id: 3,
    message: "UNAUTHORIZED_TOKEN",
  },
};

export const SEVERITY = {
  INFORMATION: "information",
  WARNING: "warning",
  DANGER: "danger",
  CRITICAL: "critical",
};

export const CHANNELS = {
  EMAIL: 1,
  NOTIFICATION: 2,
  TEXT_MESSAGE: 3,
};

export { Messenger };
