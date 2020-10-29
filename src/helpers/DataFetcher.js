import moment from "moment";
import "moment-timezone";
import FitbitApiClient from "fitbit-node";
import CassandraController from "../controllers/CassandraController";
import FitbitAccountController from "../controllers/ClientAccounts/FitbitAccountController";
import DailySummaryController from "../controllers/DailySummaryController";
import { Messenger, SEVERITY, CHANNELS, SUBJECT } from "./Messenger";
import DecisionTree from "../analytics/DecisionTree";
import PushNotificationController from "../controllers/Messages/PushNotificationController";
import {
  unauthorizedToken,
  hourlyLimitReached,
  requestSepcificError,
} from "../controllers/ClientAccounts/FitbitAccountController";
import UserController from "../controllers/Users/UserController";
import { cassandraUUID } from "../config/cassandra";
import IncidentController from "../controllers/IncidentController";
import SparkHandler from "../handlers/SparkHandler";

const fitbitRateLimitResets = {};
const DataFetcher = {
  async syncFitbits() {
    try {
      const fitbitAccounts = await FitbitAccountController.find();

      for (let fitbitAccount of Object.values(fitbitAccounts)) {
        this.syncFitbitCassandra(fitbitAccount);
        this.syncFitbitPostgres(fitbitAccount);
      }
    } catch (error) {
      console.log("Error retrieving fitbit accounts from postgre", error);
    }
  },

  async syncFitbitCassandra(fitbitAccount) {
    const { fitbit_app_id, secret, access_token } = fitbitAccount;

    if (fitbit_app_id && secret && access_token) {
      const executionStart = moment();
      console.log(
        "------------------------------->Start fetchHeartRateData",
        executionStart.format("MM-DD-YYYY H:m:s")
      );
      try {
        const fitbitApiClient = new FitbitApiClient({
          clientId: fitbit_app_id,
          clientSecret: secret,
          apiVersion: "1.2",
        });

        const { encoded_id } = fitbitAccount;

        const profile = await fitbitApiClient.get("/profile.json", access_token, encoded_id);

        if (!verifyResponse(profile, fitbitAccount)) return;
        else if (!profile[0].user) {
          //unknown error
          throw Error("UNKNOWN");
        }

        // deleteData();
        // return;
        //get last inserted timestamp to continue inserting from there
        const lastState = await getLatestStateByPerson(fitbitAccount.id);

        let lastMoment = moment.utc("2018-12-31 00:00:00"); //1546214400000
        if (lastState) {
          lastMoment = moment.utc(lastState.week).add(lastState.second, "seconds");
        }

        let startMoment = lastMoment.clone().tz(profile[0].user.timezone),
          endMoment = lastMoment.clone().tz(profile[0].user.timezone);

        if (startMoment.format("HH:mm") === "00:00") endMoment.set({ hour: "00", minute: "01" });
        else endMoment.add(1, "days").set({ hour: "00", minute: "00" });

        if (endMoment.isSameOrAfter(moment.utc().tz(profile[0].user.timezone), "seconds"))
          endMoment = moment.utc().tz(profile[0].user.timezone);

        //since Fitbit API doesn't allow fetching intraday data for several days at once,
        //it is necessary to loop through the days from the last inserted in cassandra
        //until the last fetched from Fitbit
        // let aux = 2;
        while (moment.utc(startMoment).isSameOrBefore(moment.utc()) /*&& aux-- > 0*/) {
          // const floorsResponse = await getFloorsDataSet(startMoment, endMoment, fitbitAccount, fitbitApiClient);

          // console.log(floorsResponse);

          // return;
          const heartRateDataSet = await getHeartRateDataSet(startMoment, endMoment, fitbitAccount, fitbitApiClient);
          if (!heartRateDataSet) return;

          // console.log("ddddddddddddddddd", heartRateDataSet[0]);
          // console.log("ddddddddddddddddd", heartRateDataSet[heartRateDataSet.length - 1]);
          // return;
          // heartRateDataSet = [{}];

          if (heartRateDataSet.length) {
            //STEPS
            const stepsDataSet = await getStepsDataSet(startMoment, endMoment, fitbitAccount, fitbitApiClient);
            if (!stepsDataSet) return;
            //STEPS - END

            //SLEEP STATUS
            const sleepStatusDataSet = await getSleepStatusDataSet(startMoment, fitbitAccount, fitbitApiClient);
            if (!sleepStatusDataSet) return;
            //SLEEP STATUS - END

            //FLOORS
            const floorsDataSet = await getFloorsDataSet(startMoment, endMoment, fitbitAccount, fitbitApiClient);
            if (!floorsDataSet) return;
            //FLOORS - END

            //INTEGRATE DATA SETS
            const sleepSummary = sleepStatusDataSet[0].summary,
              dataSet = {};

            const sleep_status =
              sleepSummary && sleepSummary.totalTimeInBed
                ? Math.round(parseFloat(sleepSummary.totalMinutesAsleep / sleepSummary.totalTimeInBed) * 10000) / 100
                : 100;

            for (const element of heartRateDataSet) {
              const elementValue = element.value;
              if (elementValue)
                dataSet[element.time] = {
                  heart_beat: elementValue ? elementValue : 0,
                  sleep_status,
                };
            }

            let stepsCount = 0;
            for (const element of stepsDataSet) {
              const elementTime = element.time,
                elementValue = element.value;
              if (elementValue)
                if (dataSet[elementTime]) dataSet[elementTime].steps = elementValue ? elementValue : 0;
                else
                  dataSet[elementTime] = {
                    steps: elementValue ? elementValue : 0,
                    sleep_status,
                  };
              stepsCount += elementValue;
            }

            /* the 'summary' endpoint used to fetch daily data into postgres, does not return a steps value that
            corresponds to the sum of all steps returned by 'steps' endpoint, so we update the 'steps' column for daily_summary here */
            DailySummaryController.update({ steps: stepsCount }, { date: startMoment.format("YYYY-MM-DD") });

            for (const element of floorsDataSet) {
              const elementTime = element.time,
                elementValue = element.value;
              if (elementValue)
                if (dataSet[elementTime]) dataSet[elementTime].floors = elementValue ? elementValue : 0;
                else
                  dataSet[elementTime] = {
                    sleep_status,
                    floors: elementValue ? elementValue : 0,
                  };
            }

            //INTEGRATE DATA SETS - END

            // dataSet["13:21:41"] = {
            //   heart_beat: 120,
            //   sleep_status: 87,
            //   steps: 21,
            //   floors: 0,
            // };

            // dataSet["13:22:41"] = {
            //   heart_beat: 110,
            //   sleep_status: 77,
            //   steps: 210,
            //   floors: 1,
            // };

            // console.log("dataSet length", Object.keys(dataSet).length);
            if (Object.keys(dataSet).length) {
              // const dataSetAge  = dataSet;
              console.log("dataSetAge", moment.utc().diff(moment.utc(startMoment), "hours"));

              if (moment.utc().diff(moment.utc(endMoment), "hours") <= 3) {
                const fromWeek = moment.utc().subtract(3, "h").startOf("isoWeek").valueOf(),
                  fromSecond = parseInt(
                    moment
                      .duration(
                        moment.utc().subtract(3, "h").diff(moment.utc(endMoment).subtract(3, "h").startOf("isoWeek"))
                      )
                      .asSeconds()
                  ),
                  toWeek = moment.utc(endMoment).startOf("isoWeek").valueOf(),
                  toSecond = parseInt(
                    moment.duration(moment.utc(endMoment).diff(moment.utc(endMoment).startOf("isoWeek"))).asSeconds()
                  );

                // console.log(fromWeek, toWeek, fromSecond, toSecond);
                SparkHandler.classify(fitbitAccount.id, fromWeek, toWeek, fromSecond, toSecond);

                dataSet = Object.keys(dataSet).reduce((acc, elem, i) => {
                  if (i++ < 1800) acc[elem] = dataSet[elem];
                  return acc;
                }, {});

                DecisionTree.run(dataSet, profile[0]["user"])
                  .then((result) => {
                    const accidentProbability = parseFloat(result);
                    console.log("accidentProbability", accidentProbability);

                    if (accidentProbability > 0.5) {
                      let severity = SEVERITY.WARNING;
                      if (accidentProbability > 0.9) severity = SEVERITY.CRITICAL;
                      else if (accidentProbability > 0.8) severity = SEVERITY.DANGER;
                      const id = cassandraUUID.random().toString();

                      const created = moment.utc();
                      IncidentController.create({
                        id,
                        client_account_id: fitbitAccount.id,
                        created: created.toISOString(true),
                        accident: false,
                        actual_accident: false,
                        processed: false,
                      });

                      //create incident in Cassandra
                      CassandraController.upsertIncident(id, {
                        accident: false,
                        wearable_states: Object.values(dataSet).reduce((acc, elem) => {
                          acc.push({ hbpm: elem.heart_beat, ...elem });
                          return acc;
                        }, []),
                      });

                      const messageData = {
                        subject: SUBJECT.UNCONFIRMED_INCIDENT.message,
                        severity: severity,
                        // created: created, //this way pg modifies the date/time into utc when persisting
                        created: created.toISOString(true), //this way it actually persists the date we want in ISO8601
                        created_tz: created.format("Z"),
                        client_account_id: fitbitAccount.id,
                        incident: id,
                      };

                      //exclude sensitive info
                      const { encoded_id, fitbit_app_id, secret, access_token, ...rest } = fitbitAccount;

                      //create push notification in postgres
                      const pushNotification = {
                        read: false,
                      };
                      PushNotificationController.create({ ...messageData, type: 1, ...pushNotification });

                      //push notif
                      (async () => {
                        const recipients = await UserController.findPNRecipientsDataByClientAccount(
                          messageData.client_account_id
                        );

                        Messenger.sendMessage(
                          {
                            ...messageData,
                            ...pushNotification,
                            client_account: rest,
                            recipients,
                          },
                          [CHANNELS.NOTIFICATION, CHANNELS.EMAIL]
                        );
                      })();
                    }
                  })
                  .catch((e) => {
                    console.log(e.toString());
                  });
              }

              //PERSIST DATA IN CASSANDRA
              await CassandraController.persistWearableStates(
                fitbitAccount.id,
                profile[0].user.timezone,
                startMoment.format("YYYY-MM-DD"),
                // heartRateResponse[0]["activities-heart"][0].dateTime,
                dataSet
              );
            }
          }

          if (startMoment.format("HH:mm") !== "00:00") {
            startMoment.add(1, "days").set({ hour: "00", minute: "00" });
            endMoment.set({ hour: "00", minute: "01" });
          } else {
            startMoment.set({ hour: "00", minute: "01" });
            endMoment.add(1, "days").set({ hour: "00", minute: "00" });
          }
          if (endMoment.isSameOrAfter(moment.utc().tz(profile[0].user.timezone), "seconds"))
            endMoment = moment.utc().tz(profile[0].user.timezone);
        }

        const executionEnd = moment();
        console.log("------------------------------->End fetchHeartRateData", executionEnd.format("MM-DD-YYYY H:m:s"));

        const executionDuration = moment.duration(executionEnd.diff(executionStart));

        if (executionDuration.asMilliseconds() >= 600000) {
          console.log("immediate sync Fitbit-Cassandra for account " + fitbitAccount.id);
          this.syncFitbitCassandra(fitbitAccount);
        } else {
          console.log(
            "timeout: " +
              (600 - executionDuration.asSeconds()) +
              " seconds to sync Fitbit-Cassandra for account " +
              fitbitAccount.id
          );

          setTimeout(() => {
            this.syncFitbitCassandra(fitbitAccount);
          }, 600000 - executionDuration.asMilliseconds());
        }
      } catch (error /* [name, info, message, innerErrors] */) {
        const innerError = Object.values(error.innerErrors)[0];
        const hit = [innerError.code || innerError.errno || error.message, error.name].find((element) => {
          return ["ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "UNKNOWN", "ECONNREFUSED", "NoHostAvailableError"].includes(
            element
          );
        });

        console.log("error", hit);
        if (hit) {
          setTimeout(() => {
            this.syncFitbitCassandra(fitbitAccount);
          }, 5000);
        }
      }
    } else {
      console.log("there was a problem retrieving access data from this fitbit account " + fitbitAccount.id);
      unauthorizedToken(fitbitAccount);
    }
  },

  async syncFitbitPostgres(fitbitAccount) {
    const { fitbit_app_id, secret, access_token } = fitbitAccount;

    if (fitbit_app_id && secret && access_token) {
      try {
        const fitbitApiClient = new FitbitApiClient({
          clientId: fitbit_app_id,
          clientSecret: secret,
          apiVersion: "1.2",
        });

        const { encoded_id } = fitbitAccount;

        const profile = await fitbitApiClient.get("/profile.json", access_token, encoded_id);

        if (!verifyResponse(profile, fitbitAccount)) return;
        else if (!profile[0]["user"]) {
          //unknown error
          throw Error("UNKNOWN");
        }

        //get last inserted summary to continue inserting from there
        const lastSummary = await DailySummaryController.getLatestByClientAccount(fitbitAccount.id);

        let lastMoment;

        let updateFirst = false;
        if (lastSummary) {
          lastMoment = moment(lastSummary.date).tz(profile[0].user.timezone, true);

          updateFirst = true;
        } else {
          lastMoment = moment(`2018-12-31T00:00:00`).tz(profile[0].user.timezone, true);
        }

        // let aux = 500;
        while (
          moment.utc(lastMoment).isSameOrBefore(moment.utc().tz(profile[0].user.timezone), "day") /*&& aux-- > 0*/
        ) {
          let summaryEP = `/activities/date/${lastMoment.format("YYYY-MM-DD")}.json`;
          console.log(summaryEP);
          let summary = await fitbitApiClient.get(summaryEP, access_token, encoded_id);

          if (!verifyResponse(summary, fitbitAccount)) return;
          else {
            summary = summary[0].summary;
            if (!summary) {
              //unknown error
              throw Error("UNKNOWN");
            }
          }

          const heartRateZones = summary.heartRateZones;
          const values = heartRateZones.reduce((acc, element, index) => {
            acc[`hrz_${index + 1}_calories`] = element.caloriesOut;
            acc[`hrz_${index + 1}_minutes`] = element.minutes;
            return acc;
          }, {});

          // values.steps = summary.steps;
          values.date = `${lastMoment.format("YYYY-MM-DD")}`;
          values.tz = `${lastMoment.format("Z")}`;
          if (updateFirst) {
            DailySummaryController.update(values, { date: values.date });
            updateFirst = false;
          } else {
            values.client_account_id = fitbitAccount.id;
            DailySummaryController.insert(values);
          }

          lastMoment.add(1, "days");
        }
      } catch (error /* [name, info, message, innerErrors] */) {
        const innerError = Object.values(error.innerErrors)[0];
        const hit = [error.code, error.errno, innerError.code || innerError.errno || error.message, error.name].find(
          (element) => {
            return ["ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "UNKNOWN", "ECONNREFUSED", "NoHostAvailableError"].includes(
              element
            );
          }
        );

        console.log("error", hit);
        if (hit) {
          setTimeout(() => {
            this.syncFitbitCassandra(fitbitAccount);
          }, 5000);
        }
      }
      // catch (error) {
      //   const hit = [error.code || error.errno || error.message].find((element) => {
      //     return ["ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "UNKNOWN", "ECONNREFUSED"].includes(element);
      //   });

      //   if (hit) {
      //     console.log(hit);
      //     setTimeout(() => {
      //       this.syncFitbitPostgres(fitbitAccount);
      //     }, 5000);
      //     console.log("newwwwwwwwwwwwwwwwwwwwwwwwww", error, error.errno);
      //   }
      // }
    }

    console.log("timeout: 10 minutes to sync Fitbit-Postgres for account " + fitbitAccount.id);

    setTimeout(() => {
      this.syncFitbitPostgres(fitbitAccount);
    }, 600000 /*10 minutes*/);
  },
};

const getLatestStateByPerson = async (personID) => {
  try {
    let weekMoment = moment
        .parseZone() //create moment with client's time, date and zone
        .startOf("isoWeek") //get start of client's week
        .utcOffset(0) //move moment to utc (time also changes, hence next step)
        .set({ hour: 0, minute: 0, second: 0 }), //set time to midnight (actual start of week on utc)
      loopBreaker = 1000,
      result;

    do {
      result = await CassandraController.getLatestStateByPersonNWeek(personID, weekMoment);
      weekMoment.subtract(1, "w");
    } while (!result.rowLength && loopBreaker--);

    //if no results found
    if (loopBreaker === -1) return null;

    //add the 7 days that were subtracted in the last loop and also the 'second' field of the table
    //obtaining the actual timestamp at which the last record was inserted
    weekMoment.add({ days: 7, seconds: result.rows[0].second });

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

const getHeartRateDataSet = async (startMoment, endMoment, fitbitAccount, fitbitApiClient) => {
  const heartRateEP = `/activities/heart/date/${startMoment.format("YYYY-MM-DD")}/${endMoment.format(
    "YYYY-MM-DD"
  )}/1sec/time/${startMoment.format("HH:mm")}/${endMoment.format("HH:mm")}.json`;
  // heartRateEP = `/activities/heart/date/2020-04-30/2020-05-01/1sec/time/00:01/00:00.json`;

  console.log(heartRateEP);

  //fetch heart rate
  const heartRateResponse = await fitbitApiClient.get(
    heartRateEP,
    fitbitAccount.access_token,
    fitbitAccount.encoded_id
  );

  if (verifyResponse(heartRateResponse, fitbitAccount)) {
    const heartRateIntraday = heartRateResponse[0]["activities-heart-intraday"];
    if (heartRateIntraday) {
      const heartRateIntradayDataSet = heartRateIntraday.dataset;
      if (heartRateIntradayDataSet && heartRateIntradayDataSet.length) return heartRateIntradayDataSet;
    }
    return [];
  }
};

const getStepsDataSet = async (startMoment, endMoment, fitbitAccount, fitbitApiClient) => {
  const stepsEP = `/activities/steps/date/${startMoment.format("YYYY-MM-DD")}/${endMoment.format(
    "YYYY-MM-DD"
  )}/1min/time/${startMoment.format("HH:mm")}/${endMoment.format("HH:mm")}.json`;

  console.log(stepsEP);

  const stepsResponse = await fitbitApiClient.get(stepsEP, fitbitAccount.access_token, fitbitAccount.encoded_id);

  if (verifyResponse(stepsResponse, fitbitAccount)) {
    const stepsIntraday = stepsResponse[0]["activities-steps-intraday"];
    if (stepsIntraday) {
      const stepsIntradayDataSet = stepsIntraday.dataset;
      if (stepsIntradayDataSet && stepsIntradayDataSet.length) return stepsIntradayDataSet;
    }
    return [];
  }
};

const getFloorsDataSet = async (startMoment, endMoment, fitbitAccount, fitbitApiClient) => {
  const floorsEP = `/activities/floors/date/${startMoment.format("YYYY-MM-DD")}/${endMoment.format(
    "YYYY-MM-DD"
  )}/1min/time/${startMoment.format("HH:mm")}/${endMoment.format("HH:mm")}.json`;
  // let floorsEP = `/activities/floors/date/2019-10-10/2019-10-11/1min/time/00:01/00:00.json`;
  // heartRateEP = `/activities/heart/date/2020-04-30/2020-05-01/1sec/time/00:01/00:00.json`;

  console.log(floorsEP);

  const floorsResponse = await fitbitApiClient.get(floorsEP, fitbitAccount.access_token, fitbitAccount.encoded_id);

  if (verifyResponse(floorsResponse, fitbitAccount)) {
    const floorsIntraday = floorsResponse[0]["activities-floors-intraday"];
    if (floorsIntraday) {
      const floorsIntradayDataSet = floorsIntraday.dataset;
      if (floorsIntradayDataSet && floorsIntradayDataSet.length) return floorsIntradayDataSet;
    }
    return [];
  }
};

const getSleepStatusDataSet = async (startMoment, fitbitAccount, fitbitApiClient) => {
  const sleepStatusEP = `/sleep/date/${startMoment.format("YYYY-MM-DD")}.json`;
  console.log(sleepStatusEP);

  const sleepStatusResponse = await fitbitApiClient.get(
    sleepStatusEP,
    fitbitAccount.access_token,
    fitbitAccount.encoded_id
  );

  if (verifyResponse(sleepStatusResponse, fitbitAccount)) return sleepStatusResponse;
};

const verifyResponse = (response, fitbitAccount) => {
  let ok = true;

  if (response[1].statusCode === 401) {
    //unauthorized
    unauthorizedToken(fitbitAccount);
    ok = false;
  } else if (response[1].statusCode === 429) {
    //API hourly limit reached
    hourlyLimitReached(fitbitAccount, response[1].headers["fitbit-rate-limit-reset"], fitbitRateLimitResets);
    ok = false;
  } else if (response[0].errors) {
    requestSepcificError(fitbitAccount, response[0].errors[0]);
    ok = false;
  } else if (!response[0]) {
    //unknown error
    throw Error("UNKNOWN");
  }

  return ok;
};

import { cassandraClient } from "../config/cassandra";

// const deleteData = async () => {
//   try {
//     await cassandraClient.execute(
//       `delete from wearable_states_by_person_by_week WHERE person_id=1 AND week='2020-04-27Z' AND second>=86400`,
//       {
//         prepare: true,
//       }
//     );
//   } catch (error) {
//     throw error;
//   }
// };

export default DataFetcher;
