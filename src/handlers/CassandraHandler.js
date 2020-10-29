import CassandraController from "../controllers/CassandraController";
import moment from "moment";
import { RESPONSES } from "../helpers/Constants";
import ClientAccountController from "../controllers/ClientAccounts/ClientAccountController";
import DailySummaryController from "../controllers/DailySummaryController";

const CassandraHandler = {
  async fetchHeartRateDataIntraday(req, res) {
    try {
      const { account_id, date } = req.params;

      let result = await CassandraController.getHeartRateDataIntraday(account_id, date);

      result = result
        .map((row) => {
          return { second: row.second, heart_beat: row.heart_beat, steps: row.steps };
        })
        .reverse(/*to send data in ascending chronological order*/);

      return res.status(200).send({ data: result });
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async getLatestRecordedStates(req, res) {
    try {
      const requestedClientAccountsIDs = req.query.clientAccountsIDs.split(",");
      const clientMomentString = req.query.clientMomentString;

      if (!clientMomentString) return res.status(400).send(RESPONSES.MISSING_PARAMETERS);

      if (!requestedClientAccountsIDs[0].length) return res.status(200).send();

      //check if the requested client accounts are linked to the requesting user
      const clientAccountsIDs = (await ClientAccountController.findByUser(req.user.id)).map(
        (clientAccount) => clientAccount.id
      );

      if (
        !requestedClientAccountsIDs.every((requestedClientAccountsID) => {
          return clientAccountsIDs.includes(parseInt(requestedClientAccountsID));
        })
      )
        return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);

      let weekMoment = moment
          .parseZone(clientMomentString) //create moment with client's time, date and zone
          .startOf("isoWeek") //get start of client's week
          .utcOffset(0) //move moment to utc (time also changes, hence next step)
          .set({ hour: 0, minute: 0, second: 0 }), //set time to midnight (actual start of week on utc)
        states = [];
      console.log(requestedClientAccountsIDs);

      for (const personID of requestedClientAccountsIDs) {
        let state,
          weekCount = 50;
        while (!state && weekCount--) {
          state = (await CassandraController.getLatestStateByPersonNWeek(personID, weekMoment)).rows[0];
          weekMoment.subtract(1, "w");
        }

        if (state) {
          //since each state in cassandra doesn't show all the steps during the day,
          //we need to look for steps in postgres dailySummary table
          // state.steps = (await DailySummaryController.getLatestByClientAccount(personID)).steps;
          const day = moment(state.week).add(state.second, "s").format("YYYY-MM-DD");
          const latestSummary = (await DailySummaryController.getByDateRange(personID, day, day))[0];
          if (latestSummary) state.steps = latestSummary.steps;
          else state.steps = 0;

          states.push(state);
        }
      }

      console.log("states", states);

      return res.status(200).send(states);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

export default CassandraHandler;
