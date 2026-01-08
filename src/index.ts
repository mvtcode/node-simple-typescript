import dotenv from 'dotenv';
dotenv.config();
import mqtt from "mqtt";

const MQTT_SERVER = process.env.MQTT_SERVER!;

const clientPub = mqtt.connect(MQTT_SERVER, {
  clientId: "tanmvPub",
  username: process.env.MQTT_USERNAME_PUB,
  password: process.env.MQTT_PASSWORD_PUB,
});

const clientSub = mqtt.connect(MQTT_SERVER, {
  clientId: "tanmvSub",
  username: process.env.MQTT_USERNAME_SUB,
  password: process.env.MQTT_PASSWORD_SUB,
});

clientPub.on("connect", () => {
  console.log("clientPub connected!");
  setInterval(() => {
    clientPub.publish("test/topic", `Hello from FreeMQTT! ${Date.now()}`, {
      qos: 1,
      retain: false,
    });
  }, 1000);
});

clientSub.on("connect", () => {
  console.log("clientSub connected!");
  clientSub.subscribe("test/topic");
  clientSub.on("message", (topic, message) => {
    console.log("clientSub received message", topic, message.toString());
  });
});

/*
OUT:
clientSub connected!
clientPub connected!
clientSub received message test/topic Hello from FreeMQTT! 1767853157178
clientSub received message test/topic Hello from FreeMQTT! 1767853158178
*/