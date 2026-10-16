import type { NextApiHandler } from "next";

const handler = require("../../api/contact.js") as NextApiHandler;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default handler;
