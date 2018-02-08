import { Gpio } from 'onoff';
import winston from 'winston';

function invert(value: 0 | 1) {
  return value ? 0 : 1;
}

const envPins = {
  DOOR_PIN: process.env.DOOR_PIN || '17',
  DOOR_LED_PIN: process.env.DOOR_LED_PIN || '23',
  MOTION_PIN: process.env.MOTION_PIN || '27',
  MOTION_LED_PIN: process.env.MOTION_LED_PIN || '22',
};

const pins = Object.entries(envPins).map(([pinName, pin]) => {
  const parsed = parseInt(pin, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Error while parsing ${pinName} value: ${pin}. The value needs to be a proper GPIO number`,
    );
  }
  return parsed;
});

const [DOOR_PIN, DOOR_LED_PIN, MOTION_PIN, MOTION_LED_PIN] = pins;

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
