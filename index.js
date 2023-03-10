const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const db = require("./config/database");

// Cargando variables de entorno desde un archivo .env
dotenv.config();

// Crear una aplicación de Express
const app = express();

const PORT = process.env.PORT;

// Middleware para procesar datos JSON y de formularios
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware para permitir solicitudes CORS desde cualquier origen
app.use(cors());

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: "containers-us-west-192.railway.app",
  port: 6317,
  user: "root",
  password: "xl6zMnZtvr3oFiwYO9BW",
  database: "railway",
});

const secretKey = process.env.JWT_SECRET;

// Conectar a la base de datos
connection.connect((err) => {
  if (err) {
    console.error("Error al conectarse a la base de datos: " + err.stack);
    return;
  }
  console.log("Conectado a la base de datos como el ID " + connection.threadId);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Ruta para la página de inicio
app.post("/home", (req, res) => {
  const { token } = req.body;
  jwt.verify(token, secretKey, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json({ message: "La sesión caduco. Vuelva a iniciar sesión." });
    }
  });
});

app.post("/login", (req, res) => {
  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  db.query(
    `SELECT * FROM accessKeys WHERE username = ?`,
    [user],

    (err, results) => {
      if (err) {
        console.log(err);

        return res.status(500).json({ message: "Server error" });
      }

      if (results.length === 0) {
        return res
          .status(401)
          .json({ message: "Usuario o contraseña incorrecto" });
      }

      if (password !== results[0].password) {
        return res
          .status(401)
          .json({ message: "Usuario o contraseña incorrecto" });
      }

      const token = jwt.sign({ id: results[0].id }, secretKey, {
        expiresIn: "24h", // expires in 24 hours
      });

      res.status(200).json({ token: token, id: results[0].id });
    }
  );
});

app.post("/appointments", (req, res) => {
  // console.log(req.body);
  const {
    anticipo,
    clientName,
    initialDate,
    finalPrice,
    image,
    instagram,
    lastName,
    notes,
    phoneNumber,
    service,
    initialTime,
    finishTime,
    attended,
    id_clientsRequeriments,
  } = req.body;

  const sqlInsert =
    "INSERT INTO clientsRequeriments(name, lastName, initialDate, initialTime, finishTime, anticipo, image, finalPrice, phoneNumber, instagram, service, notes, attended, id_clientsRequeriments) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

  db.query(
    sqlInsert,
    [
      clientName,
      lastName,
      initialDate,
      initialTime,
      finishTime,
      anticipo,
      null,
      finalPrice,
      phoneNumber,
      instagram,
      service,
      notes,
      null,
      id_clientsRequeriments,
    ],

    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
      }

      res
        .status(200)
        .json({ message: "Todo se guardo correctamente", result: results });
    }
  );
});

app.post("/appointments-today", (req, res) => {
  // console.log(req.body);
  const { id_clientsRequeriments } = req.body;

  // const sqlInsert =
  //   "INSERT INTO clientsrequeriments(name, lastName, initialDate, initialTime, finishTime, anticipo, image, finalPrice, phoneNumber, instagram, service, notes, attended, id_clientsRequeriments) VALUES (?, ?, ?, ?, ?, ?, null, ?, ?, ?, ?, ?, ?, ?)";

  const sqlInsert =
    "SELECT * FROM clientsRequeriments WHERE id_clientsRequeriments = ? AND attended IS NULL AND initialDate = CURDATE() ORDER BY TIME(initialTime) ASC;";

  db.query(
    sqlInsert,
    [id_clientsRequeriments],

    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
      }

      res.status(200).json({ results });
    }
  );
});

app.post("/isAttended", (req, res) => {
  const { attended, id_clientsRequeriments, finalPrice, idAppointment } =
    req.body;

  const sqlInsert =
    "UPDATE clientsRequeriments SET attended = ? WHERE id_clientsRequeriments = ? AND id = ?;";

  db.query(
    sqlInsert,
    [attended, id_clientsRequeriments, idAppointment],

    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
      }

      const updateSql = `UPDATE earnings
      SET today = today + ?,
          weekly = CASE
                     WHEN WEEK(lastUpdated) = WEEK(NOW()) THEN weekly + ?
                     ELSE ?
                   END,
          monthly = CASE
                      WHEN MONTH(lastUpdated) = MONTH(NOW()) THEN monthly + ?
                      ELSE ?
                   END,
          lastUpdated = NOW()
      WHERE id_earnings = ? 
      AND EXISTS (
        SELECT *
        FROM (
          SELECT *
          FROM clientsRequeriments
          WHERE attended = true
        ) AS subquery
        WHERE subquery.id_clientsRequeriments = ?
      );`;

      if (attended) {
        connection.query(
          updateSql,
          [
            finalPrice,
            finalPrice,
            finalPrice,
            finalPrice,
            finalPrice,
            id_clientsRequeriments,
            id_clientsRequeriments,
          ],
          (err, result) => {
            if (err) throw err;

            console.log("Tabla earnings actualizada.");

            res.send("Requerimiento de cliente agregado correctamente.");
          }
        );
      } else {
        const finalPriceFalse = 0.0;

        connection.query(
          updateSql,
          [
            finalPriceFalse,
            finalPriceFalse,
            finalPriceFalse,
            finalPriceFalse,
            finalPriceFalse,
            id_clientsRequeriments,
            id_clientsRequeriments,
          ],
          (err, result) => {
            if (err) throw err;

            console.log("Tabla earnings actualizada.");

            res.send("Requerimiento de cliente agregado correctamente.");
          }
        );
      }
    }
  );
});

app.get("/getEarnings", (req, res) => {
  const sqlGet = "SELECT * FROM earnings;";

  db.query(sqlGet, (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }

    res.status(200).json({ results });
  });
});

app.post("/admAppointment", (req, res) => {
  const { id_clientsRequeriments } = req.body;

  const sqlGet =
    "SELECT * FROM clientsRequeriments WHERE id_clientsRequeriments = ? AND attended IS NULL AND initialDate >= CURDATE() ORDER BY initialDate ASC, initialTime ASC;";

  db.query(sqlGet, [id_clientsRequeriments], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    }

    res.status(200).json({ results });
  });
});

app.delete("/deleteAppointments", (req, res) => {
  const { id_clientsRequeriments, ids } = req.body;

  const placeholders = ids.map(() => "?").join(", ");

  const sqlGet = `DELETE FROM clientsRequeriments WHERE id IN (${placeholders}) AND id_clientsRequeriments = ? `;

  db.query(sqlGet, [...ids, id_clientsRequeriments], (err, results) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: "Server error" });
    } else {
      res.status(200).json({ results });
    }
  });
});

app.put("/editAppointments", (req, res) => {
  // console.log(req.body);
  const {
    anticipo,
    clientName,
    initialDate,
    finalPrice,
    image,
    instagram,
    lastName,
    notes,
    phoneNumber,
    service,
    initialTime,
    finishTime,
    attended,
    id,
  } = req.body;

  const sqlInsert =
    "UPDATE clientsRequeriments SET name = ?, lastName = ?, initialDate = ?, initialTime = ?, finishTime = ?, anticipo = ?, image = ?, finalPrice = ?, phoneNumber = ?, instagram = ?, service = ?, notes = ?, attended = ? WHERE id = ?;";

  db.query(
    sqlInsert,
    [
      clientName,
      lastName,
      initialDate,
      initialTime,
      finishTime,
      anticipo,
      null,
      finalPrice,
      phoneNumber,
      instagram,
      service,
      notes,
      null,
      id,
    ],

    (err, results) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ message: "Server error" });
      }

      res
        .status(200)
        .json({ message: "Todo se edito correctamente", result: results });
    }
  );
});
