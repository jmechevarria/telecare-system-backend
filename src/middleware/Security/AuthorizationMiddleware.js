import db from "../../db";
import { RESPONSES, ROLES } from "../../helpers/Constants";
import JWTHelper from "../../helpers/JWTHelper";

const AuthorizationMiddleware = {
  /**
   * Verify Token
   * @param {object} req
   * @param {object} res
   * @param {object} next
   * @returns {object|void} response object
   */
  async authenticate(req, res, next) {
    try {
      const authorizationHeader = req.headers["authorization"] || req.headers["Authorization"];
      // console.log("authorizationHeader", authorizationHeader);

      if (!authorizationHeader) return res.status(400).send("Authorization header not found");

      const token = authorizationHeader.split(" ")[1];
      if (!token) return res.status(400).send(RESPONSES.MISSING_TOKEN);

      const decoded = JWTHelper.verify(token); //this throws an execption if the token expired
      console.log("decoded", decoded);

      const userID = decoded.id;

      const user = (
        await db.query("SELECT * FROM my_user WHERE id = $1 AND role_id = $2 AND password = $3", [
          userID,
          decoded.role_id,
          decoded.password,
        ])
      ).rows[0];

      if (!user) {
        return res.status(401).send(RESPONSES.INVALID_TOKEN);
      }

      req.user = { id: userID, role_id: user.role_id };
      console.log("authenticate ok", req.user);

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        // Messenger.sendMessage(SUBJECTS.EXPIRED_TOKEN, error, LEVELS.CRITICAL, [CHANNELS.NOTIFICATION], );
        return res.status(401).send(RESPONSES.EXPIRED_TOKEN);
      }

      console.error(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async authorizeAdmin(req, res, next) {
    try {
      console.log("authorizeAdmin", req.user);
      if (isAdmin(req)) {
        console.log("authorizeAdmin pass");
        next();
        return;
      }

      console.log("authorizeAdmin denied");
      return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);
    } catch (error) {
      console.error(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async authorizeOwner(req, res, next) {
    try {
      console.log("authorizeOwner", req.user);

      if (isOwner(req)) {
        console.log("authorizeOwner pass");
        next();
        return;
      }

      console.log("authorizeOwner denied");
      return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);
    } catch (error) {
      console.error(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async authorizeOwnerOrAdmin(req, res, next) {
    try {
      console.log("authorizeOwnerOrAdmin", req.user);

      if (isAdmin(req) || isOwner(req)) {
        console.log("authorizeOwnerOrAdmin pass");

        next();
        return;
      }

      console.log("authorizeOwnerOrAdmin denied");

      return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);
    } catch (error) {
      console.error(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

const isAdmin = (data) => {
  try {
    console.log("isAdmin", data.user);
    const role_id = data.user.role_id;

    return role_id && role_id === ROLES.ADMIN;
  } catch (error) {
    throw error;
  }
};

const isOwner = (data) => {
  try {
    console.log("isOwner", data.user);

    const requesterID = data.user.id,
      requestedID = data.params.id;

    return requesterID && requestedID && requesterID == requestedID;
  } catch (error) {
    throw error;
  }
};

export default AuthorizationMiddleware;
