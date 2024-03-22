# Sync Google Calendar to your Slack status

This fork runs locally on a cron schedule - but for context on the original version that uses Heroku, IFFT and only Google Calendar, see the [original repo here](https://github.com/bjork24/google-calendar-slack-status)  

### Setup

- `cp .env.example .env`
  - Fill in the `.env` file
- `npm install`
- `brew install icalbuddy` (sorry, designed for 🍎 only)


## Finding your SLACK_TOKEN

Slack recently changed how users interact with their API. To find your SLACK_TOKEN, follow these instructions:

1. Create a new Slack bot [here](https://api.slack.com/apps?new_app=1).

1. Once the app has been created, click on the "OAuth & Permissions" link on the sidebar.

1. Scroll down to "User Token Scopes" and set the following permissions:
    * `dnd:write`
    * `users.write`
    * `users.profile:write`

1. Click the "Install App to Workspace" button.
 
1. Copy the `OAuth Access Token` at the top of the page, and use it as your **SLACK_TOKEN**

## Time Zone

In addition to setting the Heroku TIME_ZONE variable as suggested by the Medium article, I also set the TZ variable to a supported [tz string](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) so that meeting expiry is calculated correctly by the "moment" time library.

* `TIME_ZONE` is a human readable string that appears in your Slack status like "EST".
* `TZ` is what Heroku uses for its app deployment and looks like "America/New_York".
