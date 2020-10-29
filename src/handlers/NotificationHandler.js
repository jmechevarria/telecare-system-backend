// import PushNotificationController from "../controllers/Messages/PushNotificationController";
// import { Messenger, CHANNELS } from "../helpers/Messenger";
// import { RESPONSES } from "../helpers/Constants";
// import ContactController from "../controllers/Users/ContactController";

// const NotificationHandler = {
//   async notifyContacts(req, res) {
//     const { via } = req.params;
//     if (via === "all") {
//       const recipients = (await ContactController.findByClientAccount(req.body.client_account_id)).rows;
//       // await NotificationController.create({
//       //   channels: [CHANNEL.EMAIL, CHANNEL.NOTIFICATION],
//       //   ...req.body
//       // });
//       // CassandraController.upsertIncident(
//       //   seniorPerson.id,
//       //   false,
//       //   Object.values(dataSet).reduce((acc, elem) => {
//       //     acc.push({ hbpm: elem.heart_beat, ...elem });
//       //     return acc;
//       //   }, [])
//       // ).then(incidentID => {
//       // await NotificationController.create(
//       //   {
//       //     channels: [CHANNEL.EMAIL, CHANNEL.NOTIFICATION],
//       //     ...req.body,

//       //   },
//       //   recipients
//       // );

//       console.log(req.body, req.params, req.query);

//       Messenger.sendMessage({ recipients, ...req.body }, [CHANNELS.EMAIL, CHANNELS.NOTIFICATION]);
//       // });
//     } else if (via === "email") Messenger.sendMessage({ ...req.body }, [CHANNELS.EMAIL]);

//     // try {
//     //   if (senior_person) {
//     //     const contacts = await UserController.findContactsByFitbitAccount(senior_person.id);
//     //     if (!contacts.length) return res.status(200).send("Account has no registered contacts");
//     //     return res.status(200).send(contacts);
//     //   }
//     //   return res.status(400).send("Missing parameters");
//     // } catch (error) {
//     //   console.log("errorrrrrr", error);
//     //   return res.status(500).send(error.toString());
//     // }
//   },

//   async update(req, res) {
//     try {
//       const { values, where } = req.body;
//       if (values) {
//         const rowCount = await PushNotificationController.update(values, where);
//         if (!rowCount) return res.status(404).send("Incorrect 'values' parameters");

//         return res.status(200).send();
//       }

//       return res.status(400).send("Missing 'values' parameter");
//     } catch (error) {
//       console.log(error.toString());

//       return res.status(500).send(RESPONSES.GENERIC_500);
//     }
//   },

//   async delete(req, res) {
//     console.log(req.params);

//     try {
//       const { notification_endpoint, user_id } = req.params;
//       await PushNotificationController.delete({
//         endpoint: notification_endpoint,
//         user_id,
//       });

//       return res.status(200).send("notification deleted");
//     } catch (error) {
//       console.log(error.toString());

//       return res.status(500).send(RESPONSES.GENERIC_500);
//     }
//   },
// };

// export default NotificationHandler;
