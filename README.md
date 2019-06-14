# Sync Google Calendar to your Slack status

This fork updates the Slack library to a more modern version that supports the JSON API
changes made by Slack in October 2017.  See https://api.slack.com/changelog/2017-10-keeping-up-with-the-jsons
and [node-slack-sdk](https://github.com/slackapi/node-slack-sdk)

For the full tutorial, please check out the Medium post here: [Syncing your Slack status with Google Calendar because nothing is sacred anymore](https://medium.com/@bjork24/syncing-your-slack-status-with-google-calendar-because-nothing-is-sacred-anymore-3032bd171770). Otherwise, click the button below to begin your journey:

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Finding your SLACK_TOKEN

Slack recently changed how users interact with their API. To find your SLACK_TOKEN, follow these instructions:

1. Create a new Slack bot [here](https://api.slack.com/apps?new_app=1).

1. Once the app has been created, click on the "OAuth & Permissions" link on the sidebar

1. Scroll down to "Scopes" and set the following permissions:
    * `dnd:write`
    * `users.write`
    * `users.profile:write`

1. Copy the `OAuth Access Token` at the top of the page, and use it as your **SLACK_TOKEN**

## Time Zone

In addition to setting the Heroku TIME_ZONE variable as suggested by the Medium article, I also set the TZ variable to a supported [tz string](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) so that meeting expiry is calculated correctly by the "moment" time library.

    * `TIME_ZONE` is a human readable string that appears in your Slack status like "EST".
    * `TZ` is what Heroku uses for its app deployment and looks like "America/New_York".
