import db from "../../db";

const AccountTypeController = {
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
      return await db.query(
        `SELECT * FROM account_type 
        ${id ? `WHERE id=$1` : ``}`,
        id ? [id] : []
      );
    } catch (error) {
      throw error;
    }
  },
};

export default AccountTypeController;
