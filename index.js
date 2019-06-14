const express = require('express');
const bodyParser = require('body-parser');
const logger = require('morgan');
const emojiRegex = require('emoji-regex');
const nodeEmoji = require('node-emoji');
const { WebClient } = require('@slack/web-api');
const moment = require('moment');

const app = express();
const port = process.env.PORT || 5000;

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const router = express.Router();

app.post('/', (req, res, next) => {
  // check for secret token
  if (!req.body.token || req.body.token !== process.env.SECRET_TOKEN) {
    console.log('no SECRET_TOKEN');
    next();
    return;
  }
  // store token
  const token = process.env.SLACK_TOKEN;
  const web = new WebClient(token);
  // special tokens
  const dndToken = '[DND]';
  const awayToken = '[AWAY]';
  const privateToken = '[P]';
  // log some stuff for dev
  console.log(req.body);
  // grab status and emojis and clean it up
  let status = req.body.title;
  let statusEmoji = nodeEmoji.unemojify('🗓');
  const statusHasEmoji = emojiRegex().exec(status);
  if (statusHasEmoji) {
    statusEmoji = nodeEmoji.unemojify(statusHasEmoji[0]);
    console.log(`CUSTOM EMOJI! ${statusEmoji}`);
    status = nodeEmoji.strip(status);
  }
  // parse event start/stop time
  const dateFormat = 'MMM D, YYYY [at] hh:mmA';
  const start = moment(req.body.start, dateFormat);
  const end = moment(req.body.end, dateFormat);
  // do not disturb
  if (status.includes(dndToken)) {
    (async () => {
        await web.dnd.setSnooze({ num_minutes: end.diff(start, 'minutes') });
    })();
    status = status.replace(dndToken, '').trim();
  }
  // presence and AWAY
  (async () => {
        await web.users.setPresence({ presence: status.includes(awayToken) ? 'away' : 'auto' });
  })();
  if (status.includes(awayToken)) {
    status = status.replace(awayToken, '').trim();
  }
  // airplane flights
  if (status.startsWith('Flight to')) {
    status = status.replace(/\(.*\)/, '').trim();
    statusEmoji = ':airplane:';
  }
  // private
  if (status.includes(privateToken)) {
    status = 'busy';
  }
  // finally, set the status
  status = `${status} from ${start.format('h:mm')} to ${end.format('h:mm a')} ${process.env.TIME_ZONE}`;
  let profile = JSON.stringify({
    "status_text": status,
    "status_emoji": statusEmoji,
    "status_expiration": end.unix()
  });
  console.log(`profile equals ${profile}`);
  (async () => {
	await web.users.profile.set({ profile }); 
	console.log('Message posted!');
  })();

  console.log(`Status set as "${status}" and will expire at ${end.format('h:mm a')}`);
  res.status(200);
  res.send('🤘');
});

app.get('/', (req, res, next) => {
  // welcome message
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome!</title>
        <style>
          pre {
            background-color: #DDD;
            padding: 1em;
            display: inline-block;
          }
        </style>
      </head>
      <body>
        <h1>Your Heroku server is running!</h1>
        <p>You'll need the following information for your IFTTT recipe:</p>
        <h3>Body</h3>
<pre>{
  "title":"<<<{{Title}}>>>",
  "start":"{{Starts}}",
  "end":"{{Ends}}",
  "token": SECRET_TOKEN"
}</pre>
      </body>
    </html>
  `);
});

app.use((req, res, next) => {
  res.status(404);
  res.send('Not found');
});

app.listen(port);
console.log(`Server running on port ${port}`);
