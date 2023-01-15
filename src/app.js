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
  const validation = userSchema.validate(req.body, { abortEarly: false });

  try {
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

    const enteredMessage = {
      from: req.body.name,
      to: "Todos",
      text: "entra na sala...",
      type: "status",
      time: `${dayjs().format().hour()}:${dayjs().format().minute()}:${dayjs()
        .format()
        .second()}`,
    };
    console.log(enteredMessage.time);

    await db.collection("participants").insertOne(newUser);
    await db.collection("messages").insertOne(enteredMessage);
    res.status(201).send("Ok");
  } catch (error) {
    res.status(400).send(error);
    return;
  }
});

app.get("/participants", async (req, res) => {
  const participants = await db.collection("participants").find().toArray();
  res.send(participants);
});

app.post("/messages", async (req, res) => {
  const validation = messageSchema.validate(req.body, { abortEarly: false });
  const { user } = req.headers;
  const ifUserExists = await db
    .collection("participants")
    .findOne({ name: user });

  try {
    if (validation.error) {
      res.status(422).send(validation.error.details);
      return;
    }

    if (!ifUserExists) {
      res
        .status(422)
        .send("Para enviar mensagem, o usuário deve estar logado!");
      return;
    }

    const newMessage = {
      ...req.body,
      from: user,
      time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
    };

    await db.collection("messages").insertOne(newMessage);
    res.sendStatus(201);
  } catch (error) {
    res.status(400).send(error);
    return;
  }
});

/* server.post("/messages", async (req, res) => {
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
    time: `${dayjs().hour()}:${dayjs().minute()}:${dayjs().second()}`,
  };

  await db.collection("messages").insertOne(newMessage);

  res.sendStatus(201);
}); */

app.get("/messages", async (req, res) => {
  const messages = await db.collection("messages").find().toArray();
  res.send(messages);
});

app.listen(5000, () => {
  console.log(chalk.blue(`API Bate Papo UOL is runnig on port 5000`));
});
