import RoleController from "../controllers/Users/RoleController";
import { RESPONSES } from "../helpers/Constants";

const RoleHandler = {
  async get(req, res) {
    try {
      const roles = await RoleController.find();

      return res.status(200).send(roles);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async getByID(req, res) {
    try {
      const roles = await RoleController.find(req.params.id);

      return res.status(200).send(roles[0]);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default RoleHandler;
