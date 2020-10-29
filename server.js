import express from "express";
import "@babel/polyfill";
import AuthorizationMiddleware from "./src/middleware/Security/AuthorizationMiddleware";
import UserHandler from "./src/handlers/UserHandler";
import FitbitHandler from "./src/handlers/FitbitHandler";
import DataFetcher from "./src/helpers/DataFetcher";
import CassandraHandler from "./src/handlers/CassandraHandler";
import DailySummaryHandler from "./src/handlers/DailySummaryHandler";
import ClientAccountHandler from "./src/handlers/ClientAccountHandler";
import RoleHandler from "./src/handlers/RoleHandler";
import AccountTypeHandler from "./src/handlers/AccountTypeHandler";
import MessageHandler from "./src/handlers/MessageHandler";
import IncidentHandler from "./src/handlers/IncidentHandler";
import SparkHandler from "./src/handlers/SparkHandler";
var bodyParser = require("body-parser");

process.on("unhandledRejection", function (err) {
  console.log("UnhandledPromiseRejectionWarning", err);
});

const app = express();

//configure static files
try {
  var staticDir = require("path").join(__dirname, "src/static");
  // console.log(staticDir);

  app.use(express.static(staticDir));
} catch (e) {
  console.log(e.toString());
}
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);

//configure cors
const cors = require("cors");
const corsOptions = {
  origin: /http(s*):\/\/localhost:(8080)|(4200)/,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));

//USERS

app.post("/api/v1/login", UserHandler.login);

app.post(
  "/api/v1/users/new",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  UserHandler.create
);

app.get("/api/v1/users", AuthorizationMiddleware.authenticate, AuthorizationMiddleware.authorizeAdmin, UserHandler.get);

app.get(
  "/api/v1/users/:id/:role_id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeOwnerOrAdmin,
  UserHandler.getByID
);

app.patch(
  "/api/v1/users/:id/:role_id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeOwnerOrAdmin,
  UserHandler.updateByID
);

app.delete(
  "/api/v1/users/:id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeOwnerOrAdmin,
  UserHandler.delete
);

app.post(
  "/api/v1/users/:id/subscribe-to-pn",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeOwner,
  UserHandler.subscribeToPN
);

app.delete(
  "/api/v1/users/:id/unsubscribe-from-pn/:endpoint",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeOwner,
  UserHandler.unsubscribeFromPN
);

app.post(
  "/api/v1/users/link/user/client-accounts",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  UserHandler.linkToClientAccount
);

app.delete(
  "/api/v1/users/unlink/user/:user_id/client-account/:client_account_id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  UserHandler.unlinkFromClientAccount
);

//USERS - END

//CLIENT ACCOUNTS

app.post(
  "/api/v1/client-accounts/new",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  ClientAccountHandler.create
);

app.get(
  "/api/v1/client-accounts",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  ClientAccountHandler.get
);

app.get(
  "/api/v1/client-accounts/:id/:type_id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  ClientAccountHandler.getByID
);

app.get("/api/v1/client-accounts/get-by-user", AuthorizationMiddleware.authenticate, ClientAccountHandler.getByUser);

app.patch(
  "/api/v1/client-accounts/:id/:type_id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  // (req, res, next) => {
  //   console.log(req.params, req.params.type_id == ACCOUNT_TYPES.FITBIT);
  //   if (req.params.type_id == ACCOUNT_TYPES.FITBIT) FitbitAccountHandler.updateByID(req, res, next);
  // }
  ClientAccountHandler.updateByID
);

app.delete(
  "/api/v1/client-accounts/:id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  ClientAccountHandler.delete
);

// app.get(
//   "/api/v1/client-accounts/:id/contacts",
//   AuthorizationMiddleware.authenticate,
//   UserHandler.getContactsByClientAccount
// );

app.get(
  "/api/v1/client-accounts/latest-recorded-states",
  AuthorizationMiddleware.authenticate,
  CassandraHandler.getLatestRecordedStates
);

//CLIENT ACCOUNTS - END

//FITBIT ACCOUNTS

app.get(
  "/api/v1/fitbit-accounts/:account_id/activities/heart/intraday/:date",
  AuthorizationMiddleware.authenticate,
  CassandraHandler.fetchHeartRateDataIntraday
);

// app.patch(
//   "/api/v1/fitbit-accounts/:id",
//   AuthorizationMiddleware.authenticate,
//   AuthorizationMiddleware.authorizeAdmin,
//   ClientAccountHandler.updateByID
// );

//FITBIT ACCOUNTS - END

//ROLES

app.get("/api/v1/roles", AuthorizationMiddleware.authenticate, AuthorizationMiddleware.authorizeAdmin, RoleHandler.get);

//ROLES - END

//ACCOUNT TYPES

app.get(
  "/api/v1/account-types",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  AccountTypeHandler.get
);

//ACCOUNT TYPES - END

//DAILY SUMMARIES

app.get(
  "/api/v1/daily-summary/:client_account_id/:from/:to",
  AuthorizationMiddleware.authenticate,
  DailySummaryHandler.getByDateRange
);

//DAILY SUMMARIES - END

//INCIDENTS

app.post("/api/v1/spark/:spark_module_id/incidents/new", IncidentHandler.createIncident);
app.post("/api/v1/camera/:camera_id/incidents/new", IncidentHandler.processPicture, IncidentHandler.createIncident);
app.get("/api/v1/incidents/", AuthorizationMiddleware.authenticate, IncidentHandler.get);
app.get("/api/v1/incidents/:id", AuthorizationMiddleware.authenticate, IncidentHandler.get);
app.patch(
  "/api/v1/incidents/:id/process-incident",
  AuthorizationMiddleware.authenticate,
  IncidentHandler.processIncident
);

//INCIDENTS - END

//FITBIT DOMAIN REQUESTS

app.patch(
  "/api/v1/FITBIT/oauth2/revoke/:id",
  AuthorizationMiddleware.authenticate,
  AuthorizationMiddleware.authorizeAdmin,
  FitbitHandler.revoke
);

//FITBIT DOMAIN REQUESTS - END

//MESSAGES

// app.get(
//   "/api/v1/messages/:type/:user_id",
//   AuthorizationMiddleware.authenticate,
//   AuthorizationMiddleware.authorizeOwnerOrAdmin,
//   MessageHandler.getByUser
// );

app.patch("/api/v1/messages/:id/toggle-read", AuthorizationMiddleware.authenticate, MessageHandler.toggleRead);

// app.post(
//   "/api/v1/messages/notify-contacts/:via",
//   AuthorizationMiddleware.authenticate,
//   NotificationHandler.notifyContacts
// );

//MESSAGES - END

app.listen(3000, () => {
  console.log("app running on port ", 3000);
});

//fetch fitbit data to persist in cassandra and postgresql
DataFetcher.syncFitbits();
// SparkHandler.runJob("classify", [
//   "--model-type",
//   "lr",
//   "--model-dir",
//   "./src/analytics/spark/models/LogisticRegressionWithLBFGSModel",
//   "--client-account-id",
//   "1",
//   "--from-week",
//   "1574640000000",
//   "--to-week",
//   "1574640000000",
//   "--from-second",
//   "0",
//   "--to-second",
//   "50000",
//   "--master",
//   "local[2]",
// ]).then((response) => {
//   console.log(response);
//   console.log(JSON.parse(response));
// });

// const axios = require("axios").default;
// setInterval(() => {
//   axios({
//     method: "post",
//     url: "http://localhost:3000/sendNotification"
//     // data: body
//   })
//     .then(function(response) {
//       // console.log("axioossssssssssssssssssssssssssssssssssssss");
//     })
//     .catch(function(error) {
//       console.log(error.toString());
//     });
// }, 5000);
