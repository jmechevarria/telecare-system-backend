const spawn = require("child_process").spawn;

//spark-class.cmd org.apache.spark.deploy.master.Master
//spark-class.cmd org.apache.spark.deploy.worker.Worker -c 2 spark://192.168.0.3:7077
//spark-submit.cmd .\SentinelSparkModule-1.0-SNAPSHOT-all.jar --deploy-mode standalone
const SparkHandler = {
  async runJob(command, options) {
    try {
      const spawnProcess = spawn(
        "spark-submit.cmd",
        ["./src/analytics/spark/SentinelSparkModule-1.0-SNAPSHOT.jar", command, ...options]
        // {
        // stdio: "ignore",
        // }
      );
      spawnProcess.stdout
        .on("data", (data) => {
          console.log(data.toString());
          console.log("success");
        })
        .on("error", (error) => {
          console.log("stdout on error", error);
        })
        .on("end", () => {
          console.log("stdout on end");
        });
    } catch (error) {
      console.log(error.toString());
    }
  },

  async classify(clientAccountID, fromWeek, toWeek, fromSecond, toSecond) {
    this.runJob("classify", [
      "--model-type",
      "lr",
      "--model-dir",
      "./src/analytics/spark/models/LogisticRegressionWithLBFGSModel",
      "--client-account-id",
      clientAccountID,
      "--from-week",
      fromWeek,
      "--to-week",
      toWeek,
      "--from-second",
      fromSecond,
      "--to-second",
      toSecond,
      "--master",
      "spark://192.168.0.3:7077",
    ]);
  },
};

export default SparkHandler;
