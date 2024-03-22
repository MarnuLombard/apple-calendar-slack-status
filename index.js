require('dotenv').config({path: '/.env'})
const emojiRegex = require('emoji-regex');
const nodeEmoji = require('node-emoji');
const { WebClient } = require('@slack/web-api');
const moment = require('moment');
const { execSync } = require('child_process');

const main = async () => {
  // get Slack token and initialize API
  const token = process.env.SLACK_TOKEN;
  const web = new WebClient(token);
  // special tokens
  const dndToken = '[dnd]';
  const awayToken = '[away]';
  const privateToken = '[p]';
  // log some stuff for dev
  console.log('Starting calendar - slack status sync');
  // grab status and emojis and clean it up
  let output
  try {
    output = execSync('/opt/homebrew/bin/icalbuddy -ea eventsNow').toString();
  } catch (e) {
    console.error(e?.message ?? e);

    process.exit(1);
  }
  if (!output) {
    console.log('No events found');

    return;
  }
  let [title, time] = output.split('\n');

  const name = process.env.FULL_NAME;
  title = title.replace('•', '').replace(`(${ name })`).trim();
  time = time.trim();

  console.log(`Status: ${title}. Time: ${time}`);

  if (title.startsWith('Stay at ')) {
    // ignore hotels
    return;
  }
  let statusEmoji = nodeEmoji.unemojify('🗓');
  const statusHasEmoji = emojiRegex().exec(title);
  if (statusHasEmoji) {
    statusEmoji = nodeEmoji.unemojify(statusHasEmoji[0]);
    console.log(`CUSTOM EMOJI! ${statusEmoji}`);
    title = nodeEmoji.strip(title);
  }
  // parse event start/stop time
  const dateFormat = 'hh:mm';
  const [startDateTime, endDateTime] = time.split(' - ').map(a => a.trim());

  const start = moment(startDateTime, dateFormat);
  const end = moment(endDateTime, dateFormat);

  // do not disturb
  if (title.includes(dndToken)) {
    try {
      await web.dnd.setSnooze({num_minutes: end.diff(start, 'minutes')});
    } catch (e) {
      console.error(e?.message ?? e);
    }
    title = title.replace(dndToken, '').trim();
  }
  // presence and AWAY
  try {
    await web.users.setPresence({presence: title.includes(awayToken) ? 'away' : 'auto'});
  } catch (e) {
    console.error(e?.message ?? e);
  }

  if (title.includes(awayToken)) {
    title = title.replace(awayToken, '').trim();
  }
  // airplane flights
  if (title.startsWith('Flight to')) {
    title = title.replace(/\(.*\)/, '').trim();
    statusEmoji = ':airplane:';
  }
  // private
  if (title.includes(privateToken)) {
    title = 'busy';
  }
  // finally, set the status
  title = `${title} from ${start.format('h:mm')} to ${end.format('h:mm a')} ${process.env.TIME_ZONE}`;
  let profile = JSON.stringify({
    "status_text": title,
    "status_emoji": statusEmoji,
    "status_expiration": end.unix()
  });

  console.log(`profile equals ${profile}`);
  try {
    await web.users.profile.set({profile});

    console.log(`Status set as "${ title }" and will expire at ${ end.format('h:mm a') }`);
  } catch (e) {
    console.error(e?.message ?? e);

    process.exit(1);
  }
};


void main();
