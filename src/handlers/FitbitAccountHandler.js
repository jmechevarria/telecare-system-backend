import FitbitAccountController from "../controllers/ClientAccounts/FitbitAccountController";
import { RESPONSES } from "../helpers/Constants";

const FitbitAccountHandler = {
  async updateByID(req, res) {
    try {
      const id = req.params.id,
        values = req.body;
      if (values) {
        const result = await FitbitAccountController.update(values, id);
        return res.status(200).send(result);
      }

      return res.status(400).send(RESPONSES.MISSING_PARAMETERS);
    } catch (error) {
      console.log(error.toString(), error.code);
      if (error.code === "23505") {
        const entity = error.detail.match(/\((.+?)\)/)[1]; //Matches 'email' in 'Key (email)=(eestradapante@gmail.com) already exists.'
        return res.status(409).send({ ...RESPONSES.UNIQUE_CONSTRAINT, entity: entity });
      }
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default FitbitAccountHandler;
