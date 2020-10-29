import { MESSAGE_TYPES, RESPONSES } from "../helpers/Constants";
import PushNotificationController from "../controllers/Messages/PushNotificationController";

const MessageHandler = {
  async getByUser(req, res) {
    try {
      const { type, user_id } = req.params;

      let messages = [];

      if (type == MESSAGE_TYPES.PUSH_NOTIFICATION) {
        messages = await PushNotificationController.findByUser(user_id, req.query);
      }
      //   else if (type == MESSAGE_TYPES.EMAIL) {
      //     messages = (await EmailController.findByUser(id)).rows;
      //   }
      else return res.status(400).send("Missing parameters");

      return res.status(200).send(messages);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async toggleRead(req, res) {
    try {
      const message = await PushNotificationController.findOneByUser(req.params.id, req.user.id);

      if (!message) return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);

      const read = req.body.read;

      await PushNotificationController.update({ read }, req.params.id);

      return res.status(200).send(read);
    } catch (error) {
      console.log(error.toString(), error.code);

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default MessageHandler;
