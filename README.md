
LessonAI MongoDB Version

LessonAI is an AI full stack web app that helps users generate classroom lesson plans. Users can sign up, sign in, create AI lesson plans with Google Gemini, save lesson plans to MongoDB, update personal notes, and delete saved lesson plans.

Features

- Home page
- Sign up page
- Sign in page
- Session-based authentication
- Password hashing with bcrypt
- Protected dashboard page
- Google Gemini API integration
- MongoDB Atlas database integration
- Create lesson plans
- Read saved lesson history
- Update teacher notes
- Delete saved lesson plans
- Responsive frontend design

Technologies Used

- Node.js
- Express
- EJS
- HTML
- CSS
- JavaScript
- MongoDB Atlas
- Mongoose
- bcryptjs
- express-session
- connect-mongo
- Google Gemini API
- Render

Folder Structure

```text
lesson-ai-mongo/
│
├── server.js
├── package.json
├── README.md
├── .env.example
├── .gitignore
│
├── src/
│   ├── auth.js
│   ├── db.js
│   ├── gemini.js
│   └── models/
│       ├── User.js
│       └── LessonPlan.js
│
├── public/
│   ├── styles.css
│   └── app.js
│
└── views/
    ├── home.ejs
    ├── signup.ejs
    ├── signin.ejs
    ├── dashboard.ejs
    ├── history.ejs
    ├── lesson.ejs
    └── not-found.ejs
```

Database Design

This app uses MongoDB Atlas. MongoDB stores data in collections instead of SQL tables.


Stores user account information.

```js
{
  username: String,
  email: String,
  passwordHash: String,
  createdAt: Date,
  updatedAt: Date
}
```


Stores AI-generated lesson plans for each user.

```js
{
  user: ObjectId,
  title: String,
  subject: String,
  topic: String,
  gradeLevel: String,
  lessonLength: String,
  learningGoal: String,
  lessonStyle: String,
  planText: String,
  notes: String,
  createdAt: Date,
  updatedAt: Date
}
```


Stores login sessions through connect-mongo.

API Used

This project uses the Google Gemini API

The app sends lesson details to Gemini and receives a generated lesson plan. The API key is stored in an environment variable and is never placed in frontend JavaScript.

How to Run Locally


npm install




MONGODB_URI=...
MONGODB_DB=cs355
GEMINI_API_KEY=...
SESSION_SECRET=make_this_a_long_random_secret
PORT=3000


npm start


Open this in your browser:


http://localhost:3000




Explanation of How It Works

1. The user signs up with a username, email, and password.
2. The password is hashed with bcrypt before being saved.
3. MongoDB stores the user document.
4. The user signs in.
5. The server checks the email and password.
6. If correct, a session is created.
7. The user opens the dashboard.
8. The user fills out lesson information.
9. The backend sends the lesson prompt to Gemini.
10. Gemini returns a lesson plan.
11. The lesson plan is saved in MongoDB.
12. The user can view, update notes, and delete the lesson.
