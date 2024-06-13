# Uptime checking tool

A simple tool for measuring downtime of a website.
- Periodically checks the website for availability, performing a GET request to the root URL, logging the response time and status code.
- Periodically checks the website using a ping request, logging the response time and packet loss.
- Logs are stored in SQLite database, and may be periodically rotated to keep the database size manageable.
- Provides an API, and a web interface for querying the logs.
- Can send alerts when the website is down, as a POST request to a specified URL.

The tool may be run as a Docker container.

## Checks and alerts

Each check has the following parameters:
- `id`: a unique identifier for the check (auto-generated)
- `type`: (optional) the type of the check; allowed values are `http` or `ping`; default is `http`
- `url`: the URL of the website
- `name`: (optional) a human-readable name for the check; default is the URL
- `intervalMinutes`: (optional) the time between checks, in minutes; default is 1 minute
- `timeoutSeconds`: (optional) the time to wait for a response, in seconds; default is 5 seconds; must be less than `interval`

Each alert has the following parameters:
- `id`: a unique identifier for the alert (auto-generated)
- `variable`: the variable of the  condition for the alert; allowed values are `status`, `responseTime` or `packetLoss`
- `operator`: (optional) the operator of the condition for the alert; allowed values are `==`, `!=`, `>`, `<`, `>=` or `<=`; default is `>=`
- `threshold`: the threshold value for the condition, in seconds for `responseTime` in number `packetLoss`, and in status code for `status`
- `cooldownMinutes`: (optional) the time to wait before sending another alert, in minutes; set to zero to disable cooldown; default is 10 minutes
- `url`: the URL to send the alert to
- `format`: the format of the alert; allowed values are `plain-text`, `json-text` or `json-content`;

Alert in format `json-content` is sent as a POST request with the JSON body:
```json
{
    "content": "... .... ..."
}
```
This format is compatible with [Discord webhook API](https://discord.com/developers/docs/resources/webhook#execute-webhook).

Alert in format `json-text` is a JSON object with body:
```json
{
    "text": "... .... ..."
}
```
This format is compatible with [Slack webhook API](https://api.slack.com/start/quickstart).

Alert in format `plain-text` is sent as a POST request with plain text body containing the appropriate message.

If there is no check for ping, an alert for failed ping check will not be sent. The same applies to the HTTP check. It's up to the user to make sure that the alerts are set up correctly.

## API

Checks and alerts can be managed using the API. The API requires authentication using an API key, which can be generated (and revoked) in the web interface. The API key should be passed in the `X-Api-Key` header. The API key is a long random string, and should be kept secret. In case of a missing or invalid API key, the API will return a 401 Unauthorized response.

In case of a malformed request, e.g. a missing field, invalid field name, or invalid field value, the API will return a 400 Bad Request response. In case of an attempt to access an nonexistent resource such as check or alert, the API will return a 404 Not Found response. In both cases, the response has the following format:

```json
{
    "error": "..."
}
```

### Create a check

To create a check, send a POST request to `/api/checks` with the following JSON body:
```json
{
    "url": "https://example.com",
    "name": "Example",
    "intervalMinutes": 10,
    "timeoutSeconds": 5
}
```

### Create an alert

To create an alert, send a POST request to `/api/alerts` with the following JSON body:
```json
{
    "variable": "status",
    "threshold": 400,
    "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

### Get all checks

To get all checks, send a GET request to `/api/checks`. The response will be a JSON array of checks, in the following format:
```json
[
    {
        "id": 1,
        "type": "http",
        "url": "https://example.com",
        "name": "Example",
        "intervalMinutes": 10,
        "timeoutSeconds": 5
    }
]
```

### Get all alerts

To get all alerts, send a GET request to `/api/alerts`. The response will be a JSON array of alerts, in the following format:
```json
[
    {
        "id": 1,
        "variable": "status",
        "operator": ">=",
        "threshold": 400,
        "cooldownMinutes": 20,
        "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
        "format": "json-content"
    }
]
```

### Get a single check

To get a single check, send a GET request to `/api/checks/{id}`. The response will be a JSON object of the check, in the following format:
```json
{
    "id": 1,
    "type": "http",
    "url": "https://example.com",
    "name": "Example",
    "intervalMinutes": 1,
    "timeout": 5
}
```

### Get a single alert

To get a single alert, send a GET request to `/api/alerts/{id}`. The response will be a JSON object of the alert, in the following format:
```json
{
    "id": 1,
    "variable": "status",
    "operator": ">=",
    "threshold": 400,
    "cooldownMinutes": 20,
    "url": "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    "format": "json-content"
}
```

### Delete a check

To delete a check, send a DELETE request to `/api/checks/{id}`.

### Delete an alert

To delete an alert, send a DELETE request to `/api/alerts/{id}`.

### Get checks logs

To get **checks** logs, send a GET request to `/api/checks-logs`. The response will be a JSON array of logs, in the following format:
```json
[
    {
        "timestamp": 1712745717471,
        "checkId": 2,
        "responseTime": 0.5,
        "packetLoss": 0
    },
    {
        "timestamp": 1712745717465,
        "checkId": 1,
        "responseTime": 0.5,
        "status": 200,
    }
]
```
Checks having `http` type will have `status` and `responseTime` fields. Checks having `ping` type will have `responseTime` and `packetLoss` fields. Field `timestamp` is the Unix timestamp of the log entry, in milliseconds, obtained when the log entry was created (**not** when the request was started).

Allowed query parameters are:
- `from`: filter logs by timestamp greater than or equal to the specified value
- `to`: filter logs by timestamp less than or equal to the specified value
- `checkId`: filter logs by check ID
- `limit`: limit the number of log entries returned, regardless of the timestamps; by default, count is unlimited
- `sort`: sort logs by timestamp in ascending order; allowed values are `asc` or `desc`; default is `desc` (from newest to oldest)

For example, `/api/logs?from=1712745717465&to=1712745717471&checkId=1` will return logs for check with ID 1, having timestamps equal or larger than 1712745717465 and less than 1712745717471.

A recommended way to query logs is to use `limit` and `from` parameters, to get the newest logs, and then use the timestamp of the last log entry to get the next batch of logs, if needed. [This is more efficient than using offset, as the database will not have to scan all the logs to get the next batch](https://developer.wordpress.com/2014/02/14/an-efficient-alternative-to-paging-with-sql-offsets/).

Check logs can be also used to display statistics using e.g. charts

### Get sent alerts logs

To get **sent alerts** logs, send a GET request to `/api/alerts-logs`. The response will be a JSON array of logs, in the following format:
```json
[
    {
        "timestamp": 1712745717465,
        "alertId": 1,
        "checkId": 1,
        "message": "responseTime >= 2 s",
        "responseCode": 200,
    }
]
```

### Get configuration change logs
To get **configuration change logs**, send a GET request to `/api/configuration-change-logs`. The response will be a JSON array of logs, in the following format:
```json
[
    {
        "timestamp": 1712745717465,
        "userEmail": "user@example.com",
        "action": "update",
        "resource": "check",
        "resourceId": 1,
        "payload": "{\"intervalMinutes\": 5}"
    }
]
```

In this example, user with e-mail `user@example.com` changed the interval of the check with id 1 to 5 minutes.

Configuration change logs cannot be deleted or modified, and are kept indefinitely.

## Web interface

The web interface is served at the root URL of the application. It allows the user to manage checks and alerts, view the checks logs and sent alerts, and display statistics as a chart.

The interface has the following pages:
- **Dashboard**: displays the **statistics** of the checks as a chart, with the ability to filter the statistics and configurable time range
- **Manage checks**: allows the user to create, update, and delete checks
- **Manage alerts**: allows the user to create, update, and delete alerts
- **Checks logs**: lists recently performed checks as a table, with the ability to filter the logs, with pagination and configurable time range
- **Alerts logs**: lists recently sent alerts as a table, with pagination and configurable time range
- **Configuration change logs**: lists recently performed configuration changes as a table, with pagination and configurable time range. Displays who made the change, what was changed, and when the change was made
- **API keys**: allows the user to generate and manage API keys for accessing the API

## Implementation

Both backend and frontend of in this variant is implemented using Next.js.

### Cron job

The uptime checker requires periodic requests to the endpoint `/api/run-checks`. Depending on how the service is deployed, we either can use an external cron service to send requests to the endpoint, if available, or use the internal cron implemented using `setInterval` in `instrumentation.ts` file. Cron mode is selected in the environment variables using `CRON_MODE=external` or `CRON_MODE=internal`.

The `instrumentation.ts` file will roughly look like that:
```typescript
export async function register() {
  if (process.env.CRON_MODE === 'internal') {
    setInterval(() => {
      fetch(`http://localhost:${process.env.PORT}/api/cron`);
    }, 60000); // 1 minute, as checks have interval of multiplies of 1 minute
  }
  // ... other code in instrumentation.ts file ...
}
```
