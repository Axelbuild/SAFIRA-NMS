import nodemailer from "nodemailer";
import { SendMailParams } from "./mail.types";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: process.env.MAIL_SECURE === "true",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

export async function sendMail({ subject, text }: SendMailParams) {
  const from = process.env.MAIL_FROM;
  const to = process.env.MAIL_TO;

  if (!from || !to) {
    throw new Error("MAIL_FROM and MAIL_TO must be set");
  }

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
  });
}