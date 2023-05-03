const bcrypt = require("bcrypt");
const saltRounds = 10;
const { getDb } = require("../utils/db");

class UserService {
  constructor(db) {
    this.db = db || getDb();
  }

  async createUser(name, email, password) {
    try {
      const hash = await this.hash(password);
      const results = await this.db
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
    }
  }

  async getUserById(id) {
    try {
      const results = await this.db
        .promise()
        .query("SELECT id, name, email, steamid FROM users WHERE id = ?", [id]);
      if (results[0].length === 0) {
        throw new Error("User not found");
      }
      return results[0];
    } catch (error) {
      throw new Error(`Error getting user: ${error.message}`);
    }
  }

  async loginUser(email, password) {
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
    }
  }

  async updateUser(id, name, email, steamid) {
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
    }
  }

  async updatePassword(id, oldPassword, newPassword) {
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
    }
  }

  async hash(password) {
    return await bcrypt.hash(password, saltRounds);
  }
}
