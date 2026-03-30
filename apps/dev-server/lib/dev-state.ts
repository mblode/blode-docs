let version = 0;

export const getDevVersion = () => version;

export const bumpDevVersion = () => {
  version += 1;
  return version;
};
