import db from "../../db";
import AdminController from "../Users/AdminController";
import { Messenger, SUBJECT, SEVERITY, CHANNELS } from "../../helpers/Messenger";
import DataFetcher from "../../helpers/DataFetcher";

const FitbitAccountController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT ca.*, fa.*, to_json(
        	at
        ) as account_type
        FROM client_account ca
        INNER JOIN fitbit_account fa
        ON(ca.id=fa.id)
        INNER JOIN account_type at
        ON(ca.type_id=at.id)
        ${id ? `WHERE fa.id=$1` : ``}`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async create(fitbitAccountData) {
    const { fitbit_app_id, secret, ...clientAccountData } = fitbitAccountData;
    fitbitAccountData = { fitbit_app_id, secret };

    try {
      // const clientAccount = await ClientAccountController.create(clientAccountData);
      await db.query("BEGIN");

      const clientAccount = (
        await db.query(
          `INSERT INTO client_account (${Object.keys(clientAccountData).join(",")}) VALUES (${Object.keys(
            clientAccountData
          )
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(clientAccountData)
        )
      ).rows[0];

      fitbitAccountData.id = clientAccount.id;

      const fitbitAccount = (
        await db.query(
          `INSERT INTO fitbit_account (${Object.keys(fitbitAccountData).join(",")}) VALUES (${Object.keys(
            fitbitAccountData
          )
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(fitbitAccountData)
        )
      ).rows[0];

      await db.query("COMMIT");
      return { ...clientAccount, ...fitbitAccount };
    } catch (error) {
      await db.query("ROLLBACK");
      throw error;
    }
  },

  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return (
        await db.query(
          `UPDATE fitbit_account SET ${keys
            .map((e, i) => {
              return `${e}=$${i + 1}`;
            })
            .join(",")}
            ${id ? `WHERE id=$${params.length}` : ``}
            RETURNING *`,
          params
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  /**
   *
   * @param {number} userID
   */
  async delete(id) {
    try {
      return await db.query("DELETE FROM client_account WHERE id=$1 RETURNING *", [id]);
    } catch (error) {
      throw error;
    }
  },

  async findByUser(userID) {
    try {
      return (
        await db.query(
          `SELECT ca.*, fa.*, case when count(d) = 0 then '[]' else json_agg(
        	  d
          ) end as devices
          FROM client_account ca
          INNER JOIN fitbit_account fa
          ON (ca.id=fa.id)
          INNER JOIN user_client_account uca
          ON (ca.id=uca.client_account_id)
          LEFT JOIN device d
          ON (ca.id=d.client_account_id)
          WHERE uca.user_id=$1
          GROUP BY ca.id, fa.id`, //because 'error: column "ca.id" must appear in the GROUP BY clause or be used in an aggregate function'
          [userID]
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  // async getAllInfo(id) {
  //   try {
  //     return (
  //       await db.query(
  //         `SELECT *
  //       FROM fitbit_account fa
  //       WHERE fa.id=$1`,
  //         [id]
  //       )
  //     ).rows[0];
  //   } catch (error) {
  //     throw error;
  //   }
  // }
};

export const unauthorizedToken = async (fitbitAccountData) => {
  console.log("unauthorizedToken for ", fitbitAccountData);

  const rows = await AdminController.find();
  const admins = Object.values(rows);

  Messenger.sendMessage(
    {
      subject: SUBJECT.UNAUTHORIZED_TOKEN.message,
      payload: `ID: ${fitbitAccountData.id} - ${fitbitAccountData.firstname} ${fitbitAccountData.lastname} ${fitbitAccountData.lastname2}`,
      severity: SEVERITY.CRITICAL,
      recipients: admins,
    },
    [CHANNELS.NOTIFICATION, CHANNELS.EMAIL]
  );
};

export const hourlyLimitReached = (fitbitAccount, fitbitRateLimitReset, fitbitRateLimitResets) => {
  if (!fitbitRateLimitResets[fitbitAccount.id]) {
    setTimeout(() => {
      fitbitRateLimitResets[fitbitAccount.id] = undefined;
      DataFetcher.syncFitbitCassandra(fitbitAccount);
      DataFetcher.syncFitbitPostgres(fitbitAccount);
    }, fitbitRateLimitReset * 1000 + 60000);

    fitbitRateLimitResets[fitbitAccount.id] = fitbitRateLimitReset;
    console.log("Hourly limit reached: ", fitbitRateLimitResets, fitbitRateLimitReset * 1000 + 60000);
  }
};

export const requestSepcificError = async (fitbitAccountData, error) => {
  console.log("requestSepcificError for ", fitbitAccountData);

  const rows = await AdminController.find();
  const admins = Object.values(rows);

  Messenger.sendMessage(
    {
      subject: `REQUEST SPECIFIC ERROR FOR ACCOUNT ${fitbitAccountData.id}`,
      payload: JSON.stringify(error),
      severity: SEVERITY.CRITICAL,
      recipients: admins,
    },
    [CHANNELS.NOTIFICATION, CHANNELS.EMAIL]
  );
};

export default FitbitAccountController;
