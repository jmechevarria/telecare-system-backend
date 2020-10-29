import UserController from "../controllers/Users/UserController";
import AdminController from "../controllers/Users/AdminController";
import ContactController from "../controllers/Users/ContactController";
import CaregiverController from "../controllers/Users/CaregiverController";
import { RESPONSES, ROLES } from "../helpers/Constants";
import PasswordHelper from "../helpers/PasswordHelper";
import SubscriptionController from "../controllers/SubscriptionController";

const UserHandler = {
  async get(req, res) {
    try {
      const role_id = req.query.role_id;

      let users = [];

      if (role_id == ROLES.ADMIN) users = await AdminController.find();
      else if (role_id == ROLES.CAREGIVER) users = await CaregiverController.find();
      else if (role_id == ROLES.CONTACT) users = await ContactController.find();
      else {
        users = await AdminController.find();
        users = [...users, ...(await CaregiverController.find())];
        users = [...users, ...(await ContactController.find())];
      }

      if (users.length === 0) return res.status(200).send(`No user(s) were found`);

      for (const user of users) {
        delete user.password;
      }

      return res.status(200).send(users);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async getByID(req, res) {
    try {
      const { id, role_id } = req.params;

      let user = {};

      if (role_id == ROLES.ADMIN) {
        user = (await AdminController.find(id))[0];
      } else if (role_id == ROLES.CAREGIVER) {
        user = (await CaregiverController.find(id))[0];
      } else if (role_id == ROLES.CONTACT) {
        user = (await ContactController.find(id))[0];
      } else return res.status(400).send("Missing parameters");

      delete user.password;

      return res.status(200).send(user);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async create(req, res) {
    try {
      const body = req.body,
        role_id = body.role_id;

      body.password = PasswordHelper.hashPassword(body.password);
      let user;

      if (role_id == ROLES.ADMIN) {
        user = await AdminController.create(body);
      } else if (role_id == ROLES.CAREGIVER) {
        user = await CaregiverController.create(body);
      } else if (role_id == ROLES.CONTACT) {
        user = await ContactController.create(body);
      }

      return res.status(200).send(user);
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
      const { id, role_id } = req.params,
        body = req.body;
      console.log("updateByID", id, role_id);

      if (body.password) {
        if (body.password.length) {
          body.password = PasswordHelper.hashPassword(body.password);
        } else delete body.password;
      }

      //only an admin can change a user's role
      if (req.user.role_id != ROLES.ADMIN) delete body.role_id;

      let user = {};

      if (role_id == ROLES.ADMIN) {
        const { /*adminValues,*/ ...userValues } = body;
        // user = (await AdminController.update(adminValues, id)).rows[0];
        user = { ...user, ...(await UserController.update(userValues, id)).rows[0] };
      } else if (role_id == ROLES.CAREGIVER) {
        const { /*caregiverValues,*/ ...userValues } = body;
        // user = (await CaregiverController.update(caregiverValues, id)).rows[0];
        user = { ...user, ...(await UserController.update(userValues, id)).rows[0] };
      } else if (role_id == ROLES.CONTACT) {
        const { /*contactValues,*/ ...userValues } = body;
        // user = (await ContactController.update(contactValues, id)).rows[0];
        user = { ...user, ...(await UserController.update(userValues, id)).rows[0] };
      }
      console.log("before", user);

      delete user.password;
      console.log("after", user);
      return res.status(200).send(user);
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
      const user = (await UserController.delete(req.params.id)).rows[0];

      return res.status(200).send(user);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async login(req, res) {
    const { email, username, password } = req.body;
    if ((!username && !email) || !password) {
      return res.status(400).send(RESPONSES.MISSING_PARAMETERS);
    }

    try {
      const tokenAndUser = await UserController.login(req.body);

      if (tokenAndUser) return res.status(200).send(tokenAndUser);

      return res.status(204).send();
    } catch (error) {
      const message = error.message;

      if (message === RESPONSES.INVALID_USERNAME.message || message === RESPONSES.INCORRECT_PASSWORD.message)
        return res.status(401).send(error);
      else console.log(error.toString());

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async linkToClientAccount(req, res) {
    try {
      const { userID, clientAccountIDs } = req.body;

      const result = await UserController.linkToClientAccount(userID, clientAccountIDs);

      return res.status(200).send(result);
    } catch (error) {
      console.log(error.toString());

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async unlinkFromClientAccount(req, res) {
    try {
      const { user_id, client_account_id } = req.params;
      const result = await UserController.unlinkFromClientAccount(user_id, client_account_id);

      return res.status(200).send(result);
    } catch (error) {
      console.log(error.toString());

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  // async getContactsByClientAccount(req, res) {
  //   const { id } = req.params;
  //   try {
  //     if (id) {
  //       const contacts = await ContactController.findByClientAccount(id);

  //       if (!contacts.length) return res.status(200).send("Account has no registered contacts");

  //       return res.status(200).send(contacts);
  //     }

  //     return res.status(400).send("Missing parameters");
  //   } catch (error) {
  //     console.log(error.toString());

  //     return res.status(500).send(RESPONSES.GENERIC_500);
  //   }
  // },

  async subscribeToPN(req, res) {
    const { subscription: subscriptionData } = req.body;
    const id = req.params.id;
    console.log(subscriptionData);

    try {
      if (subscriptionData && id) {
        //trying to create the subscription and subscribe the user to the endpoint
        await SubscriptionController.create(subscriptionData, id);

        return res.status(201).send(RESPONSES.INSUFFICIENT_PRIVILEGES);
      } else return res.status(400).send("Missing data for subscription process");
    } catch (error) {
      console.log(error.toString());

      if (error.code === "23505") {
        //there is already a subscription with that endpoint in the db
        const subscription = await SubscriptionController.findByEndpoint(subscriptionData.endpoint);

        try {
          //trying to subscribe the user to the endpoint
          await UserController.subscribeToPN(id, subscription.id);
        } catch (error) {
          console.log(error.toString());

          const entity = error.detail.match(/\((.+?)\)/)[1]; //e.g. Matches 'email' in 'Key (email)=(eestradapante@gmail.com) already exists.'
          return res.status(409).send({ ...RESPONSES.UNIQUE_CONSTRAINT, entity: entity });
        }

        const entity = error.detail.match(/\((.+?)\)/)[1]; //e.g. Matches 'email' in 'Key (email)=(eestradapante@gmail.com) already exists.'
        return res.status(409).send({ ...RESPONSES.UNIQUE_CONSTRAINT, entity: entity });
      }

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async unsubscribeFromPN() {},
};

export default UserHandler;
