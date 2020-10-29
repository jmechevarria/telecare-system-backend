import db from "../../db";

const CaregiverController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT mu.*, c.*, case when count(uca) = 0 then '[]' else json_agg(
          uca.client_account_id
        ) end as client_account_ids
        FROM my_user mu
        INNER JOIN caregiver c
        ON(mu.id=c.id)
        left JOIN user_client_account uca
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

  async create(caregiverData) {
    const { /*caregiverData,*/ ...userData } = caregiverData; //caregiver table only has id

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

      caregiverData = { id: user.id };

      const caregiver = (
        await db.query(
          `INSERT INTO caregiver (${Object.keys(caregiverData).join(",")}) VALUES (${Object.keys(caregiverData)
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(caregiverData)
        )
      ).rows[0];

      await db.query("COMMIT");
      return { ...user, ...caregiver };
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
        `UPDATE caregiver SET ${keys
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
};

export default CaregiverController;
