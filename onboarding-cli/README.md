## Prerequisites

- Serverless Kibana and ES running
- Linux server that can reach the Kibana and ES over HTTPS
- Some services running on the server and writing logs
- Known integrations logs detection is implemented for:
  - Nginx
  - MySQL
  - PostgreSQL
  - System
- Among those above, only System integration has defined Elastic Agent config, so even though logs can be detected for other integrations, CLI can only generate Elastic Agent config for System.

## How to use the CLI

- Clone the `onboarding-cli` source into your host where you'd want to run the CLI
- Run `npm i && npm run compile` inside the CLI folder
- Run Serverless Kibana and ES and go to "Add Data"
- Copy the provided snippet
- On the host with the CLI paste the snippet and a couple more environment variables to it:
  - `API_HOST` with the Kibana host
  - `ES_HOST` with the ES host
- Run the command and follow the prompts

