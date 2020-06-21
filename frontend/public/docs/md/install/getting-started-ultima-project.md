## ***Getting started with your first Ultima environment***

**Creating a test project**

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
