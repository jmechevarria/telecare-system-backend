import { Pool } from "pg";
import dotenv from "dotenv";
import { types } from "pg";

const TIMESTAMP_OID = 1114;

const parseTimestamp = (val) => {
  return val;
};

types.setTypeParser(TIMESTAMP_OID, parseTimestamp);

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

const db = {
  async query(query, params) {
    console.log(query, params);
    const client = await pool.connect();

    const res = await client.query(query, params);
    client.release();
    return res;
  },

  async transaction(query, params, client) {
    console.log(query, params, !!client);

    if (!client) client = await pool.connect();

    const res = await client.query(query, params);

    if (query === "BEGIN") return client;
    else if (query === "COMMIT" || query === "ROLLBACK") {
      client.release();
      console.log("client released");
    } else return res;
  },
};
export default db;
