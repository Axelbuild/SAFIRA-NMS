let recoveryRunning = false;
let recoveryAbortRequested = false;

export function getRecoveryRunning() {
  return recoveryRunning;
}

export function setRecoveryRunning(value: boolean) {
  recoveryRunning = value;
}

export function getRecoveryAbortRequested() {
  return recoveryAbortRequested;
}

export function requestRecoveryAbort() {
  recoveryAbortRequested = true;
}

export function resetRecoveryAbort() {
  recoveryAbortRequested = false;
}