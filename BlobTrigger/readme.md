# BlobTrigger - JavaScript

The `BlobTrigger` makes it incredibly easy to react to new Blobs inside of Azure Blob Storage. This sample demonstrates a simple use case of processing data from a given Blob using JavaScript.

## How it works

For a `BlobTrigger` to work, you provide a path which dictates where the blobs are located inside your container, and can also help restrict the types of blobs you wish to return. For instance, you can set the path to `samples/{name}.png` to restrict the trigger to only the samples path and only blobs with ".png" at the end of their name.

## Run Example
* Start **Azurite Queue Service** and **Azurite Blob Service**
* **F5** to start debugging
* From a terminal, upload a file to blob storage to start blobTrigger: `az storage blob upload --container-name properties/uploads --connection-string "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;" --file /path_to_your_local_file_to_upload/image.jpg`

## Learn more

This example uses an [Azurite](https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azurite?tabs=visual-studio-code) emulator and the [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli) to upload files to blob storage
<TODO> Documentation