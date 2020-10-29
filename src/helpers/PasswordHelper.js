import bcrypt from "bcrypt";

const PasswordHelper = {
  /**
   * Hash Password Method
   * @param {string} password
   * @returns {string} returns hashed password
   */
  hashPassword(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8));
  },

  /**
   * comparePassword
   * @param {string} password
   * @param {string} encryptedPassword
   * @returns {Boolean} return True or False
   */
  comparePassword(password, encryptedPassword) {
    return bcrypt.compareSync(password, encryptedPassword);
  },

  /**
   * isValidEmail helper method
   * @param {string} email
   * @returns {Boolean} True or False
   */
  isValidEmail(email) {
    return /\S+@\S+\.\S+/.test(email);
  }
};

export default PasswordHelper;
