import { Gpio } from 'onoff';
import { clearTimeout } from 'timers';
import * as winston from 'winston';

type Binary = 0 | 1;

function invert(value: Binary) {
  return value ? 0 : 1;
}

const TIMER_DURATION_S = parseInt(process.env.TIMER_DURATION || '60', 10);
const TIMER_DURATION_MS = TIMER_DURATION_S * 1000;

const envPins = [
  ['DOOR_PIN', process.env.DOOR_PIN || '17'],
  ['DOOR_LED_PIN', process.env.DOOR_LED_PIN || '27'],
  ['MOTION_PIN', process.env.MOTION_PIN || '23'],
  ['MOTION_LED_PIN', process.env.MOTION_LED_PIN || '22'],
  ['TIMER_LED_PIN', process.env.TIMER_LED_PIN || '18'],
];

const pins = envPins.map(([pinName, pin]) => {
  const parsed = parseInt(pin, 10);
  if (isNaN(parsed)) {
    throw new Error(
      `Error while parsing ${pinName} value: ${pin}. The value needs to be a proper GPIO number`,
    );
  }
  return parsed;
});

const [
  DOOR_PIN,
  DOOR_LED_PIN,
  MOTION_PIN,
  MOTION_LED_PIN,
  TIMER_LED_PIN,
] = pins;

const gpios = [
  new Gpio(DOOR_PIN, 'in', 'both'),
  new Gpio(MOTION_PIN, 'in', 'both'),
  new Gpio(DOOR_LED_PIN, 'out'),
  new Gpio(MOTION_LED_PIN, 'out'),
  new Gpio(TIMER_LED_PIN, 'out'),
];
const [door, motion, doorLed, motionLed, timerLed] = gpios;

interface IState {
  door: Binary;
  motion: Binary;
  motionTimer: NodeJS.Timer | null;
}

const state: IState = {
  door: 0,
  motion: 0,
  motionTimer: null,
};

door.watch((err, value) => {
  if (err) {
    winston.error('Error while reading door pin:', err);
    return;
  }
  state.door = invert(value);
  winston.info(state.door ? 'Door opened!' : 'Door closed!');
  doorLed.writeSync(state.door);

  if (state.motionTimer) {
    clearTimeout(state.motionTimer);
    state.motionTimer = null;
  }

  if (!state.door) {
    timerLed.writeSync(1);
    state.motionTimer = setTimeout(() => {
      state.motionTimer = null;
      timerLed.writeSync(0);
      winston.info('No presence detected, turning light off');
      // light off
    }, TIMER_DURATION_MS);
  }
});

motion.watch((err, value) => {
  if (err) {
    winston.error('Error while reading motion pin:', err);
    return;
  }
  state.motion = value;
  winston.info(state.motion ? 'Motion appeared!' : 'Motion disappeared!');
  motionLed.writeSync(value);

  if (state.motion && state.motionTimer) {
    winston.info('Presence detected, keeping light on');
    clearTimeout(state.motionTimer);
    state.motionTimer = null;
    timerLed.writeSync(0);
  }
});

process.on('SIGINT', () => {
  for (const gpio of gpios) {
    gpio.unexport();
  }
});
