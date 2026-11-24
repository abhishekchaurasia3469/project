if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const ExpressError = require("./utils/ExpressError.js");

const userRouter = require("./routes/user.js");
const reviewRouter = require("./routes/reviews.js");
const listingRouter = require("./routes/listing.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dburl = process.env.ATLAS_URL;

async function main() {
  if (!dburl) {
    throw new Error("ATLAS_URL is missing from .env");
  }

  if (!/^mongodb(?:\+srv)?:\/\//i.test(dburl)) {
    throw new Error(
      "ATLAS_URL must start with mongodb:// or mongodb+srv://. Copy the full connection string from MongoDB Atlas."
    );
  }

  await mongoose.connect(dburl);
  console.log("connected to DB");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const  store = MongoStore.create({
  mongoUrl: dburl,
  touchAfter: 24 * 60 * 60,
  crypto: {
    secret: process.env.SECRET,
  },
});

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e);
});

const sessionsOptions = {
  store,
  secret: process.env.SECRET ,
  resave: false,
  saveUninitialized: true,
  cookie : {
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
  },
};
app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

app.use(session(sessionsOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
next();
});

app.get("/register", async (req, res) => {
let fakeUser = new User({
  email: "test@example.com",
  username: "delta-student" ,
});

let registeredUser = await User.register(fakeUser, "abhishek");
  res.send(registeredUser);
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.use((req, res, next) => {
    next(new ExpressError(404, "page not found"));
});

app.use((err, req, res, next) => {
  let {statusCode=500, message="something went wrong!"} = err;
  res.status(statusCode).render("error.ejs", {message});
//  res.status(statusCode).send(message);
});

main()
  .then(() => {
    app.listen(8080, () => {
      console.log("server is listening to port 8080");
    });
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
  });
