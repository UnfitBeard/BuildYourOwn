using System;
using System.IO;
using System.Text;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using System.Net;


namespace ChatServer
{
    class Downloader
    {
        // Where to download from, and where to save it
        public static string urlToDownload = "https://16bpp.net/";
        public static string filename = "index.html";

        public static string imageurl = "https://16bpp.net/george.png";
        public static string imagename = "george.png";
        public static async Task DownloadWebPage()
        {
            Console.WriteLine("Starting download....");

            try
            {
                // Setup the HTTP Client
                using (HttpClient httpClient = new HttpClient())
                {
                    // Get the webpage asynchronously
                    HttpResponseMessage resp = await httpClient.GetAsync(urlToDownload);

                    // If we get a 200 response then we save it
                    if (resp.IsSuccessStatusCode)
                    {

                        Console.WriteLine("Got it...");
                        // Get the data
                        byte[] data = await resp.Content.ReadAsByteArrayAsync();

                        // Save it to a file
                        FileStream fStream = File.Create(filename);
                        await fStream.WriteAsync(data, 0, data.Length);
                        fStream.Close();

                        Console.WriteLine("Done!");
                    }
                    else
                    {
                        Console.WriteLine("Error : Failed to download");
                    }
                
                 // Get the webpage asynchronously
                HttpResponseMessage imgResp = await httpClient.GetAsync(imageurl);

                // If we get a 200 response then we save it
                if (imgResp.IsSuccessStatusCode)
                {

                    Console.WriteLine("Got the Image...");
                    // Get the data
                    byte[] imgData = await resp.Content.ReadAsByteArrayAsync();

                    // Save it to a file
                    FileStream imgStream = File.Create(imagename);
                    await imgStream.WriteAsync(imgData, 0, imgData.Length);
                    imgStream.Close();

                    Console.WriteLine("Done!");
                }
                else
                {
                    Console.WriteLine("Error : Failed to download");
                }
            }
            }
            catch (System.Exception)
            {
                Console.WriteLine("Error");
                throw;
            }
           
        }

        public static void Main(string[] args)
        {
            Task dlTask = DownloadWebPage();

            Console.WriteLine("Holding for at least 5 seconds...");
            Thread.Sleep(TimeSpan.FromSeconds(5));

            dlTask.GetAwaiter().GetResult();
        }
    }
}