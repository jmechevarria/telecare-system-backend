import db from "../../db";

const RoleController = {
  //   async create(req, res) {

  //     try {
  //       const { rows } = await db.query(
  //         `INSERT INTO
  //         my_user(username, email, password, firstname, lastname, lastname2, role)
  //         VALUES($1, $2, $3, $4, $5, $6, $7) returning *`,
  //         values
  //       );
  //       const token = JWTHelper.generateToken(rows[0].id);
  //       return res.status(201).send({ token });
  //     } catch (error) {
  //       return res.status(500).send(error);
  //     }
  //   },

  async find(id) {
    try {
      return (
        await db.query(
          `SELECT * FROM role
        ${id ? `WHERE id=$1` : ``}`,
          id ? [id] : []
        )
      ).rows;
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  }

  //   async update(req, res) {
  //     try {
  //       const values = [
  //         req.body.success || rows[0].success,
  //         req.body.low_point || rows[0].low_point,
  //         req.body.take_away || rows[0].take_away,
  //         moment(new Date()),
  //         req.params.id
  //       ];
  //       const response = await db.query(updateOneQuery, values);
  //       return res.status(200).send(response.rows[0]);
  //     } catch (err) {
  //       return res.status(500).send(err);
  //     }
  //   },

  //   async delete(req, res) {
  //     try {
  //       const { rows } = await db.query("DELETE FROM role WHERE id=$1 RETURNING *", [req.params.id]);
  //       if (!rows[0]) {
  //         return res.status(404).send({ message: "user not found" });
  //       }
  //       // return rows;
  //       return res.status(200).send({ message: "deleted" });
  //     } catch (error) {
  //       return res.status(500).send(error);
  //     }
  //   },
};

export default RoleController;
