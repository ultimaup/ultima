using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace dotnet
{
    public class Program
    {
        public static void Main(string[] args)
        {
            Console.WriteLine($"Listening on {Environment.GetEnvironmentVariable("PORT")}");
            CreateHostBuilder(args).Build().Run();
        }

        public static IHostBuilder CreateHostBuilder(string[] args) =>
            Host.CreateDefaultBuilder(args)
                .ConfigureWebHostDefaults(webBuilder =>
                {
                    webBuilder.UseUrls($"http://*:{Environment.GetEnvironmentVariable("PORT")}");
                    webBuilder.UseStartup<Startup>();
                });
    }
}
