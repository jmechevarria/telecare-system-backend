import { cassandraClient } from "../config/cassandra";
import moment from "moment";
import "moment-timezone";

const CassandraController = {
  async getHeartRateDataIntraday(clientAccountID, date) {
    try {
      const startMoment = moment.utc(date); //date comes with the client's offset, we convert it to utc
      const startWeek = startMoment.clone().startOf("isoWeek"); //get start of week for 'start moment'
      const endMoment = startMoment.clone().add(86399, "s"); //get 'end moment'
      const endWeek = endMoment.clone().startOf("isoWeek"); //get start of week for 'end moment'

      const fromSecond = moment.duration(startMoment.diff(startWeek)).asSeconds(),
        toSecond = moment.duration(endMoment.diff(endWeek)).asSeconds();

      if (endWeek.isSame(startWeek))
        return (
          await cassandraClient.execute(
            `SELECT * FROM wearable_states_by_person_by_week WHERE person_id=? AND week=? AND second>=? AND second<=?;`,
            [clientAccountID, startWeek.format(), fromSecond, toSecond],
            { fetchSize: 86400, prepare: true }
          )
        ).rows;
      //if start and end moments are in different weeks
      //(client is behind utc and is requesting data for a sunday, or client is ahead of utc and is requesting data for a monday)
      //it's necessary to retrieve each chunk of week individually because each week in cassandra is stored in a different partition
      else {
        const startWeekData = (
          await cassandraClient.execute(
            `SELECT * FROM wearable_states_by_person_by_week WHERE person_id=? AND week=? AND second>=? AND second<=?;`,
            [clientAccountID, startWeek.format(), fromSecond, 604799 /* seconds in a week, minus 1 */],
            { fetchSize: 604799 - fromSecond, prepare: true }
          )
        ).rows;

        const endWeekData = (
          await cassandraClient.execute(
            `SELECT * FROM wearable_states_by_person_by_week WHERE person_id=? AND week=? AND second>=? AND second<=?;`,
            [clientAccountID, endWeek.format(), 0, toSecond],
            { fetchSize: toSecond, prepare: true }
          )
        ).rows;

        //since data is returned in descending chronological order, endWeekData is placed before startWeekData to maintain said order between weeks

        //since what we're sending are pairs in the form [seconds_elapsed_from_week_start => heart_beat_value],
        //we need to add a week's worth of seconds to the week which has the Sunday
        if (moment(date).utcOffset() > 0)
          return [
            ...endWeekData,
            ...startWeekData.map((row) => {
              row.second += 604800;
              return row;
            }),
          ];
        else
          return [
            ...endWeekData.map((row) => {
              row.second += 604800;
              return row;
            }),
            ...startWeekData,
          ];
      }
    } catch (error) {
      throw error;
    }
  },

  async persistWearableStates(personID, clientAccountTimeZone, date, dataSet) {
    try {
      const dataSetKeys = Object.keys(dataSet);
      for (const time of dataSetKeys) {
        const dataMoment = moment.tz(`${date}T${time}`, moment.ISO_8601, clientAccountTimeZone).utc();

        //store the utc time at which the local week starts
        const weekMoment = dataMoment.clone().startOf("isoWeek");
        const second = dataMoment.diff(weekMoment, "seconds");
        const elementValues = Object.values(dataSet[time]);

        await cassandraClient.execute(
          `UPDATE wearable_states_by_person_by_week
                      SET ${Object.keys(dataSet[time])
                        .map((key) => `${key}=?`)
                        .join(",")}, week_offset=?
                      WHERE person_id=? and week=? and second=?;`,
          elementValues.concat([clientAccountTimeZone, personID, weekMoment.valueOf(), second]),
          {
            prepare: true,
          }
        );
      }
    } catch (error) {
      throw error;
    }
  },

  async upsertIncident(id, regularColumns /*accident, states */) {
    try {
      await cassandraClient.execute(
        `UPDATE incidents_by_person
          SET ${Object.keys(regularColumns)
            .map((k) => `${k}=?`)
            .join(",")}
          WHERE id=?;`,
        [...Object.values(regularColumns), id],
        {
          prepare: true,
        }
      );
      return (
        await cassandraClient.execute(`SELECT * FROM incidents_by_person WHERE id=?;`, [id], {
          prepare: true,
        })
      ).rows[0];
    } catch (error) {
      throw error;
    }
  },

  async getIncidents(ids) {
    try {
      return (
        await cassandraClient.execute(`SELECT * FROM incidents_by_person WHERE id IN ?;`, [ids], {
          prepare: false,
        })
      ).rows;
    } catch (error) {
      throw error;
    }
  },

  async getLatestStateByPersonNWeek(personID, week) {
    try {
      return await cassandraClient.execute(
        `SELECT * from wearable_states_by_person_by_week WHERE person_id=? and week=? LIMIT 1`,
        [personID, week.valueOf()],
        {
          prepare: true,
        }
      );
    } catch (error) {
      throw error;
    }
  },
};

export default CassandraController;
