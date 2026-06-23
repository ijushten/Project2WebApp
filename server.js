import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import { connectDatabase } from "./src/db.js";
import { requireAuth, redirectIfLoggedIn } from "./src/auth.js";

const app = express();
dotenv.config();

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false
}));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.username ? { username: req.session.username } : null;
  next();
});

app.get("/", (req, res) => {
  res.render("home", { title: "LessonAI" });
});

app.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("signup", { title: "Sign Up", error: null, values: {} });
});

app.get("/signin", redirectIfLoggedIn, (req, res) => {
  res.render("signin", { title: "Sign In", error: null, values: {} });
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { title: "Dashboard", error: null, values: {} });
});

connectDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`LessonAI is running on port ${PORT}`);
  });
});
