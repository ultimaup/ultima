## ***Getting the Ultima environment up and running***

Getting Ultima up and running is a simple process, using npm to download the base package and allowing the ultima CLI executable to do the heavy lifting. We will cover off the following points in this guide:

 - How to setup the Ultima CLI
 - How to get started with a new development environment
 - Demonstrating live changes
 - How to push your development code into production

## **Prerequisites**

npm - [https://www.npmjs.com/get-npm](https://www.npmjs.com/get-npm)<br />
Node.js - [https://nodejs.org/en/](https://nodejs.org/en/)

## **Getting started**

To get started, simply go to the the ultima dashboard in your browser and login with your GitHub account here:
[https://build.onultima.com/user/login](https://build.onultima.com/user/login)

> Ultima will ask for read-only access to your email address and profile information. You can check out how we handle your personal data over on our privacy policy [https://build.onultima.com/legals/privacy](https://build.onultima.com/legals/privacy)

Once logged in and authorised, you will be redirected to your Ultima dashboard.

> Please note: Ultima is in Alpha and there is currently a waitlist. You will need to be approved before you can access your dashboard. You can message @Josh over on the Ultima [insider community slack](https://build.onultima.com/community) to request earlier access.

You can now select the CLI Login button will present you with a single command that downloads the ultima binary using npm and then uses the Ultima login command to prepare your environment for your user.

```npm i -g @ultimaup/cli && ultima login <user_secret>```

It is easy as that.

