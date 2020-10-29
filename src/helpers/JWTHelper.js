import jwt from "jsonwebtoken";

const JWTHelper = {
  generateToken({ id, role_id, password }) {
    try {
      const token = jwt.sign(
        {
          id,
          role_id,
          password
        },
        process.env.SECRET,
        { expiresIn: 86400 } //7 days
      );
      return token;
    } catch (error) {
      throw error;
    }
  },

  verify(token) {
    try {
      return jwt.verify(token, process.env.SECRET);
    } catch (error) {
      throw error;
    }
  }
};

export default JWTHelper;
