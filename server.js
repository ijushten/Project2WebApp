import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectDatabase } from "./src/db.js";
import { generateLessonPlan } from "./src/gemini.js";
import { requireAuth, redirectIfLoggedIn } from "./src/auth.js";
import User from "./src/models/User.js";
import LessonPlan from "./src/models/LessonPlan.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const dbName = process.env.MONGODB_DB || "lessonai";

app.set("view engine", "ejs");
app.set("views", "views");
app.set("trust proxy", 1);

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public", { index: false }));

const sessionConfig = {
  secret: process.env.SESSION_SECRET || "dev_secret_change_me",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 24
  }
};

if (process.env.MONGODB_URI) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    dbName,
    collectionName: "sessions"
  });
}

app.use(session(sessionConfig));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.username
    ? { username: req.session.username, userId: req.session.userId }
    : null;
  next();
});

function clean(value) {
  return String(value || "").trim();
}

function makeTitle(subject, topic) {
  const shortTopic = clean(topic).slice(0, 80);
  const shortSubject = clean(subject).slice(0, 40);
  return `${shortSubject}: ${shortTopic}`;
}

app.get("/", (req, res) => {
  res.render("home", { title: "LessonAI" });
});

app.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("signup", { title: "Sign Up", error: null, values: {} });
});

app.post("/signup", redirectIfLoggedIn, async (req, res) => {
  try {
    const username = clean(req.body.username);
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || "");

    if (!username || !email || !password) {
      return res.status(400).render("signup", {
        title: "Sign Up",
        error: "Please fill in every field.",
        values: { username, email }
      });
    }

    if (password.length < 6) {
      return res.status(400).render("signup", {
        title: "Sign Up",
        error: "Password must be at least 6 characters.",
        values: { username, email }
      });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).render("signup", {
        title: "Sign Up",
        error: "An account with that email already exists.",
        values: { username, email }
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ username, email, passwordHash });

    req.session.userId = user._id.toString();
    req.session.username = user.username;

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).render("signup", {
      title: "Sign Up",
      error: "Something went wrong while creating your account.",
      values: req.body
    });
  }
});

app.get("/signin", redirectIfLoggedIn, (req, res) => {
  res.render("signin", { title: "Sign In", error: null, values: {} });
});

app.post("/signin", redirectIfLoggedIn, async (req, res) => {
  try {
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).render("signin", {
        title: "Sign In",
        error: "Please enter your email and password.",
        values: { email }
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).render("signin", {
        title: "Sign In",
        error: "Incorrect email or password.",
        values: { email }
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).render("signin", {
        title: "Sign In",
        error: "Incorrect email or password.",
        values: { email }
      });
    }

    req.session.userId = user._id.toString();
    req.session.username = user.username;

    res.redirect("/dashboard");
  } catch (error) {
    console.error(error);
    res.status(500).render("signin", {
      title: "Sign In",
      error: "Something went wrong while signing in.",
      values: req.body
    });
  }
});

app.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.redirect("/");
  });
});

app.get("/dashboard", requireAuth, async (req, res) => {
  const recentLessons = await LessonPlan.find({ user: req.session.userId })
    .sort({ createdAt: -1 })
    .limit(3);

  res.render("dashboard", {
    title: "Dashboard",
    error: null,
    values: {},
    recentLessons
  });
});

app.post("/lessons", requireAuth, async (req, res) => {
  const values = {
    subject: clean(req.body.subject),
    topic: clean(req.body.topic),
    gradeLevel: clean(req.body.gradeLevel),
    lessonLength: clean(req.body.lessonLength),
    learningGoal: clean(req.body.learningGoal),
    lessonStyle: clean(req.body.lessonStyle)
  };

  const recentLessons = await LessonPlan.find({ user: req.session.userId })
    .sort({ createdAt: -1 })
    .limit(3);

  try {
    if (
      !values.subject ||
      !values.topic ||
      !values.gradeLevel ||
      !values.lessonLength ||
      !values.learningGoal ||
      !values.lessonStyle
    ) {
      return res.status(400).render("dashboard", {
        title: "Dashboard",
        error: "Please complete every lesson field.",
        values,
        recentLessons
      });
    }

    const planText = await generateLessonPlan(values);

    const lesson = await LessonPlan.create({
      user: req.session.userId,
      title: makeTitle(values.subject, values.topic),
      subject: values.subject,
      topic: values.topic,
      gradeLevel: values.gradeLevel,
      lessonLength: values.lessonLength,
      learningGoal: values.learningGoal,
      lessonStyle: values.lessonStyle,
      planText
    });

    res.redirect(`/lessons/${lesson._id}`);
  } catch (error) {
    console.error(error);

    const message = error.isUserFacing
      ? error.message
      : "The lesson could not be generated right now. Please try again.";

    res.status(error.statusCode || 500).render("dashboard", {
      title: "Dashboard",
      error: message,
      values,
      recentLessons
    });
  }
});

app.get("/history", requireAuth, async (req, res) => {
  const lessons = await LessonPlan.find({ user: req.session.userId }).sort({ createdAt: -1 });
  res.render("history", { title: "History", lessons });
});

app.get("/lessons/:id", requireAuth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).render("not-found", { title: "Not Found" });
  }

  const lesson = await LessonPlan.findOne({ _id: req.params.id, user: req.session.userId });

  if (!lesson) {
    return res.status(404).render("not-found", { title: "Not Found" });
  }

  res.render("lesson", { title: lesson.title, lesson });
});

app.post("/lessons/:id/notes", requireAuth, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).render("not-found", { title: "Not Found" });
  }

  const lesson = await LessonPlan.findOneAndUpdate(
    { _id: req.params.id, user: req.session.userId },
    { notes: clean(req.body.notes) },
    { new: true }
  );

  if (!lesson) {
    return res.status(404).render("not-found", { title: "Not Found" });
  }

  res.redirect(`/lessons/${lesson._id}`);
});

app.post("/lessons/:id/delete", requireAuth, async (req, res) => {
  if (mongoose.Types.ObjectId.isValid(req.params.id)) {
    await LessonPlan.deleteOne({ _id: req.params.id, user: req.session.userId });
  }

  res.redirect("/history");
});

app.use((req, res) => {
  res.status(404).render("not-found", { title: "Not Found" });
});

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LessonAI is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server failed to start:", error.message);
    process.exit(1);
  });
