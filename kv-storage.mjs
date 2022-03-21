import { writeFileSync, readFileSync } from "fs";

const BASE_DIR = "kv";

export const set = (key, value) => {
  writeFileSync(BASE_DIR + "/" + key, value);
  return true;
};

export const get = (key) => {
  return readFileSync(BASE_DIR + "/" + key);
};
