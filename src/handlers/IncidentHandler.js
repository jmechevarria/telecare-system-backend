import { cassandraUUID } from "../config/cassandra";
import moment from "moment";
import IncidentController from "../controllers/IncidentController";
import CassandraController from "../controllers/CassandraController";
import { RESPONSES } from "../helpers/Constants";
import path from "path";
import fs from "fs";
import ClientAccountController from "../controllers/ClientAccounts/ClientAccountController";
import { SUBJECT, SEVERITY, Messenger, CHANNELS } from "../helpers/Messenger";
import PushNotificationController from "../controllers/Messages/PushNotificationController";
import UserController from "../controllers/Users/UserController";
import CameraController from "../controllers/CameraController";
import multer from "multer";

const IncidentHandler = {
  async get(req, res) {
    try {
      const query = req.query;
      const { id } = req.params;
      let incidents;
      if (id) {
        incidents = await IncidentController.find(id);
      } else incidents = await IncidentController.filter(query);

      const clientAccountIDs = (await ClientAccountController.findByUser(req.user.id)).map(
        (clientAccount) => clientAccount.id
      );

      for (const incident of incidents) {
        //check if the requesting user has access to the incidents
        if (!clientAccountIDs.includes(incident.client_account_id))
          return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);

        if (incident.file_name) {
          const picturePath = findIncidentPicturePath(incident);
          const fileData = base64Encode(picturePath);

          if (fileData)
            incident.picture = {
              name: incident.file_name,
              data: fileData,
            };
        }
      }

      if (id) {
        const auxIncident = (await CassandraController.getIncidents([id]))[0];

        if (auxIncident) incidents[0].wearable_states = auxIncident.wearable_states;
        return res.status(200).send(incidents[0]);
      }

      return res.status(200).send(incidents);
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async processPicture(req, res, next) {
    req.camera = await CameraController.find(req.params.camera_id);
    try {
      if (req.camera) {
        const destination = path.resolve(__dirname, "../static", process.env.CLIENT_ACCOUNTS_DIR);

        const upload = multer({
          storage: multer.diskStorage({
            destination,
            filename: function (req, file, cb) {
              try {
                const category = req.query.accident === "True" ? "accidents" : "incidents",
                  newName = file.originalname.replace(/^(.*)(?=\.)/, `${req.query.id}`);

                const dir = path.resolve(destination, category, req.camera.client_account_id.toString());

                if (!fs.existsSync(dir)) {
                  fs.mkdirSync(dir, { recursive: true });
                }

                req.fileName = newName;
                cb(null, `${category}/${req.camera.client_account_id}/${newName}`);
              } catch (error) {
                console.log(error.toString());
              }
            },
          }),
        });

        return upload.single("file", 1)(req, res, next);
      }
    } catch (error) {
      console.log(error.toString());
      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },

  async createIncident(req, res) {
    // console.log(req.query, req.params, req.body, req.file, req.files);

    const camera = req.camera;

    if (camera) {
      try {
        const { id, accident } = req.query,
          client_account_id = camera.client_account_id;

        const created = moment.utc();

        const messageData = {
          subject: accident ? SUBJECT.UNCONFIRMED_ACCIDENT.message : SUBJECT.UNCONFIRMED_INCIDENT.message,
          severity: accident ? SEVERITY.DANGER : SEVERITY.WARNING,
          // created: created, //this way pg modifies the date/time into utc when persisting
          created: created.toISOString(true), //this way it actually persists the date we want in ISO8601
          created_tz: created.format("Z"),
          client_account_id,
          incident: id,
        };

        const pushNotification = {
          read: false,
        };

        PushNotificationController.create({ ...messageData, type: 1, ...pushNotification });

        Promise.all([
          ClientAccountController.find(client_account_id),
          UserController.findPNRecipientsDataByClientAccount(messageData.client_account_id),
        ]).then(([clientAccounts, recipients]) => {
          //push notif
          Messenger.sendMessage(
            {
              ...messageData,
              ...pushNotification,
              client_account: clientAccounts[0],
              recipients,
            },
            [CHANNELS.NOTIFICATION]
          );
        });

        IncidentController.create({
          id,
          client_account_id,
          created: created.toISOString(true),
          accident,
          actual_accident: false,
          processed: false,
          file_name: req.fileName,
        });

        return res.status(200).send();
      } catch (error) {
        console.log(error.toString());
        return res.status(500).send(RESPONSES.GENERIC_500);
      }
    } else if (req.params.spark_module_id === "2c42a75e-bbd1-431d-9496-66d705dac638") {
      try {
        // const { wearable_states, client_account_id } = req.body,

        const { incident_id, client_account_id } = req.body,
          id = incident_id,
          // id = cassandraUUID.random().toString(),
          created = moment.utc();

        const messageData = {
          subject: SUBJECT.UNCONFIRMED_INCIDENT.message,
          severity: SEVERITY.WARNING,
          // created: created, //this way pg modifies the date/time into utc when persisting
          created: created.toISOString(true), //this way it actually persists the date we want in ISO8601
          created_tz: created.format("Z"),
          client_account_id,
          incident: id,
        };
        const pushNotification = {
          read: false,
        };

        PushNotificationController.create({ ...messageData, type: 1, ...pushNotification });

        Promise.all([
          ClientAccountController.find(client_account_id),
          UserController.findPNRecipientsDataByClientAccount(messageData.client_account_id),
        ]).then(([clientAccounts, recipients]) => {
          //push notif
          console.log("PUSHHHHHHHHHHHHHHHHHHHHHHHHHHHHHH", clientAccounts, recipients);

          Messenger.sendMessage(
            {
              ...messageData,
              ...pushNotification,
              client_account: clientAccounts[0],
              recipients,
            },
            [CHANNELS.NOTIFICATION]
          );
        });

        IncidentController.create({
          id,
          client_account_id,
          created: created.toISOString(true),
          accident: false,
          actual_accident: false,
          processed: false,
          file_name: req.fileName,
        });

        // console.log(wearable_states);
        // return;
        // CassandraController.upsertIncident(id, {
        //   accident: false,
        //   wearable_states,
        // });

        return res.status(200).send();
      } catch (e) {
        console.log(error.toString());
        return res.status(500).send(RESPONSES.GENERIC_500);
      }
    } //else fail silently
  },

  async processIncident(req, res) {
    try {
      const id = req.params.id;
      const incident = (await IncidentController.find(id))[0];
      const clientAccountIDs = (await ClientAccountController.findByUser(req.user.id)).map(
        (clientAccount) => clientAccount.id
      );

      if (!clientAccountIDs.includes(incident.client_account_id))
        return res.status(401).send(RESPONSES.INSUFFICIENT_PRIVILEGES);

      console.log("sssssssssssssssssssssssssss", { processed: true, actual_accident: req.body.actual_accident }, id);
      console.log("sssssssssssssssssssssssssss", id, { accident: req.body.actual_accident });

      await IncidentController.update({ processed: true, actual_accident: req.body.actual_accident }, id);
      await CassandraController.upsertIncident(id, { accident: req.body.actual_accident });

      return res.status(200).send(req.body.actual_accident);
    } catch (error) {
      console.log(error.toString(), error.code);

      return res.status(500).send(RESPONSES.GENERIC_500);
    }
  },
};

const findIncidentPicturePath = (incident) => {
  const join = path.join(
    path.resolve(__dirname, "../static"),
    process.env.CLIENT_ACCOUNTS_DIR,
    incident.accident ? "accidents" : "incidents",
    incident.client_account_id.toString(),
    incident.file_name
  );

  return join;
};

const base64Encode = (filePath) => {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, { encoding: "base64" });
  }

  return null;
};

export default IncidentHandler;
