import db from "../../db";

const ContactController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT mu.*, c.*, case when count(uca) = 0 then '[]' else json_agg(
          uca.client_account_id
        ) end as client_account_ids
        FROM my_user mu
        INNER JOIN contact c
        ON(mu.id=c.id)
        LEFT JOIN user_client_account uca
        ON(mu.id=uca.user_id)
        ${id ? `WHERE c.id=$1` : ``}
        GROUP BY mu.id, c.id`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },

  async create(contactData) {
    const { /*contactData,*/ ...userData } = contactData; //contact table only has id

    try {
      await db.query("BEGIN");

      const user = (
        await db.query(
          `INSERT INTO my_user (${Object.keys(userData).join(",")}) VALUES (${Object.keys(userData)
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(userData)
        )
      ).rows[0];

      contactData = { id: user.id };

      const contact = (
        await db.query(
          `INSERT INTO contact (${Object.keys(contactData).join(",")}) VALUES (${Object.keys(contactData)
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(contactData)
        )
      ).rows[0];

      await db.query("COMMIT");
      return { ...user, ...contact };
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
        `UPDATE contact SET ${keys
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

  async findByClientAccount(clientAccountID) {
    try {
      return await db.query(
        `SELECT mu.*
          FROM my_user mu
          INNER JOIN user_client_account uca
          ON (mu.id=uca.user_id)
          WHERE uca_client_account_id=$1;`,
        [clientAccountID]
      );
    } catch (error) {
      throw error;
    }
  },
};

export default ContactController;
