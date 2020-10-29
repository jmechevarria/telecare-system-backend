import db from "../../db";

const GarminAccountController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT ca.*, ga.*, to_json(
        	at
        ) as account_type
        FROM client_account ca
        INNER JOIN garmin_account ga
        ON(ca.id=ga.id)
        INNER JOIN account_type at
        ON(ca.type_id=at.id)
        ${id ? `WHERE ga.id=$1` : ``}`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async create(garminAccountData) {
    const { ...clientAccountData } = garminAccountData;

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

      garminAccountData.id = clientAccount.id;

      const garminAccount = (
        await db.query(
          `INSERT INTO garmin_account (${Object.keys(garminAccountData).join(",")}) VALUES (${Object.keys(
            garminAccountData
          )
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(garminAccountData)
        )
      ).rows[0];

      await db.query("COMMIT");
      return { ...clientAccount, ...garminAccount };
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

      return await db.query(
        `UPDATE garmin_account SET ${keys
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

  async findByUser(userID) {
    try {
      return (
        await db.query(
          `SELECT ca.*, ga.*, case when count(d) = 0 then '[]' else json_agg(
        	  d
          ) end as devices
          FROM client_account ca
          INNER JOIN garmin_account ga
          ON (ca.id=ga.id)
          INNER JOIN user_client_account uca
          ON (ca.id=uca.client_account_id)
          LEFT JOIN device d
          ON (ca.id=d.client_account_id)
          WHERE uca.user_id=$1
          GROUP BY ca.id, ga.id`,
          [userID]
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },
};

export default GarminAccountController;
