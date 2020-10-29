import db from "../../db";

const MessageController = {
  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return await db.query(
        `UPDATE message SET ${keys
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
      return await db.query(
        `DELETE FROM message 
        ${id ? `WHERE id=$1` : ``} RETURNING *`,
        id ? [id] : []
      );
    } catch (error) {
      console.log(error.toString());
      throw error;
    }
  },
};

export default MessageController;
