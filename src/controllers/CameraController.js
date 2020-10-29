import db from "../db";

const CameraController = {
  async find(id) {
    return (await db.query("SELECT * FROM camera WHERE id = $1", [id])).rows[0];
  },
};

export default CameraController;
