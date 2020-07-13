Welcome to the Ultima Alpha - the very first private test of Ultima. Please bear with us as we fix any issues you find!

What you'll be testing is the very core of Ultima - we plan to add more features which help you build faster but want to nail down the stability of the core first.

We hope you enjoy Ultima as much as we do!

## Feedback

Your feedback is very important to us, please give us your bug reports, feature ideas, thoughts/feelings/emotions however is easiest for you!

We're available on the community slack, twitter, email josh/shad@onultima.com or if you have our imessage/whatsapp feel free to use that too.

## Getting Started

To get started you'll have an onboarding call with Josh, who'll get your account activated and walk you through the steps needed to get a very basic first project live. This document will act as a reference in case you need to revisit anything.

## How Ultima works

Ultima should work how you think it should - if it doesn't, let us know!

Projects you build on Ultima are git repositories. Ultima acts the same as GitHub - the interface should be pretty familiar, with the addition of the deployments and logs tabs in each repository.

Each branch you make creates a separate environment, containing any other components you use (currently just a database). This allows you to keep production stable, branch off, make and preview your changes, then merge back in when you're ready.

When developing using the CLI, an environment is created for you in Ultima, your code live-synced there, and ran in exactly the same environment as it does when you push it live. This allows you to develop knowing that if it works there, it works in production.

You can use Ultima to build both API and Frontend projects, this configuration (and more to come) is stored in a `.ultima.yml` in the root of the project. By default a project is a nodejs API project, with more configuration options coming in subsequent alphas. Check out the template repositories in [](https://build.onultima.com/ultima)[https://build.onultima.com/ultima](https://build.onultima.com/ultima) for examples.

## Current Gotchas

When building an API project there are a set of current limitations you must be aware of:

-   your project must have a package.json and accompanying package-lock.json or yarn.lock
-   you must have an `npm start` script defined in your package.json
-   you must listen on `process.env.PORT`
-   you must have a `GET /health` endpoint which returns a 200 status code

The first two limitations will go away in Alpha 2, until then it might be easier to start (or copy) from one of our templates.

## CLI

The CLI allows you to create, develop, and push projects live. Go to [](https://build.onultima.com/cli)[https://build.onultima.com/cli](https://build.onultima.com/cli) for getting started instructions, and get your unique login token.

Once you're logged in, you have 6 commands:

-   **ultima init** _<project name>_ - creates a new Ultima project, and clones it locally
-   **ultima clone** _<project name>_ - clone an existing Ultima project locally
-   **ultima dev** - starts a development session in the current folder
-   **ultima devexec** <command> [...args]- runs a command on the development session
-   **ultima up** - pushes your local changes up to Ultima
-   **ultima db -** connect to a database

Since Ultima projects are git repositories, you can still use your usual git commands for committing/pushing/branching etc if you prefer.

## Current known limitations (Fixes coming in Alpha 2)

-   The first Ultima alpha is JavaScript only to focus feedback scope, complete language agonoticism is coming in alpha 2.
-   You currently can't view logs for repos you have access to which are owned by organisations or other users.
-   Renaming a repository breaks things... please don't do it for now!
-   The web project creation flow isn't optimised for our templates yet, be sure to choose one from the dropdown!
-   The CLI doesn't let you create blank projects, you must choose from a template.
-   The CLI doesn't let you clone other people's projects
-   Your project must have a package.json and accompanying package-lock.json or yarn.lock
-   You must have an `npm start` script defined in your package.json
