const mysql = require("mysql2");
const dotenv = require("dotenv");

dotenv.config();

const db = mysql.createPool({
  host: "containers-us-west-192.railway.app",
  port: 6317,
  user: "root",
  password: "xl6zMnZtvr3oFiwYO9BW",
  database: "railway",
});

module.exports = db;
