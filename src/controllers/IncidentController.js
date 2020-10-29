import db from "../db";

const IncidentController = {
  async find(id) {
    try {
      return (
        await db.query(
          `SELECT i.*,
          json_build_object(
            'firstname', ca.firstname, 'lastname', ca.lastname, 'lastname2', ca.lastname2
          ) as client_account
          FROM incident i

          INNER JOIN client_account ca
          ON(i.client_account_id = ca.id)
   
            ${id ? `WHERE i.id=$1` : ``}
            ORDER BY created DESC`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },

  async filter(query) {
    const { limit } = query;

    try {
      return (
        await db.query(
          `SELECT i.*,
          json_build_object(
            'firstname', ca.firstname, 'lastname', ca.lastname, 'lastname2', ca.lastname2
          ) as client_account
          FROM incident i

          INNER JOIN client_account ca
          ON(i.client_account_id = ca.id)

          ORDER BY created DESC LIMIT $1`,
          [limit]
        )
      ).rows;
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },

  async create(incident) {
    return (
      await db.query(
        `INSERT INTO incident
            (${Object.keys(incident).join(",")})
            VALUES
            (${Object.keys(incident)
              .map((e, i) => {
                return `$${i + 1}`;
              })
              .join(",")}) RETURNING *`,
        Object.values(incident)
      )
    ).rows[0];
  },

  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return await db.query(
        `UPDATE incident SET ${keys
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

export default IncidentController;
