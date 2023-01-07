const express = require("express");
const app = express();
var csrf = require("tiny-csrf");
var cookieParser = require("cookie-parser");
const { Todo, User } = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
//exporting all the libraries related to level10
const bcrypt = require("bcrypt");
const passport = require("passport");
const connectEnsureLogin = require("connect-ensure-login");
const session = require("express-session");
const flash = require("connect-flash");
const LocalStratergy = require("passport-local");

const saltRounds = 10;

app.set("views", path.join(__dirname, "views"));
app.use(flash());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser("Some secret string"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(function (request, response, next) {
  response.locals.messages = request.flash();
  next();
});

//initializing and session
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      User.findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Password is invalid!!!" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "EmailID is invalid" });
        });
    }
  )
);

//serializing the user
passport.serializeUser((user, done) => {
  console.log("Serialize use in session", user.id);
  done(null, user.id);
});

//deserializing the user
passport.deserializeUser((id, done) => {
  User.findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.set("view engine", "ejs");
// eslint-disable-next-line no-undef
app.use(express.static(path.join(__dirname, "public")));

app.get("/", async function (request, response) {
  // response.render("index", {
  //   title: "My Todo Manager",
  //   csrfToken: request.csrfToken(),
  // });
  if (request.user) {
    return response.redirect("/todos");
  } else {
    response.render("index", {
      title: "My Todo Manager",
      csrfToken: request.csrfToken(),
    });
  }
});

app.get("/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const userName = request.user.firstName + " " + request.user.lastName;
      const loggedIn = request.user.id;
      const overDue = await Todo.overDue(loggedIn);
      const dueToday = await Todo.dueToday(loggedIn);
      const dueLater = await Todo.dueLater(loggedIn);
      const completedItems = await Todo.completedItemsAre(loggedIn);
      if (request.accepts("html")) {
        response.render("todos", {
          title: "To-Do Manager",
          userName,
          overDue,
          dueToday,
          dueLater,
          completedItems,
          csrfToken: request.csrfToken(),
        });
      } else {
        response.json({
          overDue,dueToday,dueLater,completedItems,
        });
      }
    } catch (err1) {
      console.log(err1);
      return response.status(422).json(err1);
    }
  }
);


//Route for users
app.post("/users", async (request, response) => {
  if (!request.body.firstName) {
    request.flash("error", "Please do enter your first name");
    return response.redirect("/signup");
  }
  if (!request.body.email) {
    request.flash("error", "Please do enter your email ID");
    return response.redirect("/signup");
  }
  if (!request.body.password) {
    request.flash("error", "Please do enter your password");
    return response.redirect("/signup");
  }
  if (request.body.password < 8) {
    request.flash("error", "Length of password should be atleast 8");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await User.create({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err1) => {
      if (err1) {
        console.log(err1);
        response.redirect("/");
      } else {
        response.redirect("/todos");
      }
    });
  } catch (errori) {
    request.flash("error", errori.message);
    return response.redirect("/signup");
  }
});

//Route for login
app.get("/login", (request, response) => {
  response.render("login", {
    title: "Login",
    csrfToken: request.csrfToken(),
  });
});

//Route for signup
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Sign up",
    csrfToken: request.csrfToken(),
  });
});

//Route for session
app.post("/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/todos");
  }
);

//Route for signout
app.get("/signout", (req, res, next) => {
  req.logout((err1) => {
    if (err1) {
      return next(err1);
    }
    res.redirect("/");
  });
});

//Not required for this level
app.get("/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    try {
      const todo1 = await Todo.findByPk(request.params.id);
      return response.json(todo1);
    } catch (error2) {
      console.log(error2);
      return response.status(422).json(error2);
    }
  }
);

//Route for todos
app.post("/todos",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    if (request.body.title.length < 5) {
      request.flash("error", "Lenght of title should be atleast 5");
      return response.redirect("/todos");
    }
    if (!request.body.dueDate) {
      request.flash("error", "Please do select a due date");
      return response.redirect("/todos");
    }
    try {
      await Todo.addaTodo({
        title: request.body.title,
        dueDate: request.body.dueDate,
        userID: request.user.id,
      });
      return response.redirect("/todos");
    } catch (error1) {
      console.log(error1);
      return response.status(422).json(error1);
    }
  }
);

//Route for completion status
app.put("/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (request, response) {
    // const todo = await Todo.findByPk(request.params.id);
    try {
      const todo = await Todo.findByPk(request.params.id);
      const updatedTodoIs = await todo.setCompletionStatusAs(
        request.body.completed
      );
      return response.json(updatedTodoIs);
    } catch (error1) {
      console.log(error1);
      return response.status(422).json(error1);
    }
  }
);

//Route for deleting
app.delete("/todos/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async function (req, resp) {
    console.log("Delete a todo with a particular id : ", req.params.id);
    // FILL IN YOUR CODE HERE
    try {
      const res = await Todo.remove(req.params.id, req.user.id);
      return res.json({ success: res === 1 });
    } catch (error1) {
      console.log(error1);
      return resp.status(422).json(error1);
    }
  }
);

module.exports = app;