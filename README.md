# Sync Google Calendar to your Slack status

This fork runs locally on a cron schedule - but for context on the original version that uses Heroku, IFFT and only Google Calendar, see the [original repo here](https://github.com/bjork24/google-calendar-slack-status)  

## Setup

- `cp .env.example .env` ([see below](#environment-variables) for details on env vars)
- `npm install`
- `brew install brew tap ajrosen/icalPal && brew install icalPal` (sorry, designed for 🍎 only)
- Change the vars in the `.plist` file to match your setup ([see below](#periodic-execution-on-macos) for details)
- Add the `node` executable to the list of Full Disk Access apps in **System Preferences** > **Security & Privacy** > **Privacy**
  - After hours of debugging - this was the only way I could get the script to access `Calendar.sqlitedb`. Please contact me if you have a better solution. 


## Environment Variables

| Variable             | Description                                                                                                  | Default                   |
|----------------------|--------------------------------------------------------------------------------------------------------------|---------------------------|
| `SLACK_TOKEN`        | Your Slack token ([See here for details](#finding-your-slack-token))                                         | put-your-slack-token-here |
| `TZ`                 | The [TZ database name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for your timezone       | Etc/Greenwich             |
| `INCLUDED_CALENDARS` | The comma-seperated list of your calendars you wish to include. Leave blank to include all                   | Calendar                  |
| `AFTER_HOURS_EMOJI`  | An emoji to set your status to after hours                                                                   | 🏡                        |
| `WORK_STARTS_AT`     | The hour after which this will update status from events                                                     | 08:00                     |
| `WORK_ENDS_AT`       | The hour until which this will update status from events                                                     | 17:00                     |


## Finding your SLACK_TOKEN

To find your SLACK_TOKEN, follow these instructions:

1. Create a new Slack bot [here](https://api.slack.com/apps?new_app=1).
2. Once the app has been created, click on the "OAuth & Permissions" link on the sidebar.
3. Scroll down to "User Token Scopes" and set the following permissions:
    * `dnd:write`
    * `users.write`
    * `users.profile:write`
4. Click the "Install App to Workspace" button.
5. Copy the `OAuth Access Token` at the top of the page, and use it as your **SLACK_TOKEN**

## Time Zone

The time zone details are pulled from [the standard env var that Node.js uses](https://nodejs.org/docs/latest/api/cli.html#tz), `TZ`.
[luxon](https://moment.github.io/luxon/) is used for timezone parsing and manipulation.
* `TZ` - The [TZ database name](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for your timezone

## Periodic Execution on macOS

Distributed in this repo is a `.plist` file for running this on macOS using `launchd`.   
[./com.apple-calendar-slack-status.plist](./com.apple-calendar-slack-status.plist)

### Step 1: Create a Property List File

Update the following values in the `com.apple-calendar-slack-status.plist` file:
- `yourusernamehere` - Your macOS username. This so that the script has access to your calendar.
- `/path/to/npm` - The path to your NPM executable
- `/path/to/your/cloned/repo` - The path to the clone of this repository
- `/path/to/logs` - The path to the directory where you want to store the logs (`/tmp` works fine)

### Step 2: Copy the Property List File

Copy the `plist` file to `~/Library/LaunchAgents/`.
```bash
cp com.apple-calendar-slack-status.plist ~/Library/LaunchAgents/
```

### Step 3: Load the `plist` into `launchd`

Use the `launchctl` command to load your script's schedule.
```bash
launchctl load ~/Library/LaunchAgents/com.apple-calendar-slack-status.plist
```
### Step 4: Add Node.js binary to your fukk dusk access programs
Add the `node` executable to the list of Full Disk Access apps in **System Preferences** > **Security & Privacy** > **Privacy**
  - After hours of debugging - this was the only way I could get the script to access `Calendar.sqlitedb`. Please contact me if you have a better solution.

### When you wish to delete this scheduled task

To stop the scheduled task, unload the `plist`.

```bash
launchctl unload ~/Library/LaunchAgents/com.apple-calendar-slack-status.plist
```
