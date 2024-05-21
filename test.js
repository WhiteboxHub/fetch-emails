const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
require('dotenv').config();

const imapConfig = {
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASS,
  host: 'imap.gmail.com',
  port: 993,
  tls: true
};

const imap = new Imap(imapConfig);

function handleError(err) {
  console.error('An error occurred:', err);
  imap.end();
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
