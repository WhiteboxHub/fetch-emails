const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
require('dotenv').config();

const imapConfig = {
  user:process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
};

const smtpConfig = {
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
};

const imap = new Imap(imapConfig);

const transporter = nodemailer.createTransport(smtpConfig);

function handleError(err) {
  console.error('An error occurred:', err);
  imap.end();
}

function sendReply(to, subject, messageId) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: to,
    subject: `Re: ${subject}`,
    text: ' .',
    inReplyTo: messageId,
    references: messageId
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
    } else {
      console.log('Reply sent:', info.response);
    }
  });
}

function onConnect() {
  console.log('Connected to Gmail IMAP server');

  imap.openBox('INBOX', false, (err, box) => {
    if (err) {
      return handleError(err);
    }

    imap.search(['UNSEEN'], (err, results) => {
      if (err) {
        return handleError(err);
      }

      if (results.length === 0) {
        console.log('No unread emails found.');
        imap.end();
        return;
      }

      console.log('Unread email sequence numbers:', results);

      const fetch = imap.fetch(results, { bodies: '' });
      fetch.on('message', (msg, seqno) => {
        console.log('Message #%d', seqno);

        msg.on('body', (stream) => {
          simpleParser(stream, (err, parsed) => {
            if (err) {
              console.error('Error parsing email:', err);
              return;
            }

            console.log('From:', parsed.from.text);
            console.log('Subject:', parsed.subject);
            console.log('Body:', parsed.text);

            sendReply(parsed.from.text, parsed.subject, parsed.messageId);
          });
        });

        msg.once('end', () => {
          console.log('Finished parsing email #%d', seqno);
        });
      });

      fetch.once('error', handleError);
      fetch.once('end', () => {
        console.log('Done fetching unread emails.');
        imap.end();
      });
    });
  });
}

function onDisconnect() {
  console.log('Disconnected from Gmail IMAP server');
}

function connectToGmailViaIMAP() {
  imap.once('ready', onConnect);
  imap.once('end', onDisconnect);
  imap.once('error', handleError);
  imap.connect();
}

connectToGmailViaIMAP();
