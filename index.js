const app = require("./app");

const port = 4400;

app.listen(process.env.PORT || port, () => {
  console.log("Started server at port " + port);
});
