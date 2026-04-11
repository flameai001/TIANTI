/* eslint-disable @typescript-eslint/no-require-imports */
const os = require("node:os");

const fallbackHostname = "FLAME-LAPTOP-2VK8KFKF";

os.hostname = () => fallbackHostname;
