const express = require("express");
const app = express();
const csrf = require("tiny-csrf");
const cookieParser = require("cookie-parser");
const {
  adminModel,
  electionsModel,
  questionsModel,
  optionsModel,
  votersModel,
} = require("./models");
const bodyParser = require("body-parser");
const path = require("path");
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
app.use(cookieParser("Some secret String"));
app.use(csrf("this_should_be_32_character_long", ["POST", "PUT", "DELETE"]));

app.use(
  session({
    secret: "my-super-secret-key-2837428907583420",
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);
app.use((request, response, next) => {
  response.locals.messages = request.flash();
  next();
});
app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStratergy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    (username, password, done) => {
      adminModel
        .findOne({ where: { email: username } })
        .then(async (user) => {
          const result = await bcrypt.compare(password, user.password);
          if (result) {
            return done(null, user);
          } else {
            return done(null, false, { message: "Invalid password" });
          }
        })
        .catch(() => {
          return done(null, false, { message: "Invalid Email-ID" });
        });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  adminModel
    .findByPk(id)
    .then((user) => {
      done(null, user);
    })
    .catch((error) => {
      done(error, null);
    });
});

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

// The Main Landing Page
app.get("/", (request, response) => {
  if (request.user) {
    return response.redirect("/elections");
  } else {
    response.render("index", {
      title: "Online Voting Platform",
      csrfToken: request.csrfToken(),
    });
  }
});

// This is the Home Pafe for Elections
app.get(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    let loggedinuser = request.user.firstName + " " + request.user.lastName;
    try {
      const elections = await electionsModel.getElections(request.user.id);
      if (request.accepts("html")) {
        response.render("elections", {
          title: "Online Voting Platform",
          userName: loggedinuser,
          elections,
        });
      } else {
        return response.json({
          elections,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for the Sign UP page
app.get("/signup", (request, response) => {
  response.render("signup", {
    title: "Create admin account",
    csrfToken: request.csrfToken(),
  });
});

// This is for creating the Admin account 
app.post("/admin", async (request, response) => {
  if (!request.body.firstName) {
    request.flash("error", "Please enter your first name");
    return response.redirect("/signup");
  }
  if (!request.body.email) {
    request.flash("error", "Please enter email ID");
    return response.redirect("/signup");
  }
  if (!request.body.password) {
    request.flash("error", "Please enter your password");
    return response.redirect("/signup");
  }
  if (request.body.password < 8) {
    request.flash("error", "Password length should be atleast 8");
    return response.redirect("/signup");
  }
  const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
  try {
    const user = await adminModel.createAdmin({
      firstName: request.body.firstName,
      lastName: request.body.lastName,
      email: request.body.email,
      password: hashedPwd,
    });
    request.login(user, (err) => {
      if (err) {
        console.log(err);
        response.redirect("/");
      } else {
        response.redirect("/elections");
      }
    });
  } catch (error) {
    request.flash("error", error.message);
    return response.redirect("/signup");
  }
});

//This is for the Login Page 
app.get("/login", (request, response) => {
  if (request.user) {
    return response.redirect("/elections");
  }
  response.render("login", {
    title: "Login to your account",
    csrfToken: request.csrfToken(),
  });
});

// This is the User Login 
app.post(
  "/session",
  passport.authenticate("local", {
    failureRedirect: "/login",
    failureFlash: true,
  }),
  (request, response) => {
    response.redirect("/elections");
  }
);

// This is for Signing out 
app.get("/signout", (request, response, next) => {
  request.logout((err) => {
    if (err) {
      return next(err);
    }
    response.redirect("/");
  });
});

// THis is for Creating Election in Election Page
app.get(
  "/elections/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    return response.render("create_new_election", {
      title: "Create an election",
      csrfToken: request.csrfToken(),
    });
  }
);

// This is for Posting the content to Elections
app.post(
  "/elections",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.electionName.length < 5) {
      request.flash("error", "Election name length should be atleast 5");
      return response.redirect("/elections/create");
    }
    try {
      await electionsModel.addElection({
        electionName: request.body.electionName,
        adminID: request.user.id,
      });
      return response.redirect("/elections");
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Managing Elections Home Page
app.get(
  "/elections/:id",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const election = await electionsModel.getElection(request.params.id);
      const numberOfQuestions = await questionsModel.getNumberOfQuestions(
        request.params.id
      );
      const numberOfVoters = await votersModel.getNumberOfVoters(
        request.params.id
      );
      return response.render("election_homepage", {
        id: request.params.id,
        title: election.electionName,
        nq: numberOfQuestions,
        nv: numberOfVoters,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is to Manage the Questions Home page
app.get(
  "/elections/:id/questions",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const election = await electionsModel.getElection(request.params.id);
      const questions = await questionsModel.getQuestions(request.params.id);
      if (request.accepts("html")) {
        return response.render("questions", {
          title: election.electionName,
          id: request.params.id,
          questions: questions,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          questions,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Adding the question for the Election
app.get(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    return response.render("create_new_question", {
      id: request.params.id,
      csrfToken: request.csrfToken(),
    });
  }
);

//posting the question
app.post(
  "/elections/:id/questions/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (request.body.question.length < 5) {
      request.flash("error", "question length should be atleast 5");
      return response.redirect(
        `/elections/${request.params.id}/questions/create`
      );
    }
    try {
      const question = await questionsModel.addQuestion({
        question: request.body.question,
        description: request.body.description,
        electionID: request.params.id,
      });
      return response.redirect(
        `/elections/${request.params.id}/questions/${question.id}`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Modifying the question
app.get(
  "/elections/:electionID/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const question = await questionsModel.getQuestion(
        request.params.questionID
      );
      return response.render("update_question", {
        electionID: request.params.electionID,
        questionID: request.params.questionID,
        questionTitle: question.question,
        questionDescription: question.description,
        csrfToken: request.csrfToken(),
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is to edit question
app.put(
  "/questions/:questionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const updatedQuestion = await questionsModel.updateQuestion({
        question: request.body.question,
        description: request.body.description,
        id: request.params.questionID,
      });
      return response.json(updatedQuestion);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Deleting the question
app.delete(
  "/elections/:electionID/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const nq = await questionsModel.getNumberOfQuestions(
        request.params.electionID
      );
      if (nq > 1) {
        const res = await questionsModel.deleteQuestion(
          request.params.questionID
        );
        return response.json({ success: res === 1 });
      } else {
        return response.json({ success: false });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is the question page
app.get(
  "/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const question = await questionsModel.getQuestion(
        request.params.questionID
      );
      const options = await optionsModel.getOptions(request.params.questionID);
      if (request.accepts("html")) {
        response.render("question_page", {
          title: question.question,
          description: question.description,
          id: request.params.id,
          questionID: request.params.questionID,
          options,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          options,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Adding Options to Questions
app.post(
  "/elections/:id/questions/:questionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.option.length) {
      request.flash("error", "Please enter option");
      return response.redirect("/elections");
    }
    try {
      await optionsModel.addOption({
        option: request.body.option,
        questionID: request.params.questionID,
      });
      return response.redirect(
        `/elections/${request.params.id}/questions/${request.params.questionID}`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for the  Deleting Options
app.delete(
  "/options/:optionID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await optionsModel.deleteOption(request.params.optionID);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is for Edit the options
app.get(
  "/elections/:electionID/questions/:questionID/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const option = await optionsModel.getOption(request.params.optionID);
      return response.render("update_option", {
        option: option.option,
        csrfToken: request.csrfToken(),
        electionID: request.params.electionID,
        questionID: request.params.questionID,
        optionID: request.params.optionID,
      });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//This is for Update The Options
app.put(
  "/options/:optionID/edit",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const updatedOption = await optionsModel.updateOption({
        id: request.params.optionID,
        option: request.body.option,
      });
      return response.json(updatedOption);
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is the Voters Page
app.get(
  "/elections/:electionID/voters",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const voters = await votersModel.getVoters(request.params.electionID);
      const election = await electionsModel.getElection(
        request.params.electionID
      );
      if (request.accepts("html")) {
        return response.render("voters", {
          title: election.electionName,
          id: request.params.electionID,
          voters,
          csrfToken: request.csrfToken(),
        });
      } else {
        return response.json({
          voters,
        });
      }
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

// This is to Show the  Voter into voter Page
app.get(
  "/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),
  (request, response) => {
    response.render("create_new_voter", {
      title: "Add a voter to election",
      electionID: request.params.electionID,
      csrfToken: request.csrfToken(),
    });
  }
);

// This is to Post the Voter to voter page
app.post(
  "/elections/:electionID/voters/create",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    if (!request.body.voterid) {
      request.flash("error", "Please enter voterID");
      return response.redirect(
        `/elections/${request.params.electionID}/voters/create`
      );
    }
    if (!request.body.password) {
      request.flash("error", "Please enter password");
      return response.redirect(
        `/elections/${request.params.electionID}/voters/create`
      );
    }
    const hashedPwd = await bcrypt.hash(request.body.password, saltRounds);
    try {
      await votersModel.createVoter({
        voterid: request.body.voterid,
        password: hashedPwd,
        electionID: request.params.electionID,
      });
      return response.redirect(
        `/elections/${request.params.electionID}/voters`
      );
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);

//This is to Delete the voter
app.delete(
  "/elections/:electionID/voters/:voterID",
  connectEnsureLogin.ensureLoggedIn(),
  async (request, response) => {
    try {
      const res = await votersModel.deleteVoter(request.params.voterID);
      return response.json({ success: res === 1 });
    } catch (error) {
      console.log(error);
      return response.status(422).json(error);
    }
  }
);


module.exports = app;
