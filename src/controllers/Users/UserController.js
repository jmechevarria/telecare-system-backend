import db from "../../db";
import JWTHelper from "../../helpers/JWTHelper";
import PasswordHelper from "../../helpers/PasswordHelper";
import DeviceController from "../DeviceController";
import { RESPONSES } from "../../helpers/Constants";
import ClientAccountController from "../ClientAccounts/ClientAccountController";

const UserController = {
  // async create(user) {
  //   try {
  //     return (
  //       await db.query(
  //         `INSERT INTO my_user (${Object.keys(user).join(",")}) VALUES (${Object.keys(user)
  //           .map((e, i) => {
  //             return `$${i + 1}`;
  //           })
  //           .join(",")}) RETURNING *`,
  //         Object.values(user)
  //       )
  //     ).rows[0];
  //   } catch (error) {
  //     throw error;
  //   }
  // },

  /**
   *
   * @param {*} credentials
   */
  async login(credentials) {
    try {
      const row = (
        await db.query("SELECT * FROM my_user WHERE username=$1 OR email=$2", [credentials.username, credentials.email])
      ).rows[0];

      if (!row) {
        throw RESPONSES.INVALID_USERNAME;
      }

      if (!PasswordHelper.comparePassword(credentials.password, row.password)) {
        throw RESPONSES.INCORRECT_PASSWORD;
      }

      const jwtToken = JWTHelper.generateToken(row);
      const { password, ...user } = row;
      const tokenAndUser = { jwtToken, user };
      // tokenAndUser.user = await loadUserDataOnLogin(user);

      return tokenAndUser;
    } catch (error) {
      throw error;
    }
  },

  // async find(id) {
  //   try {
  //     return await db.query(
  //       `SELECT * FROM my_user
  //       ${id ? `WHERE id=$1` : ``}`,
  //       id ? [id] : []
  //     );
  //   } catch (error) {
  //     console.log(error.toString());
  //     throw error;
  //   }
  // },

  // async findCaregiversByFitbitAccount(fitbitAccountIDs = []) {
  //   try {
  //     const { rows, rowCount } = await db.query(
  //       `SELECT my_user.id, username, email,
  //     COALESCE(firstname, '') || COALESCE(' ' || lastname, '') || COALESCE(' ' || lastname2, '') as fullname, role_id
  //     FROM my_user
  //     INNER JOIN caregiver_fitbit_account
  //     ON (my_user.id=caregiver_id)
  //     WHERE caregiver_fitbit_account.fitbit_account_id IN($1);`,
  //       fitbitAccountIDs
  //     );

  //     return { rows, rowCount };
  //   } catch (error) {
  //     console.log(error.toString());
  //     throw error;
  //   }
  // },

  async findByClientAccount(clientAccountID, where) {
    try {
      let params = [clientAccountID],
        index = 1;

      if (where) params.push(...Object.values(where));

      return (
        await db.query(
          `SELECT * FROM my_user mu
          INNER JOIN user_client_account uca
          ON (mu.id = uca.user_id)
          WHERE uca.client_account_id = $${index++}
          ${
            where
              ? ` AND ${Object.keys(where)
                  .map((columnName) => `${columnName}=$${index++}`)
                  .join(" AND ")}`
              : ""
          };`,
          params
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return await db.query(
        `UPDATE my_user SET ${keys
          .map((e, i) => {
            return `${e}=$${i + 1}`;
          })
          .join(",")}
            ${id ? `WHERE id=$${params.length}` : ``}
            RETURNING *`,
        params
      );
    } catch (error) {
      throw error;
    }
  },

  async delete(id) {
    try {
      return await db.query("DELETE FROM my_user WHERE id=$1 RETURNING *", [id]);
    } catch (error) {
      throw error;
    }
  },

  async linkToClientAccount(userID, clientAccountIDs) {
    try {
      let query = "INSERT INTO user_client_account VALUES";

      clientAccountIDs.forEach((id, index) => {
        query += " ($1, $" + (index + 2) + ")";

        if (index + 1 !== clientAccountIDs.length) {
          query += ",";
        }
      });

      query += " RETURNING *";
      // clientAccountIDs.unshift(userID);
      const { rows, rowCount } = await db.query(query, [userID, ...clientAccountIDs]);

      return { rows, rowCount };
    } catch (error) {
      throw error;
    }
  },

  async unlinkFromClientAccount(userID, clientAccountID) {
    try {
      return await db.query("DELETE FROM user_client_account WHERE user_id=$1 AND client_account_id=$2 RETURNING *", [
        userID,
        clientAccountID,
      ]);
    } catch (error) {
      throw error;
    }
  },

  addNotification(userID, notificationID) {
    try {
      db.query("INSERT INTO user_notification (user_id, notification_id) VALUES ($1,$2)", [userID, notificationID]);
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },

  async findPNRecipientsDataByClientAccount(clientAccountID) {
    try {
      return (
        await db.query(
          `SELECT mu.id, username, email, receive_emails, receive_text_messages,
          COALESCE(firstname, '') || COALESCE(' ' || lastname, '') || COALESCE(' ' || lastname2, '') as fullname, role_id
          FROM my_user mu
          INNER JOIN user_client_account uca
          ON (mu.id=uca.user_id)
          INNER JOIN user_pn_subscription upns
          ON(mu.id=upns.user_id)
          WHERE uca.client_account_id=$1`,
          [clientAccountID]
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async subscribeToPN(id, subscriptionID) {
    await db.query(
      `INSERT INTO user_pn_subscription
      (user_id, pn_subscription_id)
      VALUES
      ($1,$2)`,
      [id, subscriptionID]
    );
  },
};

// const loadUserDataOnLogin = async (authenticatedUser) => {
//   try {
//     const clientAccounts = await ClientAccountController.findByUser(authenticatedUser.id);

//     for (const clientAccount of clientAccounts) {
//       clientAccount.devices = (await DeviceController.findByClientAccount(clientAccount.id)).rows;
//     }

//     authenticatedUser.clientAccounts = clientAccounts;
//     return authenticatedUser;
//   } catch (error) {
//     throw error;
//   }
// };

export default UserController;
