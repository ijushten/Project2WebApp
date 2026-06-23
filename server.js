import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import { connectDatabase } from "./src/db.js";
import { requireAuth, redirectIfLoggedIn } from "./src/auth.js";
import User from "./src/models/User.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", "views");
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({ secret: process.env.SESSION_SECRET || "dev_secret_change_me", resave: false, saveUninitialized: false }));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.username ? { username: req.session.username, userId: req.session.userId } : null;
  next();
});

function clean(value) {
  return String(value || "").trim();
}

app.get("/", (req, res) => res.render("home", { title: "LessonAI" }));
app.get("/signup", redirectIfLoggedIn, (req, res) => res.render("signup", { title: "Sign Up", error: null, values: {} }));
app.get("/signin", redirectIfLoggedIn, (req, res) => res.render("signin", { title: "Sign In", error: null, values: {} }));

app.post("/signup", redirectIfLoggedIn, async (req, res) => {
  try {
    const username = clean(req.body.username);
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).render("signup", { title: "Sign Up", error: "Please fill in every field.", values: { username, email } });
    }

    if (password.length < 6) {
      return res.status(400).render("signup", { title: "Sign Up", error: "Password must be at least 6 characters.", values: { username, email } });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render("signup", { title: "Sign Up", error: "An account with that email already exists.", values: { username, email } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });
    req.session.userId = user._id.toString();
    req.session.username = user.username;
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).render("signup", { title: "Sign Up", error: "Something went wrong while creating your account.", values: req.body });
  }
});

app.post("/signin", redirectIfLoggedIn, async (req, res) => {
  try {
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).render("signin", { title: "Sign In", error: "Please enter your email and password.", values: { email } });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).render("signin", { title: "Sign In", error: "Incorrect email or password.", values: { email } });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).render("signin", { title: "Sign In", error: "Incorrect email or password.", values: { email } });
    }

    req.session.userId = user._id.toString();
    req.session.username = user.username;
    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).render("signin", { title: "Sign In", error: "Something went wrong while signing in.", values: req.body });
  }
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.render("dashboard", { title: "Dashboard", error: null, values: {} });
});

connectDatabase().then(() => app.listen(PORT, () => console.log(`LessonAI is running on port ${PORT}`)));
