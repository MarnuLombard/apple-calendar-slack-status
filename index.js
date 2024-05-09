require('dotenv').config({path: __dirname+'/.env'})

const emojiRegex = require('emoji-regex');
const nodeEmoji = require('node-emoji');
const { WebClient } = require('@slack/web-api');
const { DateTime, Interval } = require('luxon');
const { execSync } = require('child_process');

const log = (message) => {
  console.log(`${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}: ${message}`);
}

const error = (message) => {
  console.error(`${DateTime.now().toFormat('yyyy-MM-dd HH:mm:ss')}: ${message}`);
}

class CalendarSlackStatus {
  constructor({token}) {
    this.web = new WebClient(token);

    this.includedCalendars = process.env.INCLUDED_CALENDARS.split(',');
    this.workStartsAt = process.env.WORK_STARTS_AT;
    this.workEndsAt = process.env.WORK_ENDS_AT;
    this.afterHoursEmoji = process.env.AFTER_HOURS_EMOJI;
    this.timezone = process.env.TZ;
  }

  async main() {
    try {
      await this.checkAuth();
      await this.checkWorkingHours(DateTime.now());

      const event = await this.getCurrentEvent();

      if (!event) {
        log('No events found');

        return;
      }

      const {title, startDateTime, endDateTime, emoji} = this.parseEvent(event);
      await this.setStatus({title, emoji, startDateTime, endDateTime, originalEvent: event});
    } catch (e) {
      error(e?.message ?? e);
      process.exit(1);
    }
  }

  async checkAuth() {
    const auth = await this.web.auth.test({});
    const requiredScopes = ['users.profile:write', 'users:write', 'dnd:write'];
    if (!auth.ok || !auth.user_id) {
      throw new Error('Slack authentication failed');
    }

    log(`Authenticated as ${auth.user}`);

    for (const scope of requiredScopes) {
      if (!auth.response_metadata.scopes.includes(scope)) {
        throw new Error(`Slack token missing required scope: ${scope}`);
      }
    }
  }

  async getCurrentEvent() {
    const calendarData = execSync(
      'icalpal --output=json eventsToday',
      {
        env: {
          ...process.env,
          PATH: `/usr/local/bin:/opt/homebrew/bin:${ process.env.PATH }`,
        }
      }
    ).toString();

    if (!calendarData || !calendarData.length) {
      throw new Error('No event data returned from icalpal');
    }

    const output = JSON.parse(calendarData);

    return output
    .filter(e => !e.all_day)
    .filter(e => {
      const now = DateTime.now();
      const start = this.makeLocalisedTime(e.stime * 1000);
      const end = this.makeLocalisedTime(e.etime * 1000);

      return Interval.fromDateTimes(start, end).contains(now);
    })?.[0];
  }

  parseEvent(event) {
    let title = event.title.trim();
    const startDateTime = this.makeLocalisedTime(event.stime * 1000);
    const endDateTime = this.makeLocalisedTime(event.etime * 1000);

    let statusEmoji = nodeEmoji.unemojify('🗓');
    const statusHasEmoji = emojiRegex().exec(title);

    if (statusHasEmoji) {
      statusEmoji = nodeEmoji.unemojify(statusHasEmoji[0]);
      log(`CUSTOM EMOJI! ${statusEmoji}`);
      title = nodeEmoji.strip(title);
    }

    log(`Status: ${title}. Time: ${startDateTime.toFormat('yyyy-MM-dd HH:mm')}`);

    return {title, startDateTime, endDateTime, emoji: statusEmoji};
  }

  async setStatus({title, emoji, startDateTime, endDateTime, originalEvent}) {
    // ignore hotels
    if (title.startsWith('Stay at ')) {
      log('Ignoring hotel event');
      return;
    }

    // do not disturb
    if (title.includes('[dnd]')) {
      await this.web.dnd.setSnooze({num_minutes: endDateTime.diff(startDateTime, 'minutes')});

      title = title.replace('[dnd]', '').trim();
    }

    // airplane flights
    if (title.startsWith('Flight to')) {
      title = title.replace(/\(.*\)/, '').trim();
      emoji = ':airplane:';
    }

    // private
    if (title.includes('[p]')) {
      title = 'busy';
    }

    if (
      this.includedCalendars.length
      && originalEvent.calendar
      && !this.includedCalendars.includes(originalEvent.calendar)
    ) {
      title = 'busy';
    }

    title = `${title} from ${startDateTime.toFormat('HH:mm')} to ${endDateTime.toFormat('HH:mm a')} ${startDateTime.offsetNameShort}`;

    // presence and after hours
    let isAway = false;

    isAway = isAway || title.includes('[away]');
    await this.web.users.setPresence({presence: isAway ? 'away' : 'auto'});

    if (title.includes('[away]')) {
      title = title.replace('[away]', '').trim();
    }

    await this.sendStatus(title, emoji, isAway, endDateTime)
  }

  async sendStatus(title, emoji, isAway, endDateTime) {
    // finally, set the status
    const profile = {
      status_text: title,
      status_emoji: emoji,
      ...(isAway ? {} : {status_expiration: endDateTime.toUnixInteger()}),
    }

    await this.web.users.profile.set({profile})

    log(`Status set as "${ nodeEmoji.emojify(emoji) } ${ title }"`)

    if (!profile.status_expiration) {
      log(`Status will expire at ${ endDateTime.toFormat('h:mm a') }`)
    }
  }

  async checkWorkingHours() {
    const now = DateTime.now();
    const [startsAtHour, startsAtMinute] = this.workStartsAt.split(':').map(Number);
    const [endsAtHour, endsAtMinute] = this.workEndsAt.split(':').map(Number);

    if (
      now < now.set({hours: startsAtHour, minutes: startsAtMinute})
      || now > now.set({hours: endsAtHour, minutes: endsAtMinute})
      || now.weekday >= 6
    ) {
      let workStartsAt = now.plus({days: 1}).set({hours: startsAtHour, minutes: startsAtMinute});

      while (workStartsAt.weekday >= 6) {
        workStartsAt = workStartsAt.plus({days: 1});
      }

      const emoji = this.afterHoursEmoji;
      const title = `After hours. Starts at ${ workStartsAt.toFormat('yyyy-MM-dd HH:mm') } ${ now.offsetNameShort }`
      const isAway = true;

      await this.sendStatus(title, emoji, isAway, workStartsAt)
    }
  }

  makeLocalisedTime(milliSeconds) {
    return DateTime
    .fromMillis(milliSeconds, {zone: 'UTC'})
    .setZone(this.timezone, {keepLocalTime: true})
  }
}

const token = process.env.SLACK_TOKEN;
log('Starting calendar - slack status sync');
void new CalendarSlackStatus({token}).main();
