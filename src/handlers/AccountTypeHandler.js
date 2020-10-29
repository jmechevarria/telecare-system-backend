import AccountTypeController from "../controllers/ClientAccounts/AccountTypeController";
import { RESPONSES } from "../helpers/Constants";

const AccountTypeHandler = {
  async get(req, res) {
    try {
      const accountTypes = (await AccountTypeController.find()).rows;

      return res.status(200).send(accountTypes);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default AccountTypeHandler;
