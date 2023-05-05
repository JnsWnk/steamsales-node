const bcrypt = require("bcrypt");
const saltRounds = 10;
const { getConnection } = require("../utils/db");

class UserService {
  constructor() {}

  async createUser(name, email, password) {
    const connection = await getConnection();
    try {
      const hash = await this.hash(password);
      const results = await connection
        .promise()
        .query("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", [
          name,
          email,
          hash,
        ]);
      if (results[0].affectedRows === 0) {
        throw new Error("User not created");
      }
      return results[0];
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async getUserById(id) {
    const connection = await getConnection();
    try {
      const results = await connection
        .promise()
        .query("SELECT id, name, email, steamid FROM users WHERE id = ?", [id]);
      if (results[0].length === 0) {
        throw new Error("User not found");
      }
      return results[0];
    } catch (error) {
      throw new Error(`Error getting user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async loginUser(email, password) {
    const connection = await getConnection();
    try {
      const results = this.db
        .promise()
        .query("SELECT id, name, email, steamid FROM users WHERE email = ?", [
          email,
        ]);
      if (results[0].length === 0) {
        throw new Error("User not found");
      }
      const match = await bcrypt.compare(password, results[0].password);
      if (match) {
        return results[0];
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      throw new Error(`Error logging in user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async updateUser(id, name, email, steamid) {
    const connection = await getConnection();
    try {
      const results = connection
        .promise()
        .query(
          "UPDATE users SET name = ?, email = ?, steamid = ? WHERE id = ?",
          [name, email, steamid, id]
        );
      if (results.affectedRows == 0) {
        throw new Error("User not updated");
      }
      const updatedUser = await this.getUserById(id);
      return updatedUser;
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async updatePassword(id, oldPassword, newPassword) {
    const connection = await getConnection();

    try {
      const result = connection.query("SELECT * FROM users WHERE id = ?", [id]);
      if (result.length == 0) {
        throw new Error("User not found");
      }
      const match = await bcrypt.compare(oldPassword, result[0].password);
      if (match) {
        const hash = await this.hash(newPassword);
        const results = connection
          .promise()
          .query("UPDATE users SET password = ? WHERE id = ?", [hash, id]);
        if (results.affectedRows == 0) {
          throw new Error("User not updated");
        }
        return;
      } else {
        throw new Error("Invalid credentials");
      }
    } catch (error) {
      throw new Error(`Error updating user: ${error.message}`);
    } finally {
      connection.release();
    }
  }

  async hash(password) {
    return await bcrypt.hash(password, saltRounds);
  }
}

module.exports = UserService;
