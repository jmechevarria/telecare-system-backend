import moment from "moment";
const spawn = require("child_process").spawn;

const DecisionTree = {
  runHRDT(hr, sex, age) {
    if (sex === "MALE") {
      if (age >= 50 && age <= 65) {
        if (hr <= 79) return "Low";
        else if (hr >= 90 && hr <= 95) return "High";
        else if (hr >= 96) return "Too high";
      } else if (age > 65)
        if (hr <= 64) return "Low";
        else if (hr >= 80 && hr <= 89) return "High";
        else if (hr >= 90) return "Too high";
    } else if (age >= 50 && age <= 65) {
      if (hr <= 74) return "Low";
      else if (hr >= 85 && hr <= 90) return "High";
      else if (hr >= 91) return "Too high";
    } else if (age > 65)
      if (hr <= 59) return "Low";
      else if (hr >= 75 && hr <= 84) return "High";
      else if (hr >= 85) return "Too high";

    return "Normal";
  },

  run(dataSet, userProfile) {
    return new Promise((resolve, reject) => {
      let gender = userProfile.gender,
        weight = userProfile.weight,
        age = moment().diff(userProfile.dateOfBirth, "years"),
        dataSetValues = Object.values(dataSet),
        dataSetKeys = Object.keys(dataSet),
        nextHRCategory = this.runHRDT(dataSetValues[0].heart_beat, gender, age),
        nextMoment = moment.utc(dataSetKeys[0], "HH:mm:ss"),
        secondsWithCurrentHR = 0,
        samples = [];

      for (const time of dataSetKeys) {
        const currentHRCategory = nextHRCategory,
          currentMoment = nextMoment;

        nextHRCategory = this.runHRDT(dataSet[time].heart_beat, gender, age);
        nextMoment = moment.utc(time, "HH:mm:ss");

        const duration = moment.duration(nextMoment.diff(currentMoment)).asSeconds();
        secondsWithCurrentHR += duration;

        if (currentHRCategory !== nextHRCategory) {
          //add sample
          samples.push([currentHRCategory, secondsWithCurrentHR, dataSet[time].sleep_status, weight, age]);
          //reset duration
          secondsWithCurrentHR = 0;
        }
      }

      if (secondsWithCurrentHR !== 0)
        samples.push([
          nextHRCategory,
          secondsWithCurrentHR,
          dataSetValues[dataSetValues.length - 1].sleep_status,
          weight,
          age,
        ]);

      if (samples.length) {
        try {
          // console.log("samples for dec tree in python", samples);

          const pythonProcess = spawn("python3.7", ["src/analytics/main.py", "predict", samples, "physio_features"]);

          pythonProcess.stdout
            .on("data", (data) => {
              resolve(data.toString());
            })
            .on("error", () => {
              console.log("error");
            })
            .on("end", () => {
              console.log("end");
            });

          pythonProcess.stderr
            .on("data", (data) => {
              console.log("error in python module", data.toString());
            })
            .on("error", () => {
              console.log("stderr end");
            });
        } catch (error) {
          console.log(error.toString());
        }
      }
    });
  },
};

const getSample = (data) => {};
export default DecisionTree;
