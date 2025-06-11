using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

var app = WebApplication.Create();
int pageViews = 0;

app.MapGet("/", (HttpContext context) =>
{
    pageViews++;
    string html = $"""
    !DOCTYPE html>
        <html>
        <head><title>ASP.NET Minimal Example</title></head>
        <body>
            <p>Page Views: {pageViews}</p>
            <form method="post" action="/shutdown">
                <input type="submit" value="Shutdown">
            </form>
        </body>
        </html>
    """;

    return Results.Content(html, "text/html");
});

bool running = true;

app.MapPost("/shutdown", (IHostApplicationLifetime lifetime) =>
{
    running = false;
    lifetime.StopApplication();
    return Results.Content("Shutting down...", "text/plain");
});
app.Run("http://localhost:8000");