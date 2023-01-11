import express from "express";
import cors from "cors";
import chalk from "chalk";

const app = express();
const PORT = 5000;
app.use(express.json());
app.use(cors());

app.listen(PORT, () => {
  console.log(chalk.blue(`API do Bate Papo UOL is runnig on port ${PORT}`));
});
