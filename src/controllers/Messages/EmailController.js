import db from "../../db";
import MessageController from "./MessageController";

const EmailController = {
  // async create(emailData) {
  //   const { /*emailData...,*/ ...messageData } = emailData; //contact table only has id
  //   let client;
  //   try {
  //     client = await db.transaction("BEGIN");
  //     const message = (
  //       await db.transaction(
  //         `INSERT INTO message
  //       (${Object.keys(messageData).join(",")})
  //       VALUES
  //       (${Object.keys(messageData)
  //         .map((e, i) => {
  //           return `$${i + 1}`;
  //         })
  //         .join(",")}) RETURNING *`,
  //         Object.values(messageData),
  //         client
  //       )
  //     ).rows[0];
  //     emailData = { id: message.id };
  //     const email = (
  //       await db.transaction(
  //         `INSERT INTO email
  //       (${Object.keys(emailData).join(",")})
  //       VALUES
  //       (${Object.keys(emailData)
  //         .map((e, i) => {
  //           return `$${i + 1}`;
  //         })
  //         .join(",")})`,
  //         Object.values(emailData),
  //         client
  //       )
  //     ).rows[0];
  //     await db.transaction("COMMIT", [], client);
  //     return { ...message, ...email };
  //   } catch (error) {
  //     await db.transaction("ROLLBACK", [], client);
  //     throw error;
  //   }
  // }
};

export default EmailController;
