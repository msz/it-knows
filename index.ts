import { Gpio } from 'onoff';
import winston from 'winston';

const DOOR_PIN = 17;
const MOTION_PIN = 23;
const DOOR_LED_PIN = 27;
const MOTION_LED_PIN = 22;

function invert(value: 0 | 1) {
  return value ? 0 : 1;
}

const gpios = [
  new Gpio(DOOR_PIN, 'in', 'both'),
  new Gpio(MOTION_PIN, 'in', 'both'),
  new Gpio(DOOR_LED_PIN, 'out'),
  new Gpio(MOTION_PIN, 'out'),
];
const [door, motion, doorLed, motionLed] = gpios;

door.watch((err, value) => {
  if (err) {
    winston.error('Error while reading door pin:', err);
    return;
  }
  winston.info(value ? 'Door closed!' : 'Door opened!');
  doorLed.writeSync(invert(value));
});

motion.watch((err, value) => {
  if (err) {
    winston.error('Error while reading motion pin:', err);
    return;
  }
  winston.info(value ? 'Motion appeared!' : 'Motion disappeared!');
  doorLed.writeSync(value);
});

process.on('SIGINT', () => {
  for (const gpio of gpios) {
    gpio.unexport();
  }
});
