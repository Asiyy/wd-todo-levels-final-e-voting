const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
let server, agent;

//function to extract csrf token
function extractCsrfToken(response) {
  var $ = cheerio.load(response.text);
  return $("[name=_csrf]").val();
}

describe("Let Us test the Todo", () => {
  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    server = app.listen(4000, () => {});
    agent = request.agent(server);
  });
  afterAll(async () => {
    await db.sequelize.close();
    server.close();
  });
  //Test
  test("Creating a New Todo", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    const response = await agent.post("/todos").send({
      title: "Complete Assignments",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });
    expect(response.statusCode).toBe(422);
  });

  // Test for false to true

  test("Updating the Completed field of a given Todo list : ", async () => {
    const res = await agent.get("/");
    const csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Beginning Title",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const todoID = await agent.get("/todos").then((response) => {
      const parsedResponse1 = JSON.parse(response.text);
      return parsedResponse1[1]["id"];
    });

    // Testing for false to true
    const setCompletionResponse1 = await agent
      .put(`/todos/${todoID}`)
      .send({ completed: true, _csrf: csrfToken });
    const parsedUpdateResponse3 = JSON.parse(setCompletionResponse1.text);
    expect(parsedUpdateResponse3.completed).toBe(true);

    // Testing for true to false
    const setCompletionResponse2 = await agent
      .put(`/todos/${todoID}`)
      .send({ completed: false, _csrf: csrfToken });
    const parsedUpdateResponse2 = JSON.parse(setCompletionResponse2.text);
    expect(parsedUpdateResponse2.completed).toBe(false);
  });

  //Test

  test("Marking a todo as complete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Title 1",
      dueDate: new Date().toLocaleString("en-CA"),
      completed: false,
      _csrf: csrfToken,
    });

    const gropuedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(gropuedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);
    console.log(latestTodo);
    const markAsCompleteresponse = await agent
      .put(`todos/${latestTodo["id"]}`)
      .send({
        _csrf: csrfToken,
      });
    const parsedUpdateResponse = JSON.parse(markAsCompleteresponse.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });

  //Marking a todo as incomplete
  test("Marks a todo with the Specific ID as incomplete", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Testing is Incomplete",
      dueDate: new Date().toISOString(),
      completed: true,
      _csrf: csrfToken,
    });

    const groupedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponsee = JSON.parse(groupedTodosResponse.text);
    const completedItemsCount = parsedGroupedResponsee.completedItems.length;
    const latestTodoo =
      parsedGroupedResponsee.completedItems[completedItemsCount - 1];
    const completed = !latestTodoo.completed;
    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const markCompleteResponses = await agent
      .put(`/todos/${latestTodoo.id}`)
      .send({
        _csrf: csrfToken,
        completed: completed,
      });

    const parsedUpdateResponses = JSON.parse(markCompleteResponses.text);
    expect(parsedUpdateResponses.completed).toBe(false);
  });

  //Test
  test("Delete todo using ID", async () => {
    let res = await agent.get("/");
    let csrfToken = extractCsrfToken(res);
    await agent.post("/todos").send({
      title: "Ending Title",
      dueDate: new Date().toISOString(),
      completed: false,
      _csrf: csrfToken,
    });

    const gropuedTodosResponse = await agent
      .get("/")
      .set("Accept", "application/json");
    const parsedGroupedResponse = JSON.parse(gropuedTodosResponse.text);
    const dueTodayCount = parsedGroupedResponse.dueToday.length;
    const latestTodo = parsedGroupedResponse.dueToday[dueTodayCount - 1];

    res = await agent.get("/");
    csrfToken = extractCsrfToken(res);

    const response = await agent.put(`todos/${latestTodo.id}`).send({
      _csrf: csrfToken,
    });
    const parsedUpdateResponse = JSON.parse(response.text);
    expect(parsedUpdateResponse.completed).toBe(true);
  });
});
