import db from "../../db";

const AdminController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT mu.*, a.*, case when count(uca) = 0 then '[]' else json_agg(
          uca.client_account_id
        ) end as client_account_ids
        FROM my_user mu
        INNER JOIN admin a
        ON(mu.id=a.id)
        LEFT JOIN user_client_account uca
        ON(mu.id=uca.user_id)
        ${id ? `WHERE a.id=$1` : ``}
        GROUP BY mu.id, a.id`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },

  async create(adminData) {
    const { /*adminData,*/ ...userData } = adminData; //admin table only has id

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

      adminData = { id: user.id };

      const admin = (
        await db.query(
          `INSERT INTO admin (${Object.keys(adminData).join(",")}) VALUES (${Object.keys(adminData)
            .map((e, i) => {
              return `$${i + 1}`;
            })
            .join(",")}) RETURNING *`,
          Object.values(adminData)
        )
      ).rows[0];

      await db.query("COMMIT");
      return { ...user, ...admin };
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
        `UPDATE admin SET ${keys
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

export default AdminController;
