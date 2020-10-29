export const RESPONSES = {
  GENERIC_500: {
    id: 1,
    message: "SERVER_ERROR",
  },
  INVALID_USERNAME: {
    id: 2,
    message: "INVALID_USERNAME",
  },
  INCORRECT_PASSWORD: {
    id: 3,
    message: "INCORRECT_PASSWORD",
  },
  UNIQUE_CONSTRAINT: {
    id: 4,
    message: "UNIQUE_CONSTRAINT",
  },
  EXPIRED_TOKEN: {
    id: 5,
    message: "EXPIRED_TOKEN",
  },
  INVALID_TOKEN: {
    id: 6,
    message: "INVALID_TOKEN",
  },
  INSUFFICIENT_PRIVILEGES: {
    id: 7,
    message: "INSUFFICIENT_PRIVILEGES",
  },
  MISSING_PARAMETERS: {
    id: 8,
    message: "MISSING_PARAMETERS",
  },
  PUSH_NOTIFICATIONS_ACTIVATED: {
    id: 9,
    message: "PUSH_NOTIFICATIONS_ACTIVATED",
  },
  MISSING_TOKEN: {
    id: 10,
    message: "MISSING_TOKEN",
  },
  GENERIC_400: {
    id: 11,
    message: "BAD_REQUEST",
  },
};

export const ROLES = {
  ADMIN: 1,
  CAREGIVER: 2,
  CONTACT: 3,
};

export const ACCOUNT_TYPES = {
  FITBIT: 1,
  GARMIN: 2,
};

export const MESSAGE_TYPES = {
  PUSH_NOTIFICATION: 1,
  EMAIL: 2,
  TEXT_MESSAGE: 3,
};
