import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("home", { title: "LessonAI" });
});

app.listen(PORT, () => {
  console.log(`LessonAI is running on port ${PORT}`);
});
