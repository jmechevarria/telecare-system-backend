import FitbitAccountController from "../controllers/ClientAccounts/FitbitAccountController";
import { RESPONSES } from "../helpers/Constants";
const FitbitApiClient = require("fitbit-node");

const FitbitHandler = {
  async revoke(req, res, next) {
    const id = req.params.id;
    const fitbitAccount = (await FitbitAccountController.find(id))[0];

    if (!fitbitAccount) throw Error(`Fitbit account with ID: ${id}, not found`);

    try {
      const { fitbit_app_id, secret, access_token } = fitbitAccount;

      //only if an access_token is found, we request fitbit to revoke it
      if (access_token) {
        const fitbitApiClient = new FitbitApiClient({
          clientId: fitbit_app_id,
          clientSecret: secret,
          apiVersion: "1.2",
        });

        await fitbitApiClient.revokeAccessToken(access_token);

        await FitbitAccountController.update({ encoded_id: null, access_token: null }, id);

        return res.status(200).send(fitbitAccount);
      }
    } catch (error) {
      console.log(error.toString());

      if (error.status === 429) {
        console.log("API hourly limit reached");
        // hourlyLimitReached(response[1].headers["fitbit-rate-limit-reset"]);
        // return;
      } else {
        return res.status(500).send(RESPONSES.GENERIC_500);
      }
    }
  },
};

// const invalidToken = fitbitAccount => {
//   Messenger.sendMessage(
//     SUBJECTS.UNAUTHORIZED_TOKEN,
//     {
//       firstname: fitbitAccount.firstname,
//       lastname: fitbitAccount.lastname,
//       lastname2: fitbitAccount.lastname2
//     },
//     LEVELS.CRITICAL,
//     [CHANNELS.NOTIFICATION],
//     findCaregiverForThisAccount()
//   );
// };
export default FitbitHandler;
