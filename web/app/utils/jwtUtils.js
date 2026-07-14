import { jwtDecode } from 'jwt-decode';

class jwtUtils {
  /**
   * Decodes a JSON Web Token (JWT) using the jwtDecode function.
   *
   * @function
   * @name decode
   * @param {string} token - The JWT to decode.
   * @returns {Object} The decoded payload of the JWT.
   */
  static decode = jwtDecode;
}

export default jwtUtils;
