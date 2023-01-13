import express from "express";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());

const mongoClient = new MongoClient(process.env.DATABASE_URL);
let db;

mongoClient
  .connect()
  .then(() => {
    db = mongoClient.db();
    console.log(chalk.green("Connected to database"));
  })
  .catch((err) => {
    console.log(chalk.red("Error connecting"));
  });

const userSchema = Joi.object({
  name: Joi.string().min(3).required(),
});

app.post("/participants", async (req, res) => {
  const validation = userSchema.validate(req.body);

  if (validation.error) {
    res.status(422).send(validation.error.details);
    return;
  }

  const ifUserExists = await db
    .collection("participants")
    .findOne({ name: req.body.name });

  if (ifUserExists) {
    res.status(409).send("Este nome de usuáio já está em uso, use outro!");
    return;
  }

  const newUser = {
    name: req.body.name,
    lastStatus: Date.now(),
  };

  await db.collection("participants").insertOne(newUser);
});

app.get("/participants", async (req, res) => {
  const participants = await db.collection("participants").find().toArray();
  res.send(participants);
});

app.listen(5000, () => {
  console.log(chalk.blue(`API Bate Papo UOL is runnig on port 5000`));
});
