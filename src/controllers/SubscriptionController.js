import db from "../db";

const SubscriptionController = {
  async create(subscriptionData, userID) {
    let client;
    try {
      client = await db.transaction("BEGIN");

      const subscription = (
        await db.transaction(
          `INSERT INTO pn_subscription
        (endpoint, auth, p256dh)
        VALUES
        ($1,$2,$3) RETURNING *`,
          [subscriptionData.endpoint, subscriptionData.keys.auth, subscriptionData.keys.p256dh],
          client
        )
      ).rows[0];

      await db.transaction(
        `INSERT INTO user_pn_subscription
        (user_id, pn_subscription_id)
        VALUES
        ($1,$2)`,
        [userID, subscription.id],
        client
      );

      await db.transaction("COMMIT", [], client);

      return subscription;
    } catch (error) {
      await db.transaction("ROLLBACK", [], client);
      throw error;
    }
  },

  // async get(endpoint) {
  //   try {
  //     const { rows, rowCount } = await db.query(
  //       `SELECT * FROM subscription${endpoint ? ` WHERE endpoint=$1` : ``};`,
  //       endpoint ? [endpoint] : []
  //     );

  //     return { rows, rowCount };
  //   } catch (error) {
  //     console.log(error.toString());
  //     throw error;
  //   }
  // },

  /**
   *
   * @param {number} userID
   */
  async deleteByEndpoint(endpoint) {
    try {
      return await db.query(`DELETE FROM pn_subscription WHERE endpoint=$1`, [endpoint]);
    } catch (error) {
      throw error;
    }
  },

  /**
   * Finds subscriptions by user id
   *
   * @param {*} userID
   */
  async findByUser(userID) {
    try {
      return await db.query(
        `SELECT * FROM pn_subscription pns
      INNER JOIN user_pn_subscription upns
      ON(pns.id=upns.pn_subscription_id)
      WHERE user_id=$1`,
        [userID]
      );
    } catch (error) {
      throw error;
    }
  },

  /**
   *
   * @param {*} userID
   * @param {*} endpoint
   */
  async findByUserAndEndpoint(userID, endpoint) {
    try {
      return (
        await db.query(
          `SELECT * FROM pn_subscription pns
          INNER JOIN user_pn_subscription upns
          ON(pns.id=upns.pn_subscription_id)
          WHERE user_id=$1 AND endpoint=$2`,
          [userID, endpoint]
        )
      ).rows[0];
    } catch (error) {
      throw error;
    }
  },

  /**
   *
   * @param {*} endpoint
   */
  async findByEndpoint(endpoint) {
    try {
      return (await db.query(`SELECT * FROM pn_subscription WHERE endpoint=$1`, [endpoint])).rows[0];
    } catch (error) {
      throw error;
    }
  }
};

export default SubscriptionController;
