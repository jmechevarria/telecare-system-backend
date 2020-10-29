import cassandra from "cassandra-driver";

export const cassandraClient = new cassandra.Client({
  contactPoints: ["127.0.0.1:9042"],
  localDataCenter: "datacenter1",
  keyspace: "masters",
});

export const cassandraUUID = cassandra.types.Uuid;

cassandraClient.connect(function (err) {
  if (err) return console.error(err);
  console.log("Connected to cluster with %d host(s): %j", cassandraClient.hosts.length, cassandraClient.hosts.keys());
});
