import db from "../../db";
import FitbitAccountController from "../ClientAccounts/FitbitAccountController";
import GarminAccountController from "../ClientAccounts/GarminAccountController";

const ClientAccountController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT ca.*, to_json(
        	at
        ) as account_type
        FROM client_account ca
        INNER JOIN account_type at
        ON (ca.type_id=at.id)
        ${id ? ` WHERE ca.id=$1` : ``};`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  // async create(clientAccount) {
  //   try {
  //     await db.query("BEGIN");
  //     // const queryText = "INSERT INTO users(name) VALUES($1) RETURNING id";
  //     // const res = await client.query(queryText, ["brianc"]);
  //     // const insertPhotoText = "INSERT INTO photos(user_id, photo_url) VALUES ($1, $2)";
  //     // const insertPhotoValues = [res.rows[0].id, "s3.bucket.foo"];
  //     // await db.query(insertPhotoText, insertPhotoValues);
  //     await db.query("COMMIT");

  //     return (
  //       await db.query(
  //         `INSERT INTO client_account (${Object.keys(clientAccount).join(",")}) VALUES (${Object.keys(clientAccount)
  //           .map((e, i) => {
  //             return `$${i + 1}`;
  //           })
  //           .join(",")}) RETURNING *`,
  //         Object.values(clientAccount)
  //       )
  //     ).rows[0];
  //   } catch (error) {
  //     await db.query("ROLLBACK");
  //     throw error;
  //   }
  // },

  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return (
        await db.query(
          `UPDATE client_account SET ${keys
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
      let fitbitAccounts = await FitbitAccountController.findByUser(userID);

      fitbitAccounts = fitbitAccounts.map((row) => {
        const { secret, encoded_id, access_token, ...rest } = row;

        return rest;
      });

      let garminAccounts = await GarminAccountController.findByUser(userID);

      return [...fitbitAccounts, ...garminAccounts];
    } catch (error) {
      throw error;
    }
  },
};

export default ClientAccountController;
