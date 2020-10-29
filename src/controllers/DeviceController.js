import db from "../db";

const DeviceController = {
  async findByClientAccount(clientAccountID) {
    try {
      return await db.query("SELECT * FROM device WHERE client_account_id=$1", [clientAccountID]);
    } catch (error) {
      throw error;
    }
  }
};

export default DeviceController;
