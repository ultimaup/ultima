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

## **Creating a test project**

 You are now ready to start developing your projects with Ultima. Let's get familiar with Ultima by creating a project named test-project. To do this simply run this in a suitable directory:

```ultima init test-project```

This will present you with a few template options:
 - basic-frontend
 - basic-nodejs-api
 - basic-typescript-api
 - node-api-with-db-template
 - react-frontend

For this example we shall be using the basic-frontend template option. Once selected you can choose wether or not you want the git repository to be either public or private. You can choose either. Once you have selected, the repository will be created and the template files will be initially commited into it as the first commit point. For the **basic-frontend** template, this will consist of 3 files and 1 directory. Those files will be the following:

 - build/index.html - Stores Frontend build code
 - README.md - Default README.md for documenting your project.
 - .ultima.yml - Stores environment configuration

You can now run the following:

``` cd test-project && ultima dev ```

This will create a development environment running the build code and you will be presented with a web url that is running the default code. If you go to that url on a browser you will see that "hello world" is displayed. Now you can open you IDE of choice and navigate to the test-project directory, from here edit the index.html file that is located within the build subdirectory and save it such as:

```<h1>hello world</h1>```      ->  ```<h1>hello ultima</h1>```

If you refresh your browser as soon as you have made the changes you will now see that ultima has picked them up, pushed the changes to the dev environment and the webpage in your browser has been updated to "hello ultima" in the case of the above example.

That's it. Simple, intuitive and pain-free. Once you have made all the changes you want to make and you are ready to go live, you can run:

```ultima up```

This will deploy you current codebase to production and commit your changes to the master branch, you will be presented with a live URL that will be hosting your production instance and you can continue to make more changes in the development environment until you are ready to push again.
