import db from "../../db";
// import MessageController from "./MessageController";

const PushNotificationController = {
  async create(pushNotificationData) {
    const { read, ...messageData } = pushNotificationData;

    let client;
    try {
      client = await db.transaction("BEGIN");
      console.log(messageData);

      const message = (
        await db.transaction(
          `INSERT INTO message
        (${Object.keys(messageData).join(",")})
        VALUES
        (${Object.keys(messageData)
          .map((e, i) => {
            return `$${i + 1}`;
          })
          .join(",")}) RETURNING *`,
          Object.values(messageData),
          client
        )
      ).rows[0];

      pushNotificationData = { id: message.id, read };

      const pushNotification = (
        await db.transaction(
          `INSERT INTO push_notification
        (${Object.keys(pushNotificationData).join(",")})
        VALUES
        (${Object.keys(pushNotificationData)
          .map((e, i) => {
            return `$${i + 1}`;
          })
          .join(",")})`,
          Object.values(pushNotificationData),
          client
        )
      ).rows[0];

      await db.transaction("COMMIT", [], client);

      return { ...message, ...pushNotification };
    } catch (error) {
      await db.transaction("ROLLBACK", [], client);
      throw error;
    }
  },

  async findByUser(user_id, { limit, from, to, read }) {
    try {
      const queryParams = [user_id, limit ? limit : 20];
      let andString = "",
        nextIndex = queryParams.length + 1;

      if (from) {
        queryParams.push(from);
        andString += ` AND concat(created, created_tz)::timestamptz > $${nextIndex++}::timestamptz`;
      }
      console.log(queryParams, nextIndex, andString);

      if (to) {
        queryParams.push(to);
        andString += ` AND concat(created, created_tz)::timestamptz < $${nextIndex++}::timestamptz`;
      }

      if (read === "true" || read === "false") {
        queryParams.push(read);
        andString += ` AND read=$${nextIndex++}`;
      }

      return (
        await db.query(
          `SELECT m.*, pn.*,
        json_build_object(
          'firstname', ca.firstname, 'lastname', ca.lastname, 'lastname2', ca.lastname2
        ) as client_account, concat(created, created_tz)::timestamptz as created_utc
		    FROM message m
        INNER JOIN push_notification pn
        ON(m.id = pn.id)

        INNER JOIN client_account ca
        ON(m.client_account_id = ca.id)
        
        INNER JOIN user_client_account uca
        ON(ca.id = uca.client_account_id)

        WHERE uca.user_id = $1
        ${andString}
        ORDER BY created_utc DESC LIMIT $2`,
          queryParams
        )
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async findOneByUser(id, user_id) {
    return (
      await db.query(
        `SELECT m.*
      FROM message m

      INNER JOIN client_account ca
      ON(m.client_account_id = ca.id)
      
      INNER JOIN user_client_account uca
      ON(ca.id = uca.client_account_id)

      WHERE m.id = $1 AND uca.user_id = $2`,
        [id, user_id]
      )
    ).rows[0];
  },

  async update(values, id) {
    try {
      const keys = Object.keys(values),
        params = Object.values(values);
      if (id) params.push(id);

      return await db.query(
        `UPDATE push_notification SET ${keys
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

  /**
   *
   * @param {number} userID
   */
  async delete(where) {
    try {
      await db.query(
        `DELETE FROM push_notification WHERE ${Object.keys(where)
          .map((col_name, index) => `${col_name}=$${index + 1}`)
          .join(" AND ")}`,
        Object.values(where)
      );

      return { rows, rowCount };
    } catch (error) {
      throw error;
    }
  }
};

export default PushNotificationController;
