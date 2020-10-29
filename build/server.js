"use strict";

var _express = _interopRequireDefault(require("express"));

require("@babel/polyfill");

var _AuthenticationMiddleware = _interopRequireDefault(require("./src/middleware/Security/AuthenticationMiddleware"));

var _AdministrationMiddleware = _interopRequireDefault(require("./src/middleware/Security/AdministrationMiddleware"));

var _FitbitAccountHandler = _interopRequireDefault(require("./src/handlers/FitbitAccountHandler"));

var _UserHandler = _interopRequireDefault(require("./src/handlers/UserHandler"));

var _FitbitHandler = _interopRequireDefault(require("./src/handlers/FitbitHandler"));

var _DataFetcher = _interopRequireDefault(require("./src/helpers/DataFetcher"));

var _CassandraHandler = _interopRequireDefault(require("./src/handlers/CassandraHandler"));

var _DailySummaryHandler = _interopRequireDefault(require("./src/handlers/DailySummaryHandler"));

var _SubscriptionHandler = _interopRequireDefault(require("./src/handlers/SubscriptionHandler"));

var _NotificationHandler = _interopRequireDefault(require("./src/handlers/NotificationHandler"));

var _ClientAccountHandler = _interopRequireDefault(require("./src/handlers/ClientAccountHandler"));

var _RoleHandler = _interopRequireDefault(require("./src/handlers/RoleHandler"));

var _AccountTypeHandler = _interopRequireDefault(require("./src/handlers/AccountTypeHandler"));

var _MessageHandler = _interopRequireDefault(require("./src/handlers/MessageHandler"));

function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : { default: obj };
}

process.on("unhandledRejection", function (err) {
  console.log("UnhandledPromiseRejectionWarning", err);
});
var app = (0, _express["default"])(); //configure static files

try {
  var staticDir = require("path").join(__dirname, "/src/static");

  app.use(_express["default"]["static"](staticDir));
} catch (e) {
  console.log(e.toString());
}

app.use(_express["default"].json()); //configure cors

var cors = require("cors");

var corsOptions = {
  origin: /http(s*):\/\/localhost:(8080)|(4200)/,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions)); //USERS

app.post("/api/v1/login", _UserHandler["default"].login);
app.post(
  "/api/v1/users/new",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].create
);
app.get(
  "/api/v1/users",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].get
);
app.get(
  "/api/v1/users/:id/:role_id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].getByID
);
app.patch(
  "/api/v1/users/:id/:role_id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].updateByID
);
app["delete"](
  "/api/v1/users/:id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"]["delete"]
);
app.post(
  "/api/v1/users/:id/subscribe-to-pn",
  _AuthenticationMiddleware["default"].verifyToken,
  _UserHandler["default"].subscribeToPN
);
app["delete"](
  "/api/v1/users/:id/unsubscribe-from-pn/:endpoint",
  _AuthenticationMiddleware["default"].verifyToken,
  _UserHandler["default"].unsubscribe
);
app.post(
  "/api/v1/users/link/user/client-account",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].linkToClientAccount
);
app["delete"](
  "/api/v1/users/unlink/user/:user_id/client-account/:client_account_id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _UserHandler["default"].unlinkFromClientAccount
); //USERS - END
//CLIENT ACCOUNTS

app.post(
  "/api/v1/client-accounts/new",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _ClientAccountHandler["default"].create
);
app.get(
  "/api/v1/client-accounts",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _ClientAccountHandler["default"].get
);
app.get(
  "/api/v1/client-accounts/:id/:type_id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _ClientAccountHandler["default"].getByID
);
app.patch(
  "/api/v1/client-accounts/:id/:type_id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _ClientAccountHandler["default"].updateByID
);
app["delete"](
  "/api/v1/client-accounts/:id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _ClientAccountHandler["default"]["delete"]
);
app.get(
  "/api/v1/client-accounts/:id/contacts",
  [_AuthenticationMiddleware["default"].verifyToken],
  _UserHandler["default"].getContactsByClientAccount
);
app.get(
  "/api/v1/client-accounts/latest-recorded-states",
  [_AuthenticationMiddleware["default"].verifyToken],
  _CassandraHandler["default"].getLatestRecordedStates
); //CLIENT ACCOUNTS - END
//FITBIT ACCOUNTS

app.get(
  "/api/v1/fitbit-accounts/:account_id/activities/heart/intraday/:day",
  [_AuthenticationMiddleware["default"].verifyToken],
  _CassandraHandler["default"].fetchHeartRateDataIntraday
);
app.patch(
  "/api/v1/fitbit-accounts/:id",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _FitbitAccountHandler["default"].updateByID
); //FITBIT ACCOUNTS - END
//ROLES

app.get(
  "/api/v1/roles",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _RoleHandler["default"].get
); //ROLES - END
//ACCOUNT TYPES

app.get(
  "/api/v1/account-types",
  [_AuthenticationMiddleware["default"].verifyToken, _AdministrationMiddleware["default"].verifyToken],
  _AccountTypeHandler["default"].get
); //ACCOUNT TYPES - END
//DAILY SUMMARIES

app.get(
  "/api/v1/daily-summary/:client_account_id/:from/:to",
  [_AuthenticationMiddleware["default"].verifyToken],
  _DailySummaryHandler["default"].getByDateRange
); //DAILY SUMMARIES - END
//INCIDENTS

app.get(
  "/api/v1/incidents/:account_id",
  [_AuthenticationMiddleware["default"].verifyToken],
  _CassandraHandler["default"].fetchIncidents
); //INCIDENTS - END
//FITBIT DOMAIN REQUESTS

app.patch(
  "/api/v1/FITBIT/oauth2/revoke/:id",
  _AuthenticationMiddleware["default"].verifyToken,
  _AdministrationMiddleware["default"].verifyToken,
  _FitbitHandler["default"].revoke
); //FITBIT DOMAIN REQUESTS - END
//MESSAGES

app.get("/api/v1/messages/:type/:id", _MessageHandler["default"].getByUser);
app.patch(
  "/api/v1/messages/:id/:type",
  [_AuthenticationMiddleware["default"].verifyToken],
  _MessageHandler["default"].updateByID
);
app.post(
  "/api/v1/messages/notify-contacts/:via",
  [_AuthenticationMiddleware["default"].verifyToken],
  _NotificationHandler["default"].notifyContacts
); //MESSAGES - END

app.listen(3000, function () {
  console.log("app running on port ", 3000);
}); //fetch fitbit data to persist in cassandra and postgresql

_DataFetcher["default"].syncFitbits(); // const axios = require("axios").default;
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
