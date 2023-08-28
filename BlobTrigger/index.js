'use strict';

require("dotenv").config();
const path = require("path");
const config = require("config");

const { BlobServiceClient, StorageSharedKeyCredential, BlobHTTPHeaders } = require("@azure/storage-blob");
const sharp = require('sharp');
const imagemin = require('imagemin');
const guetzli = require('imagemin-guetzli');

const azuriteHost = "localhost"; // Azurite host
const azuritePort = 10000;       // Azurite port
const accountName = "devstoreaccount1";
const accountKey = "Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==";

const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

const blobServiceClient = new BlobServiceClient(`http://${azuriteHost}:${azuritePort}/${accountName}`, sharedKeyCredential);

const formats = [
    { format: "thumbnail", width: 234 },
    { format: "small", width: 500 },
    { format: "medium", width: 750 },
    { format: "large", width: 1000 },
    { format: "", width: 1200 }
];

async function deleteBlob(containerName, blobName) {
    const containerClient = blobServiceClient.getContainerClient(containerName);
    const blobClient = containerClient.getBlobClient(blobName);

    try {
        await blobClient.delete();
        console.log(`Deleted blob "${blobName}" successfully.`);
    } catch (error) {
        console.error(`Error deleting blob "${blobName}":`, error);
    }
}

async function writeBufferToBlob(containerName, blobName, buffer, originalSize) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const fileInfo = path.parse(blobName);
        const destinationBlobClient = containerClient.getBlockBlobClient(`website-files/${fileInfo.name}${fileInfo.ext}`);
        await destinationBlobClient.uploadData(buffer);
        console.log(`>> ${blobName} compressed from ${originalSize.toFixed(2)} KB to ${(Buffer.byteLength(buffer) / 1024).toFixed(2)} KB`);
    } catch (error) {
        debugger;
    }
  }

async function compress(containerName, blobName) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const sourceBlobClient = containerClient.getBlobClient(`website-files/${blobName}`);
        const file = await sourceBlobClient.downloadToBuffer();

        console.log(`>> running ${blobName} through guetzli...`);
        const transform = await imagemin.buffer(file, {
            plugins: [
                guetzli({ quality: 84 })
            ]
        });

        await writeBufferToBlob(containerName, blobName, transform, Buffer.byteLength(file) / 1024);
    } catch (error) {
        // console.error("Error resizing and writing to the blob:", error);
        // TODO: DELETE image ?
        throw new Error(`Error compressing image: ${error}`);
    }
}

async function resizeAndWriteToBlob(containerName, blobName, format) {
    try {
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const sourceBlobClient = containerClient.getBlobClient(`website-files/${blobName}`);

        const fileInfo = path.parse(blobName);

        const name = format.format.length > 0 ? `${fileInfo.name}-${format.format}${fileInfo.ext}` : `${fileInfo.name}${fileInfo.ext}`;

        const destinationBlobClient = format.format.length > 0 ? containerClient.getBlockBlobClient(`website-files/${fileInfo.name}-${format.format}${fileInfo.ext}`) : containerClient.getBlockBlobClient(`website-files/${fileInfo.name}${fileInfo.ext}`);
        const file = await sourceBlobClient.downloadToBuffer();
        const transform = sharp(file).resize({ width: format.width });

        // TODO: ContentType needs to be set to "image/jpeg"
        // const blobHTTPHeaders = BlobHTTPHeaders();
        // blobHTTPHeaders.blobContentType = "image/jpeg";
        
        const uploadBlobResponse = await destinationBlobClient.uploadStream(transform);
        console.log(`>> '${blobName}' has been resized and uploaded as '${name}' : blobResponse.requestId: ${uploadBlobResponse.requestId} `);
        return name;
    } catch (error) {
        console.error("Error resizing and writing to the blob:", error);
    }
}


async function moveBlob(containerName, oldFolderPath, newFolderPath, blobName) {
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Create blob clients for the source and destination
    const sourceBlobClient = containerClient.getBlobClient(`${oldFolderPath}/${blobName}`);
    const destinationBlobClient = containerClient.getBlobClient(`${newFolderPath}/${blobName}`);

    try {
        // Start the copy operation from the source to the destination
        const copyResponse = await destinationBlobClient.beginCopyFromURL(sourceBlobClient.url);

        // Wait for the copy operation to complete
        await copyResponse.pollUntilDone();

        // Check if the copy operation was successful
        if (copyResponse.operation.state.result.copyStatus === "success") {
            // Delete the source blob (original image)
            await sourceBlobClient.delete();
            console.log(`>> Moved '${blobName}' from ${oldFolderPath} to ${newFolderPath}`);
        } else {
            console.error(`Copy operation failed: ${copyResponse.copyStatus}`);
        }
    } catch (error) {
        console.error(`Error moving blob:`, error);
    }
}

module.exports = async function (context, myBlob) {
    context.log("JavaScript blob trigger function processed blob \n Blob:", context.bindingData.blobTrigger, "\n Blob Size:", myBlob.length, "Bytes");

    const containerName = "properties"
    const blobName = context.bindingData.name;

    console.log(`                                                                           `);
    await moveBlob(containerName, 'uploads', 'website-files', blobName);
    for (const format of formats) {
        let name = await resizeAndWriteToBlob(containerName, blobName, format);
        await compress(containerName, name);
    }
    console.log(`                                                                           `);
};