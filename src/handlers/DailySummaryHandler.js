import DailySummaryController from "../controllers/DailySummaryController";
import UserController from "../controllers/Users/UserController";
import { RESPONSES } from "../helpers/Constants";

const DailySummaryHandler = {
  async getByDateRange(req, res) {
    try {
      const { client_account_id, from, to } = req.params;

      const dailySummaries = await DailySummaryController.getByDateRange(client_account_id, from, to);

      const users = await UserController.findByClientAccount(client_account_id);

      //check if the requested client accounts are linked to the requesting user
      if (
        !users.some((user) => {
          return user.id === req.user.id;
        })
      )
        return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);

      // if (Object.keys(dailySummaries).length) return res.status(200).send(dailySummaries);
      if (dailySummaries.length) return res.status(200).send(dailySummaries);
      else return res.status(204).send();
    } catch (error) {
      console.log(error.toString());

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default DailySummaryHandler;
