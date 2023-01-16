import express from "express";
import cors from "cors";
import chalk from "chalk";
import Joi from "joi";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
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

const messageSchema = Joi.object({
  to: Joi.string().required(),
  text: Joi.string().required(),
  type: Joi.string().valid("message", "private_message").required(),
});

app.post("/participants", async (req, res) => {
  const validation = userSchema.validate(req.body);

  if (validation.error) {
    res.status(422);
    res.send(validation.error.details);
    return;
  }
  const ifUserExists = await db
    .collection("participants")
    .findOne({ name: req.body.name });
  if (ifUserExists) {
    res.status(409);
    res.send("Este nome já está sendo usado, escolha outro!");
    return;
  }

  const newUser = {
    name: req.body.name,
    lastStatus: Date.now(),
  };

  const sucessMessage = {
    from: req.body.name,
    to: "Todos",
    text: "entra na sala...",
    type: "status",
    time: `${dayjs().format("HH:mm:ss")}`,
  };

  await db.collection("participants").insertOne(newUser);
  await db.collection("messages").insertOne(sucessMessage);
  res.status(201).send({ message: "OK" });
});

app.get("/participants", async (req, res) => {
  const participants = await db.collection("participants").find().toArray();
  res.send(participants);
});

app.post("/messages", async (req, res) => {
  const validation = messageSchema.validate(req.body);
  const user = req.headers.user;
  const ifUserExists = await db
    .collection("participants")
    .findOne({ name: user });

  if (validation.error) {
    res.status(422);
    res.send(validation.error.details);
    return;
  }
  if (!ifUserExists) {
    res.status(422);
    res.send("O usuário que você mandou mensagem não está logado!");
    return;
  }

  const newMessage = {
    ...req.body,
    from: user,
    time: `${dayjs().format("HH:mm:ss")}`,
  };

  await db.collection("messages").insertOne(newMessage);

  res.sendStatus(201);
});

app.get("/messages", async (req, res) => {
  const limit = parseInt(req.query.limit);
  const user = req.headers.user;

  let messages = await db
    .collection("messages")
    .find({
      $or: [{ to: user }, { from: user }, { to: "Todos" }, { type: "message" }],
    })
    .toArray();
  messages.reverse();

  if (!limit || limit <= 0) {
    res.status(422).send("Algo deu errado com as mensagens");
  }
  messages = messages.slice(0, limit);
  messages.reverse();

  res.send(messages);
});

app.post("/status", async (req, res) => {
  const user = req.headers.user;
  const ifUserExists = await db
    .collection("participants")
    .findOne({ name: user });

  if (!ifUserExists) {
    res.status(404);
    return;
  }

  await db
    .collection("participants")
    .updateOne({ name: user }, { $set: { lastStatus: Date.now() } });
  res.sendStatus(200);
});




app.listen(5000, () => {
  console.log(chalk.blue(`API Bate Papo UOL is runnig on port 5000`));
});
