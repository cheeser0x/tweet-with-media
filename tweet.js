import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

dotenv.config();

export default async function sendTweet(tweetText, mediaUrl) {
  const client = new TwitterApi({
    appKey: process.env.TWITTERAPIKEY,
    appSecret: process.env.TWITTERAPIKEYSECRET,
    accessToken: process.env.TWITTERACCESSTOKEN,
    accessSecret: process.env.TWITTERACCESSSECRET,
  });

  const rwClient = client.readWrite;

  try {
    let mediaId = null;

    if (mediaUrl) {
      const mediaResponse = await fetch(mediaUrl);
      const arrayBuffer = await mediaResponse.arrayBuffer();
      const mediaBuffer = Buffer.from(arrayBuffer);

      // Check if the buffer is valid
      if (!mediaBuffer || mediaBuffer.length === 0) {
        throw new Error('Fetched media buffer is invalid or empty');
      }

      // Determine the file type of the media
      const mediaType = await fileTypeFromBuffer(mediaBuffer);
      if (!mediaType) {
        throw new Error('Could not determine file type of the media');
      }

      console.log(`Original media type: ${mediaType.mime}`);

      // Ensure the media type is an image before resizing
      if (!mediaType.mime.startsWith('image/')) {
        throw new Error('Media URL does not point to a valid image format');
      }

      // Resize the image using sharp
      const resizedMediaBuffer = await sharp(mediaBuffer)
        .resize(1024, 1024, { fit: 'inside' })
        .toBuffer()
        .catch(err => { throw new Error('Sharp processing failed: ' + err.message); });

      console.log(`Uploading resized media...`);
      mediaId = await rwClient.v1.uploadMedia(resizedMediaBuffer, { mimeType: mediaType.mime });
      console.log(`Resized media uploaded. Media ID: ${mediaId}`);
    }

    // Ensure the format of the tweet data is correct
    const tweetData = {
      text: tweetText,
    };

    // If media is available, add it to the parameters
    if (mediaId) {
      tweetData['media'] = { media_ids: [mediaId] };
    }

    console.log(`Sending tweet...`);
    const tweet = await rwClient.v2.tweet(tweetData);
    console.log('Tweet successfully sent', tweet);
  } catch (error) {
    console.error('Error Sending tweet', error);
  }
}

// Example usage and data remains the same

// const tweetBody = "Here's a random picture of a cat"
// const tweetMedia = "https://www.jesuitroundup.org/wp-content/uploads/2018/01/tabby-cat-names.jpg"
// sendTweet()

// Optional

// You can resize the tweet to your dimensions using resizedMediaBuffer.