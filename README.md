# Uptime checking tool

A simple tool for measuring downtime of a website.
- Periodically checks the website for availability, performing a GET request to the root URL, logging the response time and status code.
- Periodically checks the website using a ping request, logging the response time and packet loss.
- Logs are stored in SQLite database, and may be periodically rotated to keep the database size manageable.
- Provides an API, and a web interface for querying the logs.
- Can send alerts when the website is down, as a POST request to a specified URL.

## How to run

### Outside Docker

```
npm install
cp .env.example .env
```

Development mode:
```bash
npm install
npm run dev
```

Production mode:
```bash
npm install
npm run build
npm run start
```

### Docker

The service can be deployed as a Docker container. The Dockerfile is provided in the repository, and the image can be built using the `docker build` command. The image is based on the official Node.js image, and the Next.js app is built using Node.js during the build process.

The database is stored in a SQlite file. When using Docker, it should be mounted as a volume when running the container, to persist the data between container restarts.

## Required configuration

The following environment variables are used in the service:
- `PORT`: the port on which the service listens
- `CRON_MODE`: the mode of the cron job, either `internal` or `external`
- `AUTH_SECRET`: the secret used for user authentication, should be a long random string (e.g. `openssl rand -base64 33`) - note that the secret is a different secret than the one used for API authentication
- `ALLOWED_EMAIL_DOMAINS`: list of comma-separated [e-mail domains for users allowed to access the app](https://authjs.dev/guides/restricting-user-access), e.g. `example.com,example2.com`.
- `ALLOWED_EMAILS`: list of comma-separated [e-mail addresses of users allowed to access the app]((https://authjs.dev/guides/restricting-user-access)), e.g. `user1@example.com,user2@example.com`.
- `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`: the client ID and secret for Google OAuth provider, if Google is used for authentication
- `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`: the client ID and secret for GitHub OAuth provider, if GitHub is used for authentication

If neither `ALLOWED_EMAIL_DOMAINS` nor `ALLOWED_EMAILS` variable is set, any user with access to the website can access all the data and perform all the actions. These variables should be left empty **only** if the service is deployed on a private network not accessible from the outside Internet.

If neither `AUTH_GOOGLE_ID` nor `AUTH_GITHUB_ID` is set, the service will not allow users to log in.

See [Auth.js documentation](https://authjs.dev/getting-started/authentication/oauth) for information on how to set up authentication providers. Also, you can add other authentication providers by following the Auth.js documentation.

The repository contains a default `.env` file, which can be used as a template for the environment variables, but the default file does not contain the authentication variables.

### Cron mode

The uptime checker requires periodic requests every 60 seconds to the endpoint `/api/run-checks`. Depending on how the service is deployed, we either can use an external cron service to send requests to the endpoint, if available, or use the internal cron implemented using `setInterval`. Cron mode is selected in the environment variables using `CRON_MODE=external` or `CRON_MODE=internal`.

The first mode, `external`, can be used when the service is deployed on cloud services, if the environment supports cron jobs performed by sending a GET request to the app. In Google Cloud it's done using Cloud Scheduler. This version supports environments such as Google Cloud Run, where the container can be shut down and started again in the response to the HTTP request. Also, this mode in principle can support environments where there is more than one instance of the service running, and we want to ensure that only one instance is handling the cron job, but because of limitations of SQLite, only one instance of the service can run at a time.

The second mode, `internal`, can be used when the service is deployed on a server that does not support cron jobs, but requires the service to be running continuously.

## Used packages

- [Next.js](https://nextjs.org/) for the web interface and API endpoints
- [`superagent`](https://www.npmjs.com/package/superagent) for submitting HTTP requests
- [`ping`](https://www.npmjs.com/package/ping) for ping checks
- `reactstrap` for styling
- [Auth.js](https://authjs.dev/getting-started) ([next-auth](https://authjs.dev/getting-started/installation?framework=next.js)) for user authentication
- [Drizzle ORM](https://orm.drizzle.team/)
- SQLite database (unfortunately, Drizzle ORM can only be used with the same DBMS on every environment - so we cannot use e.g. SQLite for development and PostgreSQL for production)
- [`better-sqlite3`](https://www.npmjs.com/package/better-sqlite3) for SQLite database access

## Other notes

To get a template of an app using Next.js, Drizzle ORM, and Auth.js, feel free to fork this repository from one of the first commits. The first commits contains the basic structure of the app, with the necessary configuration for the mentioned packages.
