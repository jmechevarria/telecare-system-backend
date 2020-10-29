import moment from "moment";
import db from "../db";
import { RESPONSES } from "../helpers/Constants";

const DailySummaryController = {
  async insert(values) {
    const keys = Object.keys(values);

    try {
      return await db.query(
        `INSERT INTO daily_summary (${keys.join(",")})
         VALUES (${keys.map((e, index) => `$${index + 1}`)}) RETURNING *`,
        Object.values(values)
      );
    } catch (error) {
      throw error;
    }
  },

  async update(values, where) {
    let preparedStatementIndex = 1;

    const valuesClause = Object.keys(values)
      .map((columnName) => {
        return `${columnName}=$${preparedStatementIndex++}`;
      })
      .join(",");

    const whereClause = Object.keys(where)
      .map((columnName) => {
        return `${columnName}=$${preparedStatementIndex++}`;
      })
      .join(" AND ");

    try {
      return await db.query(`UPDATE daily_summary SET ${valuesClause} WHERE ${whereClause} RETURNING *`, [
        ...Object.values(values),
        ...Object.values(where),
      ]);
    } catch (error) {
      throw error;
    }
  },

  async getByDateRange(clientAccountID, from, to) {
    let query,
      params = [clientAccountID];

    from = moment(from);
    console.log(from, to);

    if (!moment(to, "YYYY-MM-DD", true).isValid()) {
      if (to === "30d") {
        params.push(30);
      } else if (to === "1w") {
        params.push(7);
      } else if (to === "1d") {
        params.push(1);
      } else {
        throw new Error(RESPONSES.GENERIC_400);
      }

      query = `SELECT * FROM daily_summary
        WHERE client_account_id = $1
        AND date > current_date - interval '1 day' * $2 ORDER BY date DESC`;
      // params.push(from.format("Z"));
      // query = `SELECT * FROM daily_summary
      //   WHERE client_account_id = $1
      //   AND date > current_date at time zone $3 - interval '1 day' * $2 ORDER BY date DESC`;
    } else {
      to = moment(to);
      query =
        "SELECT * FROM daily_summary WHERE client_account_id = $1 AND $2 <= date AND date <= $3 ORDER BY date DESC;";
      params.push(from.format("YYYY-MM-DD"), to.format("YYYY-MM-DD"));
    }

    try {
      return (await db.query(query, params)).rows;
    } catch (error) {
      throw error;
    }
  },

  async getLatestByClientAccount(clientAccountID) {
    try {
      return (
        await db.query(
          `SELECT * FROM daily_summary
         WHERE date = (SELECT max(date) from daily_summary)
         AND client_account_id=$1`,
          [clientAccountID]
        )
      ).rows[0];
    } catch (error) {
      throw error;
    }
  },
};

export default DailySummaryController;
