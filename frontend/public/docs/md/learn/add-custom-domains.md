# Attaching personal domains to an Ultima project

Already have a domain? With Ultima, you can choose to deploy on our dynamic hostnames or assign your own; Ultima provides you with a simple mechanism to integrate your codebase with custom domains.

## Attaching a custom domain to a project

Whether you have an existing project or you want to create a new project and attach a domain, the process is simple. 

**Using the Ultima Dashboard**

If you go to your project repository in the Ultima Dashboard,  you can navigate to the ***Environments*** tab and select ***Edit Project Config***.

Within Edit Project Config, the menu allows you to control your environments with a single configuration file. Once you have added the modules you will be using, you can edit the module that you wish to attach the domain to and navigate to the bottom of the drop down. You will find the ***Add Custom Domains*** section. 

First you need to ensure that you have pointed your domain to us. You can do this over on your hosting provider by adding a CNAME to onultima.com or an A record to 78.46.16.197 and an AAAA record to 2a01:4f8:201:206f::2. You can validate your domain using the DNS Debugger in the ***Add Custom Domains*** section.

Perfect, now your domain is ready to be used on Ultima, you can input the branch you wish for the domain to be attached to and the domain name. You can add multiple domains for multiple branches, for example you could seperate your environments as follows:

    master: test.com
    staging: staging.test.com
    development: dev.test.com

Once you have setup the domains you want to attach to the project, scroll to the bottom of the webpage where you can commit the changes to your project config and Ultima will propegate the changes. 

**Using the .ultima.yml Environment configuration file**

Within your project codebase, you must have a ***.ultima.yml*** which is the Environment configuration file for your project. Once you have added the modules you need to your ***.ultima.yml***, you can add the custom domain code in the module stanza. For instance, if you are using the Web Module your configuration might look like:

    web:
    
       type: web
    
       buildLocation: /build

Within the web module, we can add the following configuration items:

    branch-domains:
    
       <your_git_branch>: <your_domain>
    
For example:

     web:
    
       type: web
    
       buildLocation: /build
    
       branch-domains:
    
          master: test.com
    
          staging: test.com
    
          development: dev.test.com

Once you have made the changes you want to make, you can run `ultima up` to push the changes you have made or you can use the native Git commands.

You can view the example architecture diagram for this basic branch domain example [here](../architecture/example-branch-domain-architecture.md)
