export const assertRecord = <T>(record: T | undefined, message: string): T => {
  if (!record) {
    throw new Error(message);
  }

  return record;
};
