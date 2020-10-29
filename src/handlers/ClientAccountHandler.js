import ClientAccountController from "../controllers/ClientAccounts/ClientAccountController";
import FitbitAccountController from "../controllers/ClientAccounts/FitbitAccountController";
import GarminAccountController from "../controllers/ClientAccounts/GarminAccountController";
import { ACCOUNT_TYPES, RESPONSES } from "../helpers/Constants";

const ClientAccountHandler = {
  async get(req, res) {
    try {
      const type_id = req.query.type_id;

      let clientAccounts = [];

      if (type_id == ACCOUNT_TYPES.FITBIT) clientaccounts = await FitbitAccountController.find();
      else if (type_id == ACCOUNT_TYPES.GARMIN) clientaccounts = await GarminAccountController.find();
      else {
        let fitbitAccounts = await FitbitAccountController.find();

        fitbitAccounts = fitbitAccounts.map((row) => {
          const { secret, encoded_id, access_token, ...rest } = row;

          return rest;
        });

        clientAccounts = [...fitbitAccounts, ...(await GarminAccountController.find())];
      }

      //could be used role-wise
      // clientAccounts = clientAccounts.map(row => {
      //   const { secret, encoded_id, access_token, ...rest } = row;

      //   return rest;
      // });

      if (clientAccounts.length === 0) return res.status(200).send(`No client account(s) were found`);

      return res.status(200).send(clientAccounts);
    } catch (error) {
      console.log(error.toString());

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async getByID(req, res) {
    try {
      const { id, type_id } = req.params;

      let clientAccount = {};

      if (type_id == ACCOUNT_TYPES.FITBIT) {
        clientAccount = (await FitbitAccountController.find(id))[0];
      } else if (type_id == ACCOUNT_TYPES.GARMIN) {
        clientAccount = (await GarminAccountController.find(id))[0];
      } else return res.status(400).send(RESPONSES.MISSING_PARAMETERS);

      return res.status(200).send(clientAccount);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async getByUser(req, res) {
    try {
      let clientAccounts = [];

      // if (type_id == ACCOUNT_TYPES.FITBIT) {
      clientAccounts = await ClientAccountController.findByUser(req.user.id);

      // clientAccounts = (await FitbitAccountController.find(id))[0];
      // } else if (type_id == ACCOUNT_TYPES.GARMIN) {
      //   clientAccounts = (await GarminAccountController.find(id))[0];
      // } else return res.status(400).send(RESPONSES.MISSING_PARAMETERS);

      return res.status(200).send(clientAccounts);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async create(req, res) {
    try {
      const type_id = req.body.type_id;
      let clientAccount;
      if (type_id == ACCOUNT_TYPES.FITBIT) {
        clientAccount = await FitbitAccountController.create(req.body);
      } else if (type_id == ACCOUNT_TYPES.GARMIN) {
        clientAccount = await GarminAccountController.create(req.body);
      }

      return res.status(200).send(clientAccount);
    } catch (error) {
      console.log(error.toString(), error.code);
      if (error.code === "23505") {
        const entity = error.detail.match(/\((.+?)\)/)[1]; //Matches 'email' in 'Key (email)=(eestradapante@gmail.com) already exists.'
        return res.status(409).send({ ...RESPONSES.UNIQUE_CONSTRAINT, entity: entity });
      }

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async updateByID(req, res) {
    try {
      const { id, type_id } = req.params,
        values = req.body;

      let clientAccount = {};

      if (type_id == ACCOUNT_TYPES.FITBIT) {
        const fitbitAccountValues = {};
        const { encoded_id, secret, fitbit_app_id, access_token, ...clientAccountValues } = values;
        if (encoded_id) fitbitAccountValues["encoded_id"] = encoded_id;
        if (secret) fitbitAccountValues["secret"] = secret;
        if (fitbit_app_id) fitbitAccountValues["fitbit_app_id"] = fitbit_app_id;
        if (access_token) fitbitAccountValues["access_token"] = access_token;

        clientAccount = (await FitbitAccountController.update(fitbitAccountValues, id))[0];
        clientAccount = {
          ...clientAccount,
          ...(await ClientAccountController.update(clientAccountValues, id))[0],
        };
      } else if (type_id == ACCOUNT_TYPES.GARMIN) {
        const { /*garminValues,*/ ...clientAccountValues } = values;
        // clientAccount = (await GarminAccountController.update(garminValues, id)).rows[0];
        clientAccount = {
          ...clientAccount,
          ...(await ClientAccountController.update(clientAccountValues, id))[0],
        };
      }

      return res.status(200).send(clientAccount);
    } catch (error) {
      console.log(error.toString(), error.code);
      if (error.code === "23505") {
        const entity = error.detail.match(/\((.+?)\)/)[1]; //Matches 'email' in 'Key (email)=(eestradapante@gmail.com) already exists.'
        return res.status(409).send({ ...RESPONSES.UNIQUE_CONSTRAINT, entity: entity });
      }

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async delete(req, res) {
    try {
      const clientAccount = (await ClientAccountController.delete(req.params.id)).rows[0];

      return res.status(200).send(clientAccount);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default ClientAccountHandler;
