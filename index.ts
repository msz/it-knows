import { Gpio } from 'onoff';
import { clearTimeout } from 'timers';
import TuyaDevice from 'tuyapi';
import * as winston from 'winston';

type Binary = 0 | 1;

function invert(value: Binary) {
  return value ? 0 : 1;
}

const TUYA_ID = process.env.TUYA_ID;
const TUYA_KEY = process.env.TUYA_KEY;

if (!TUYA_ID || !TUYA_KEY) {
  throw new Error('You need to provide Tuya auth info!');
}

const TIMER_DURATION_S = parseInt(process.env.TIMER_DURATION || '300', 10);
const TIMER_DURATION_MS = TIMER_DURATION_S * 1000;

const TIMER_ACTIVATION_DELAY_S = parseInt(
  process.env.TIMER_ACTIVATION_DELAY || '2',
  10,
);
const TIMER_ACTIVATION_DELAY_MS = TIMER_ACTIVATION_DELAY_S * 1000;

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

interface IState {
  door: Binary;
  motion: Binary;
  lastTimerCreation: Date;
  motionTimer: NodeJS.Timer | null;
}

const state: IState = {
  door: 0,
  motion: 0,
  lastTimerCreation: new Date(0),
  motionTimer: null,
};

async function main() {
  const gpios = [
    new Gpio(DOOR_PIN, 'in', 'both'),
    new Gpio(MOTION_PIN, 'in', 'both'),
    new Gpio(DOOR_LED_PIN, 'out'),
    new Gpio(MOTION_LED_PIN, 'out'),
    new Gpio(TIMER_LED_PIN, 'out'),
  ];
  const [door, motion, doorLed, motionLed, timerLed] = gpios;

  const tuya = new TuyaDevice({
    id: TUYA_ID,
    key: TUYA_KEY,
  });

  winston.info('Connecting to Tuya…');
  await tuya.resolveIds();
  winston.info('Tuya IDs resolved!');

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
      timerLed.writeSync(0);
    }

    if (!state.door) {
      timerLed.writeSync(1);
      state.lastTimerCreation = new Date();
      state.motionTimer = setTimeout(() => {
        state.motionTimer = null;
        timerLed.writeSync(0);
        winston.info('No presence detected, turning light off');
        tuya.set({ set: false });
      }, TIMER_DURATION_MS);
    } else {
      winston.info('Door opened, turning light on');
      tuya.set({ set: true });
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
      if (
        new Date().getTime() - state.lastTimerCreation.getTime() <
        TIMER_ACTIVATION_DELAY_MS
      ) {
        winston.info('Motion probably due to door closing, disregarding');
        return;
      }
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
}

main();
